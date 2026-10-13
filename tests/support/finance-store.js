// Simulasi database untuk tes saja. Tidak pernah dimuat oleh index.js.
const { Op } = require('sequelize');
const { toCents, fromCents } = require('../../src/utils/money');
const db = require('../../src/models');

const installStore = () => {
    let state = { users: [], categories: [], transactions: [], budgets: [], allocations: [], next: {} };
    const originals = [];
    const replace = (object, name, fn) => {
        originals.push([object, name, object[name]]);
        object[name] = fn;
    };
    const error = name => Object.assign(new Error('Simulated database failure'), { name });
    const keyFor = table => ({ budgets: 'budget_id', transactions: 'id_transaction' }[table] || 'id');
    const relation = (table, row, include) => {
        if (!include) return {};
        if (table === 'transactions') return {
            user: state.users.find(x => x.id === row.id_user && !x.deletedAt) || null,
            category: state.categories.find(x => x.id === row.id_category) || null
        };
        if (table === 'budgets') return {
            categories: state.allocations.filter(x => x.budget_id === row.budget_id).map(x => ({
                ...state.categories.find(c => c.id === x.category_id),
                Budget_categories: { allocated_amount: x.allocated_amount }
            }))
        };
        return {};
    };
    const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
        if (value && typeof value === 'object') {
            if (value[Op.in] && !value[Op.in].includes(row[key])) return false;
            if (value[Op.ne] !== undefined && row[key] === value[Op.ne]) return false;
            if (value[Op.gte] !== undefined && Number(row[key]) < Number(value[Op.gte])) return false;
            if (value[Op.lte] !== undefined && Number(row[key]) > Number(value[Op.lte])) return false;
            if (value[Op.like] !== undefined && !String(row[key] || '').includes(value[Op.like].replace(/^%|%$/g, ''))) return false;
            return true;
        }
        return row[key] === value;
    });
    const hydrate = (table, row, options = {}) => {
        if (!row) return null;
        const result = { ...row, ...relation(table, row, options.include) };
        result.toJSON = () => ({ ...row, ...relation(table, row, options.include) });
        result.update = async value => {
            if (table === 'users' && value.email && state.users.some(x => x !== row && x.email === value.email)) throw error('SequelizeUniqueConstraintError');
            Object.assign(row, value);
            if (table === 'transactions') row.nominal = Number(row.nominal).toFixed(2);
            Object.assign(result, row);
            return result;
        };
        result.destroy = async () => {
            if (table === 'users') { row.deletedAt = new Date().toISOString(); return; }
            if (table === 'categories' && (state.transactions.some(x => x.id_category === row.id) || state.allocations.some(x => x.category_id === row.id))) throw error('SequelizeForeignKeyConstraintError');
            state[table] = state[table].filter(x => x !== row);
        };
        return result;
    };
    for (const [model, table] of [[db.User, 'users'], [db.Category, 'categories'], [db.Transaction, 'transactions'], [db.Budget, 'budgets']]) {
        replace(model, 'create', async value => {
            if (table === 'users' && state.users.some(x => x.email === value.email)) throw error('SequelizeUniqueConstraintError');
            const key = keyFor(table);
            const id = state.next[table] = (state.next[table] || 0) + 1;
            const row = { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...value, [key]: id };
            if (table === 'transactions') row.nominal = Number(value.nominal).toFixed(2);
            state[table].push(row);
            return hydrate(table, row);
        });
        replace(model, 'findByPk', async (id, options = {}) => hydrate(table, state[table].find(x => x[keyFor(table)] === Number(id) && !x.deletedAt), options));
        replace(model, 'findOne', async (options = {}) => hydrate(table, state[table].find(x => !x.deletedAt && matches(x, options.where)), options));
        replace(model, 'findAll', async (options = {}) => {
            let rows = state[table].filter(x => !x.deletedAt && matches(x, options.where));
            for (const [key, direction] of [...(options.order || [])].reverse()) {
                rows.sort((a, b) => (key === 'nominal' ? Number(a[key]) - Number(b[key]) : String(a[key]).localeCompare(String(b[key]), 'en', { numeric: true })) * (direction === 'DESC' ? -1 : 1));
            }
            rows = rows.slice(options.offset || 0, options.limit === undefined ? undefined : (options.offset || 0) + options.limit);
            return rows.map(row => hydrate(table, row, options));
        });
        replace(model, 'count', async (options = {}) => state[table].filter(x => !x.deletedAt && matches(x, options.where)).length);
    }
    replace(db.BudgetCategory, 'bulkCreate', async values => {
        for (const value of values) {
            if (state.allocations.some(x => x.budget_id === value.budget_id && x.category_id === value.category_id)) throw error('SequelizeUniqueConstraintError');
            state.allocations.push({ ...value, allocated_amount: Number(value.allocated_amount).toFixed(2) });
        }
    });
    replace(db.BudgetCategory, 'destroy', async options => { state.allocations = state.allocations.filter(x => !matches(x, options.where)); });
    replace(db.sequelize, 'transaction', async callback => {
        const before = structuredClone(state);
        try { return await callback({ LOCK: { UPDATE: 'UPDATE' } }); }
        catch (failure) { state = before; throw failure; }
    });
    replace(db.sequelize, 'query', async (sql, options) => {
        const q = options.replacements;
        if (sql.includes('SUM(nominal)')) {
            const totals = new Map();
            for (const row of state.transactions) {
                const date = new Date(row.createdAt);
                if (row.id_user === q.userId && date.getUTCFullYear() === q.year && date.getUTCMonth() + 1 === q.month) totals.set(row.id_category, (totals.get(row.id_category) || 0n) + toCents(row.nominal));
            }
            return [...totals].map(([id_category, total]) => ({ id_category, spent: fromCents(total) }));
        }
        return state.transactions.filter(row =>
            (q.categoryId === undefined || row.id_category === q.categoryId) &&
            (q.userId === undefined || row.id_user === q.userId) &&
            (q.search === undefined || (row.catatan || '').includes(q.search.slice(1, -1))) &&
            (q.minNominal === undefined || Number(row.nominal) >= Number(q.minNominal)) &&
            (q.maxNominal === undefined || Number(row.nominal) <= Number(q.maxNominal))
        ).sort((a, b) => (Number(a.nominal) - Number(b.nominal)) * (sql.includes('nominal DESC') ? -1 : 1))
            .slice(q.offset, q.offset + q.limit).map(row => {
                const joined = relation('transactions', row, true);
                return { ...row, category_id: joined.category?.id, category_name: joined.category?.name, category_icon: joined.category?.icon, user_id: joined.user?.id, user_name: joined.user?.name, user_email: joined.user?.email };
            });
    });
    return {
        state: () => state,
        restore: () => { for (const [object, name, value] of originals.reverse()) object[name] = value; }
    };
};

module.exports = { installStore };
