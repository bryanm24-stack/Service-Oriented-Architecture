require('dotenv').config();

const express = require('express');
const app = express();
const routes = require('./src/routes');
const { getService } = require('./src/controllers/service');
const { testConnection } = require('./src/databases/connection');
const methodNotAllowed = require('./src/middlewares/methodNotAllowed');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('./src/middlewares/logger'));
app.route('/').get(getService).all(methodNotAllowed('GET'));

app.use('/api/v1', routes.transactionRouter);
app.use('/api/v1/users', routes.userRouter);
app.use('/api/v1/categories', routes.categoryRouter);
app.use('/api/v1/budgets', routes.budgetRouter);

app.use(require('./src/middlewares/notFound'));
app.use(require('./src/middlewares/errorHandler'));

if (require.main === module) {
    const port = process.env.PORT || 3001;

    app.listen(port, () => {
        console.log(`Server berjalan di port ${port}`);
        testConnection();
    });
}

module.exports = app;
