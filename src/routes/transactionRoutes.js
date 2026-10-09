const express = require('express');

const router = express.Router();

const {
    createTransaction,
    getTransactionsByCategory,
    getTransactionsORM,
    getTransactionsRaw,
    updateTransaction,
    deleteTransaction
} = require('../controllers/transactionController');

const methodNotAllowed = require('../middleware/methodNotAllowed');


// ======================================================
// GET /api/v1/transactions
// POST /api/v1/transactions
// ======================================================

router.all(
    '/transactions',
    methodNotAllowed(['GET', 'POST'])
);

router.get(
    '/transactions',
    getTransactionsORM
);

router.post(
    '/transactions',
    createTransaction
);


// ======================================================
// GET /api/v1/categories/:id/transactions
// ======================================================

router.all(
    '/categories/:id/transactions',
    methodNotAllowed(['GET'])
);

router.get(
    '/categories/:id/transactions',
    getTransactionsByCategory
);


// ======================================================
// PATCH /api/v1/transactions/:id
// DELETE /api/v1/transactions/:id
// ======================================================

router.all(
    '/transactions/:id',
    methodNotAllowed(['PATCH', 'DELETE'])
);

router.patch(
    '/transactions/:id',
    updateTransaction
);

router.delete(
    '/transactions/:id',
    deleteTransaction
);


module.exports = router;