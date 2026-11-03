const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/models');

test('Merge: delapan model berbagi koneksi, tipe FK cocok dan indeks log valid', () => {
    const models = ['User', 'Category', 'Transaction', 'Budget', 'BudgetCategory', 'ApiClient', 'ApiTier', 'ApiLog'];
    for (const modelName of models) {
        assert.equal(db[modelName].sequelize, db.sequelize, modelName);
        for (const index of db[modelName].options.indexes) {
            for (const field of index.fields) {
                const name = typeof field === 'string' ? field : field.name;
                assert(Object.values(db[modelName].rawAttributes).some(attribute => attribute.field === name), `Kolom indeks tidak ada: ${name}`);
            }
        }
    }
    assert.equal(db.ApiClient.rawAttributes.user_id.type.toSql(), db.User.rawAttributes.id.type.toSql());
    assert.equal(db.ApiClient.rawAttributes.api_tier_id.type.toSql(), db.ApiTier.rawAttributes.id.type.toSql());
    assert.equal(db.ApiLog.rawAttributes.api_client_id.type.toSql(), db.ApiClient.rawAttributes.id.type.toSql());
    assert.equal(db.User.associations.api_clients.target, db.ApiClient);
    assert.equal(db.ApiClient.associations.user.target, db.User);
    assert.equal(db.ApiClient.associations.api_tier.target, db.ApiTier);
    assert.equal(db.ApiTier.associations.api_clients.target, db.ApiClient);
    assert.equal(db.ApiClient.associations.api_logs.target, db.ApiLog);
    assert.equal(db.ApiLog.associations.api_client.target, db.ApiClient);
    assert.equal(db.Budget.associations.categories.through.model, db.BudgetCategory);
    assert.equal(db.Category.associations.budgets.through.model, db.BudgetCategory);
    assert.equal(db.ApiLog.getTableName(), 'api_log');
    assert(db.ApiLog.rawAttributes.created_at);
    assert.equal(db.ApiLog.rawAttributes.createdAt, undefined);
    assert.equal(db.ApiLog.rawAttributes.updatedAt, undefined);
});

test('Merge: relasi API client/user/tier/log menghasilkan satu query JOIN', async () => {
    const queries = [];
    const original = db.sequelize.query;
    db.sequelize.query = async sql => { queries.push(sql); return []; };
    try {
        await db.ApiClient.findAll({
            include: [
                { model: db.User, as: 'user', attributes: ['id'] },
                { model: db.ApiTier, as: 'api_tier', attributes: ['name'] },
                { model: db.ApiLog, as: 'api_logs', attributes: ['created_at'] }
            ],
            order: [['id', 'ASC']]
        });
        assert.equal(queries.length, 1);
        assert.match(queries[0], /JOIN `users` AS `user`/);
        assert.match(queries[0], /JOIN `api_tiers` AS `api_tier`/);
        assert.match(queries[0], /JOIN `api_log` AS `api_logs`/);
        assert.match(queries[0], /`api_logs`\.`created_at`/);
    } finally {
        db.sequelize.query = original;
    }
});
