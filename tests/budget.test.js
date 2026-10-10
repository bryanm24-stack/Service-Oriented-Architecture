const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const app = require('../index');
const { Budget, BudgetCategory, User, Category, sequelize } = require('../src/models');

test('Budget CRUD, validasi, konflik dan rollback dengan database simulasi', async () => {
    const originals = [];
    const replace = (object, key, value) => { originals.push([object, key, object[key]]); object[key] = value; };
    let budgets = new Map(), allocations = [], nextId = 1, rollbacks = 0;
    let failAllocation = false, forceUnique = false;
    const categories = [{ id: 1, name: 'Makanan' }, { id: 2, name: 'Transportasi' }];
    const joined = row => row ? {
        ...row, categories: allocations.filter(a => a.budget_id === row.budget_id).map(a => ({
            ...categories.find(c => c.id === a.category_id), Budget_categories: { allocated_amount: a.allocated_amount }
        }))
    } : null;
    replace(sequelize, 'transaction', async callback => {
        const before = structuredClone({ budgets, allocations, nextId });
        try { return await callback({ LOCK: { UPDATE: 'UPDATE' } }); }
        catch (error) { ({ budgets, allocations, nextId } = before); rollbacks++; throw error; }
    });
    replace(User, 'findByPk', async id => Number(id) === 1 ? { id: 1, toJSON: () => ({ id: 1, name: 'Tes' }) } : null);
    replace(Category, 'findAll', async options => categories.filter(c => !options?.where?.id || options.where.id[Op.in].includes(c.id)));
    replace(Budget, 'findByPk', async (id, options) => {
        const row = budgets.get(Number(id));
        if (options?.include) return joined(row);
        return row ? { ...row,
            update: async (value, options) => { assert(options.transaction); Object.assign(row, value); },
            destroy: async options => { assert(options.transaction); budgets.delete(row.budget_id); }
        } : null;
    });
    replace(Budget, 'findAll', async options => [...budgets.values()].filter(r => options.where.user_id === undefined || r.user_id === options.where.user_id).map(joined));
    replace(Budget, 'findOne', async ({where}) => [...budgets.values()].find(r => r.user_id === where.user_id && r.month === where.month && r.year === where.year && r.budget_id !== where.budget_id?.[Op.ne]) || null);
    replace(Budget, 'create', async (value, options) => {
        assert(options.transaction);
        if (forceUnique) { const e = new Error('duplicate'); e.name = 'SequelizeUniqueConstraintError'; throw e; }
        const row = { budget_id: nextId++, ...value }; budgets.set(row.budget_id, row); return row;
    });
    replace(BudgetCategory, 'bulkCreate', async (values, options) => {
        assert(options.transaction); assert.equal(options.validate, true);
        if (failAllocation) throw new Error('simulated SQL failure');
        values.forEach(v => { assert.equal(v.budget_category_id, undefined); allocations.push({...v}); });
    });
    replace(BudgetCategory, 'destroy', async ({where, transaction}) => { assert(transaction); allocations = allocations.filter(a => a.budget_id !== where.budget_id); });
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let checked = 0;
    const request = async (method, url, status, body) => {
        const response = await fetch(base + url, { method, headers: {'Content-Type':'application/json'}, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(3000) });
        const text = await response.text(); assert.equal(response.status, status, `${method} ${url}: ${text}`); assert.doesNotMatch(text, /simulated SQL failure/); checked++;
        return { body: text ? JSON.parse(text) : null, headers: response.headers };
    };
    const path = '/api/v1/budgets';
    const body = { user_id:1, month:10, year:2026, budget_categories:[{category_id:1,allocated_amount:'50000.00'},{category_id:2,allocated_amount:20000}] };
    try {
        await request('GET','/',200);
        await request('GET','/api/v1/users/1',200);
        await request('GET','/api/v1/categories',200);
        await request('GET',path,200);
        await request('POST',path,400,{});
        const invalid = await request('POST',path,400,{user_id:0,month:13,year:1900,budget_categories:[]});
        assert(invalid.body.errors.length >= 4);
        assert(invalid.body.errors.every(e => !/must |is not allowed/.test(e.message)));
        for (const value of [
            {...body,extra:1},
            {...body,budget_categories:[{category_id:1,allocated_amount:0}]},
            {...body,budget_categories:[{category_id:1,allocated_amount:'1.234'}]},
            {...body,budget_categories:[{category_id:1,allocated_amount:10},{category_id:'1',allocated_amount:20}]}
        ]) await request('POST',path,400,value);
        await request('POST',path,404,{...body,user_id:999});
        await request('POST',path,404,{...body,budget_categories:[{category_id:999,allocated_amount:10}]});
        assert.equal(budgets.size,0);
        failAllocation=true; await request('POST',path,500,body); failAllocation=false;
        assert.equal(budgets.size,0); assert.equal(allocations.length,0);
        const created=await request('POST',path,201,body);
        assert.equal(created.headers.get('location'),path+'/1');
        assert.equal(created.body.data.categories.length,2);
        assert.equal(created.body.data.categories[0].Budget_categories.allocated_amount,'50000.00');
        await request('POST',path,409,body);
        assert.equal(budgets.size,1);
        assert.equal((await request('GET',path+'?user_id=1',200)).body.data.length,1);
        assert.equal((await request('GET',path+'?user_id=999',200)).body.data.length,0);
        await request('GET',path+'?user_id=bad',400);
        await request('GET',path+'/1',200);
        await request('GET',path+'/999',404);
        await request('GET',path+'/abc',400);
        await request('PUT',path+'/1',400,{month:11});
        await request('PUT',path+'/999',404,body);
        await request('POST',path,201,{...body,month:11});
        await request('PUT',path+'/1',409,{...body,month:11});
        const before=JSON.stringify(joined(budgets.get(1)));
        failAllocation=true; await request('PUT',path+'/1',500,{...body,month:12}); failAllocation=false;
        assert.equal(JSON.stringify(joined(budgets.get(1))),before);
        const updated=await request('PUT',path+'/1',200,{...body,budget_categories:[{category_id:2,allocated_amount:'999.99'}]});
        assert.equal(updated.body.data.categories.length,1); assert.equal(updated.body.data.categories[0].id,2);
        forceUnique=true; await request('POST',path,409,{...body,month:12}); forceUnique=false;
        assert.equal((await request('PATCH',path+'/1',405,{})).headers.get('allow'),'GET, PUT, DELETE');
        assert.equal((await request('DELETE',path,405)).headers.get('allow'),'GET, POST');
        await request('DELETE',path+'/1',204);
        assert(allocations.every(a=>a.budget_id!==1));
        await request('GET',path+'/1',404);
        await request('DELETE',path+'/1',404);
        await request('DELETE',path+'/2',204);
        assert.equal(budgets.size,0); assert.equal(allocations.length,0); assert(rollbacks>=6);
        console.log(`${checked} pemeriksaan HTTP Budget/kompatibilitas lulus dengan database simulasi.`);
    } finally {
        await new Promise(resolve=>server.close(resolve));
        for(const [object,key,value] of originals.reverse()) object[key]=value;
    }
});

test('Relasi N:M dan SQL ORM satu query JOIN (tanpa eksekusi MySQL)', async () => {
    assert.equal(Budget.associations.categories.target,Category);
    assert.equal(Budget.associations.categories.through.model,BudgetCategory);
    assert.equal(Category.associations.budgets.target,Budget);
    assert.equal(Budget.rawAttributes.user_id.type.toSql(),User.rawAttributes.id.type.toSql());
    assert.equal(BudgetCategory.rawAttributes.category_id.type.toSql(),Category.rawAttributes.id.type.toSql());
    const queries=[]; const original=sequelize.query;
    sequelize.query=async sql=>{queries.push(sql);return [];};
    try {
        await Budget.findAll({include:[{model:Category,as:'categories',attributes:['id','name','icon'],through:{attributes:['allocated_amount']},required:false}],order:[['budget_id','ASC']]});
        assert.equal(queries.length,1); assert.match(queries[0],/JOIN.*budget_categories/); assert.match(queries[0],/JOIN.*categories/); assert.match(queries[0],/allocated_amount/);
    } finally {sequelize.query=original;}
});
