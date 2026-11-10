const { sequelize } = require('../databases/connection');

const User = require('./User');
const Category = require('./Category');
const Transaction = require('./Transaction');
const Budget = require('./Budget');
const BudgetCategory = require('./Budget_categories');
const ApiClient = require('./api/ApiClient');
const ApiTier = require('./api/ApiTier');
const ApiLog = require('./api/ApiLog');

const AuthSession = require('./AuthSession');
const TokenBundle = require('./TokenBundle');
const TokenPurchase = require('./TokenPurchase');
const Wish = require('./Wish');
const InstallmentSchedule = require('./InstallmentSchedule');

const db = {
  AuthSession,
  TokenBundle,
  TokenPurchase,
  Wish,
  InstallmentSchedule,
  User,
  Category,
  Transaction,
  Budget,
  BudgetCategory,
  Budget_categories: BudgetCategory,
  ApiClient,
  ApiTier,
  ApiLog,
};

// Seluruh model sudah tersedia sebelum relasi dipasang.

User.hasMany(db.Transaction, {
  foreignKey: 'id_user',
  as: 'transactions',
  onDelete: 'RESTRICT',
});

Category.hasMany(db.Transaction, {
  foreignKey: 'id_category',
  as: 'transactions',
  onDelete: 'RESTRICT',
});

Transaction.belongsTo(db.Category, {
  foreignKey: 'id_category',
  as: 'category',
  onDelete: 'RESTRICT',
});

Transaction.belongsTo(db.User, {
  foreignKey: 'id_user',
  as: 'user',
  onDelete: 'RESTRICT',
});

Budget.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'RESTRICT',
});

db.User.hasMany(Budget, {
  foreignKey: 'user_id',
  as: 'budgets',
  onDelete: 'RESTRICT',
});

Budget.belongsToMany(db.Category, {
  through: BudgetCategory,
  foreignKey: 'budget_id',
  otherKey: 'category_id',
  as: 'categories',
  onDelete: 'CASCADE',
});

db.Category.belongsToMany(Budget, {
  through: BudgetCategory,
  foreignKey: 'category_id',
  otherKey: 'budget_id',
  as: 'budgets',
  onDelete: 'RESTRICT',
});

// Model API dari Octavius memakai instance Sequelize dan User yang sama.
User.hasMany(ApiClient, {
  foreignKey: 'user_id',
  as: 'api_clients',
  onDelete: 'RESTRICT',
});
ApiClient.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'RESTRICT',
});
ApiTier.hasMany(ApiClient, {
  foreignKey: 'api_tier_id',
  as: 'api_clients',
  onDelete: 'RESTRICT',
});
ApiClient.belongsTo(ApiTier, {
  foreignKey: 'api_tier_id',
  as: 'api_tier',
  onDelete: 'RESTRICT',
});
ApiClient.hasMany(ApiLog, {
  foreignKey: 'api_client_id',
  as: 'api_logs',
  onDelete: 'RESTRICT',
});
ApiLog.belongsTo(ApiClient, {
  foreignKey: 'api_client_id',
  as: 'api_client',
  onDelete: 'RESTRICT',
});

User.hasMany(Wish, { foreignKey: 'user_id', as: 'wishes', onDelete: 'RESTRICT' });
Wish.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'RESTRICT' });
Wish.hasMany(InstallmentSchedule, { foreignKey: 'wish_id', as: 'installment_schedules', onDelete: 'CASCADE' });
InstallmentSchedule.belongsTo(Wish, { foreignKey: 'wish_id', as: 'wish', onDelete: 'CASCADE' });
InstallmentSchedule.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction', onDelete: 'RESTRICT' });
Wish.belongsTo(Transaction, { foreignKey: 'paid_transaction_id', as: 'paid_transaction', onDelete: 'RESTRICT' });

User.hasMany(AuthSession, { foreignKey: 'user_id', as: 'auth_sessions', onDelete: 'RESTRICT' });
AuthSession.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'RESTRICT' });

User.hasMany(TokenPurchase, { foreignKey: 'user_id', as: 'token_purchases', onDelete: 'RESTRICT' });
TokenPurchase.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'RESTRICT' });
TokenBundle.hasMany(TokenPurchase, { foreignKey: 'token_bundle_id', as: 'purchases', onDelete: 'RESTRICT' });
TokenPurchase.belongsTo(TokenBundle, { foreignKey: 'token_bundle_id', as: 'bundle', onDelete: 'RESTRICT' });
db.sequelize = sequelize;

module.exports = db;
