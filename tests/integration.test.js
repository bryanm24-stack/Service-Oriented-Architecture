// Uji HTTP dengan penyimpanan stub. Tidak membuka atau mengubah database MySQL.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Op } = require("sequelize");
const app = require("../index");
const db = require("../src/models");

test("Users, Categories dan Transactions terhubung melalui HTTP", async () => {
    const originals = [];

    const replace = (object, key, value) => {
        originals.push([object, key, object[key]]);

        object[key] = value;
    };

    const users = new Map();
    const categories = new Map();
    const transactions = new Map();
    let nextUser = 1, nextCategory = 1, nextTransaction = 1;
    let lastRaw, lastOrm;
    const stamp = "2026-10-10T00:00:00.000Z";

    const record = (values, bucket, idKey, soft = false) => {
        const row = {
            ...values,
            createdAt: stamp,
            updatedAt: stamp
        };

        row.toJSON = () => Object.fromEntries(Object.entries(row).filter(([, v]) => typeof v !== "function"));

        row.update = async value => {
            Object.assign(row, value);

            return row;
        };

        row.destroy = async () => {
            if (soft) {
                row.deletedAt = stamp;
            } else {
                bucket.delete(row[idKey]);
            }
        };

        bucket.set(row[idKey], row);

        return row;
    };

    replace(db.User, "findByPk", async id => {
        const row = users.get(Number(id));

        return row && !row.deletedAt ? row : null;
    });

    replace(db.User, "findAll", async () => [...users.values()].filter(u => !u.deletedAt));

    replace(db.User, "create", async value => {
        if ([...users.values()].some(u => u.email === value.email)) {
            const error = new Error("duplicate");

            error.name = "SequelizeUniqueConstraintError";

            throw error;
        }

        return record({
            ...value,
            id: nextUser++
        }, users, "id", true);
    });

    replace(db.Category, "findByPk", async id => categories.get(Number(id)) || null);

    replace(db.Category, "findAll", async () => [...categories.values()]);

    replace(db.Category, "create", async value => record({
        icon: null,
        ...value,
        id: nextCategory++
    }, categories, "id"));

    replace(db.Transaction, "create", async value => record({
        catatan: null,
        ...value,
        nominal: Number(value.nominal).toFixed(2),
        id_transaction: nextTransaction++,
    }, transactions, "id_transaction"));

    replace(db.Transaction, "findByPk", async id => transactions.get(Number(id)) || null);

    replace(db.Transaction, "count", async ({ where }) => [...transactions.values()].filter(t => t.id_category === where.id_category).length);

    const joined = row => ({
        ...row.toJSON(),
        category: categories.get(row.id_category) || null,
        user: users.get(row.id_user)?.deletedAt ? null : users.get(row.id_user) || null,
    });

    replace(db.Transaction, "findAll", async options => {
        lastOrm = options;

        const { where = {}, limit, offset = 0, order } = options;
        let rows = [...transactions.values()].filter(row => {
            if (where.id_category !== undefined && row.id_category !== where.id_category) {
                return false;
            }

            if (where.catatan && !(row.catatan || "").includes(where.catatan[Op.like].slice(1, -1))) {
                return false;
            }

            if (where.nominal?.[Op.gte] !== undefined && Number(row.nominal) < Number(where.nominal[Op.gte])) {
                return false;
            }

            if (where.nominal?.[Op.lte] !== undefined && Number(row.nominal) > Number(where.nominal[Op.lte])) {
                return false;
            }

            return true;
        });

        rows.sort((a,b) => (Number(a.nominal)-Number(b.nominal))*(order[0][1] === "ASC" ? 1 : -1) || a.id_transaction-b.id_transaction);

        return rows.slice(offset, offset + limit).map(joined);
    });

    replace(db.sequelize, "query", async (sql, options) => {
        lastRaw = {
            sql,
            options
        };

        const q = options.replacements;

        return [...transactions.values()].filter(row =>
        (q.categoryId === undefined || row.id_category === q.categoryId) &&
        (q.search === undefined || (row.catatan || "").includes(q.search.slice(1,-1))) &&
        (q.minNominal === undefined || Number(row.nominal) >= Number(q.minNominal)) &&
        (q.maxNominal === undefined || Number(row.nominal) <= Number(q.maxNominal))
        ).sort((a,b)=>(Number(a.nominal)-Number(b.nominal))*(sql.includes("t.nominal DESC")?-1:1) || a.id_transaction-b.id_transaction)
        .slice(q.offset, q.offset+q.limit).map(row => {
            const j = joined(row);

            return {
                ...row.toJSON(),
                category_id: j.category?.id,
                category_name: j.category?.name,
                category_icon: j.category?.icon,
                user_id: j.user?.id,
                user_name: j.user?.name,
                user_email: j.user?.email
            };
        });
    });

    const server = app.listen(0, "127.0.0.1");

    await new Promise(resolve => server.once("listening", resolve));

    const base = `http://127.0.0.1:${server.address().port}`;
    let checked = 0;

    const request = async (method, url, status, body) => {
        const response = await fetch(base+url, {
            method,
            signal: AbortSignal.timeout(3000),
            headers: body ? {
                "Content-Type": "application/json"
            } : {},
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await response.text();

        assert.equal(response.status, status, `${method} ${url}: ${text}`);

        checked++;

        return {
            body: text ? JSON.parse(text) : null,
            headers: response.headers
        };
    };

    try {
        await request("GET", "/", 200);

        await request("POST", "/api/v1/users", 400, {
            name: "A",
            email: "invalid",
            password: "x"
        });

        const user = await request("POST", "/api/v1/users", 201, {
            name: "Test",
            email: "test@example.com",
            password: "Password123!"
        });

        assert.equal(user.headers.get("location"), "/api/v1/users/1");

        assert.equal(user.body.password, undefined);

        await request("POST", "/api/v1/users", 409, {
            name: "Other",
            email: "test@example.com",
            password: "Password123!"
        });

        await request("GET", "/api/v1/users", 200);

        await request("GET", "/api/v1/users/1", 200);

        await request("GET", "/api/v1/users/999", 404);

        await request("PATCH", "/api/v1/users/1", 200, {
            name: "Updated"
        });

        await request("PATCH", "/api/v1/users/1", 400, {});

        await request("PUT", "/api/v1/users/1", 400, {
            name: "Incomplete"
        });

        await request("PUT", "/api/v1/users/1", 200, {
            name: "Test",
            email: "test@example.com",
            password: "Password456!"
        });

        await request("POST", "/api/v1/categories", 400, {
            name: " "
        });

        const cat = await request("POST", "/api/v1/categories", 201, {
            name: "Makanan",
            icon: "food"
        });

        assert.equal(cat.headers.get("location"), "/api/v1/categories/1");

        await request("GET", "/api/v1/categories", 200);

        await request("GET", "/api/v1/categories/1", 200);

        await request("PATCH", "/api/v1/categories/1", 200, {
            icon: "meal"
        });

        await request("POST", "/api/v1/transactions", 400, {
            id_category: 1,
            id_user: 1,
            nominal: -1
        });

        await request("POST", "/api/v1/transactions", 400, {
            id_category: 1,
            id_user: 1,
            nominal: 1.234
        });

        await request("POST", "/api/v1/transactions", 404, {
            id_category: 99,
            id_user: 1,
            nominal: 10
        });

        await request("POST", "/api/v1/transactions", 404, {
            id_category: 1,
            id_user: 99,
            nominal: 10
        });

        const tx = await request("POST", "/api/v1/transactions", 201, {
            id_category: 1,
            id_user: 1,
            nominal: 12500,
            catatan: "Makan siang"
        });

        assert.equal(tx.headers.get("location"), "/api/v1/transactions/1");

        const query = "/api/v1/transactions?search=Makan&sort=desc&limit=10&offset=0&minNominal=10000&maxNominal=20000";
        const orm = await request("GET", query, 200);

        assert.equal(lastOrm.where.nominal[Op.gte], 10000);

        assert.equal(lastOrm.where.nominal[Op.lte], 20000);

        assert.equal(lastOrm.where.catatan[Op.like], "%Makan%");

        assert.equal(lastOrm.include.length, 2);

        const raw = await request("GET", query+"&mode=raw", 200);

        assert.deepEqual(raw.body, orm.body);

        assert(lastRaw.sql.includes("c.id = t.id_category"));

        assert(lastRaw.sql.includes("u.deletedAt IS NULL"));

        assert.equal(lastRaw.options.replacements.search, "%Makan%");

        assert.equal(orm.body.data[0].user.password, undefined);

        await request("GET", "/api/v1/transactions?limit=0", 400);

        await request("GET", "/api/v1/transactions?sort=bad", 400);

        await request("GET", "/api/v1/transactions?minNominal=20&maxNominal=10", 400);

        await request("GET", "/api/v1/categories/1/transactions", 200);

        await request("GET", "/api/v1/categories/999/transactions", 404);

        await request("DELETE", "/api/v1/categories/1", 409);

        await request("PATCH", "/api/v1/transactions/1", 400, {});

        await request("PATCH", "/api/v1/transactions/1", 400, {
            id_user: 2
        });

        await request("PATCH", "/api/v1/transactions/1", 200, {
            catatan: "Diubah"
        });

        await request("PATCH", "/api/v1/transactions/999", 404, {
            nominal: 1
        });

        await request("DELETE", "/api/v1/users/1", 200);

        assert(users.get(1).deletedAt);

        await request("GET", "/api/v1/users/1", 404);

        const softOrm = await request("GET", "/api/v1/transactions", 200);
        const softRaw = await request("GET", "/api/v1/transactions?mode=raw", 200);

        assert.equal(softOrm.body.data[0].user, null);

        assert.deepEqual(softOrm.body, softRaw.body);

        await request("POST", "/api/v1/transactions", 404, {
            id_category: 1,
            id_user: 1,
            nominal: 10
        });

        for (const [method, url, allow] of [
            ["DELETE", "/api/v1/transactions", "GET, POST"],
            ["PUT", "/api/v1/transactions/1", "PATCH, DELETE"],
            ["POST", "/api/v1/categories/1/transactions", "GET"],
            ["DELETE", "/api/v1/users", "GET, POST"],
            ["PUT", "/api/v1/categories/1", "GET, PATCH, DELETE"],
            ["DELETE", "/api/v1/buku", "GET, POST"],
        ]) assert.equal((await request(method, url, 405)).headers.get("allow"), allow);

        await request("DELETE", "/api/v1/transactions/1", 200);

        await request("DELETE", "/api/v1/transactions/1", 404);

        await request("DELETE", "/api/v1/categories/1", 204);

        await request("GET", "/api/v1/categories/1", 404);

        await request("GET", "/missing", 404);

        console.log(`${checked} pemeriksaan HTTP lulus dengan stub database.`);
    } finally {
        await new Promise(resolve => server.close(resolve));

        for (const [object, key, value] of originals.reverse()) object[key] = value;
    }
});

test("Model, relasi, skema SQL dan kontrak validasi konsisten", async () => {
    assert.equal(require("../config/database"), db.sequelize);

    for (const name of ["User", "Category", "Transaction", "Buku", "Karakter"]) {
        assert.equal(db[name].sequelize, db.sequelize);
    }

    assert.equal(db.User.options.paranoid, true);

    assert.equal(db.Transaction.associations.category.target, db.Category);

    assert.equal(db.Transaction.associations.user.target, db.User);

    assert.equal(db.Category.associations.transactions.foreignKey, "id_category");

    assert.equal(db.User.associations.transactions.foreignKey, "id_user");

    await assert.rejects(db.User.build({
        name: "Test",
        email: "bad",
        password: "x"
    }).validate());

    const category = db.Category.build({
        name: "  MAKANAN   HARIAN "
    });

    assert.equal(category.name, "MAKANAN HARIAN");

    assert.equal(category.formatted_name, "Makanan Harian");

    const sql = fs.readFileSync(path.join(__dirname, "../sql/Gabungan.sql"), "utf8");

    assert.equal((sql.match(/CREATE TABLE IF NOT EXISTS/g) || []).length, 6);

    assert.match(sql, /id_category INT UNSIGNED NOT NULL/);

    assert.match(sql, /id_user INT NOT NULL/);

    assert.match(sql, /REFERENCES categories\(id\) ON DELETE RESTRICT/);

    assert.match(sql, /REFERENCES users\(id\) ON DELETE RESTRICT/);

    assert.doesNotMatch(sql, /^\s*(DROP|TRUNCATE|DELETE|REPLACE|UPDATE)\s/im);

    await db.sequelize.close();
});
