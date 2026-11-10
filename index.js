require('dotenv').config();

const express = require('express');
const app = express();
const routes = require('./src/routes');
const { getService } = require('./src/controllers/service');
const { testConnection } = require('./src/databases/connection');
const methodNotAllowed = require('./src/middlewares/methodNotAllowed');

app.disable('x-powered-by');
app.use(require('cookie-parser')());
app.use(
  require('cors')({ origin: process.env.WEB_ORIGIN || 'http://localhost:8000', credentials: true }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('./src/middlewares/logger'));
app.route('/').get(getService).all(methodNotAllowed('GET'));

app.use('/api/v1/auth', require('./src/routes/auth'));
app.use('/api/v1', require('./src/middlewares/auth').verifyJWT);
app.use('/api/v1', routes.transactionRouter);
app.use('/api/v1/users', routes.userRouter);
app.use('/api/v1/categories', routes.categoryRouter);
app.use('/api/v1/budgets', routes.budgetRouter);
app.use('/api/v1', require('./src/routes/tokens'));
app.use('/api/v1/wishes', require('./src/routes/wish'));

app.use(require('./src/middlewares/notFound'));
app.use(require('./src/middlewares/errorHandler'));

if (require.main === module) {
  const port = process.env.PORT || 3001;

  const host = process.env.HOST || '127.0.0.1';
  app.listen(port, host, () => {
    console.log(`Server berjalan di port ${port}`);
    testConnection();
  });
}

module.exports = app;
