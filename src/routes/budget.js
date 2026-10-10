const express = require("express");
const router = express.Router();
const methodNotAllowed = require("../middlewares/methodNotAllowed");
const asyncHandler = require("../utils/asyncHandler");

const budgetController = require("../controllers/budget");

const routePrefix = "/api/v1/budgets";
router
  .route(routePrefix)
  .get(asyncHandler(budgetController.getAllBudgets))     // GET    /api/v1/budgets
  .post(asyncHandler(budgetController.createBudget))    // POST   /api/v1/budgets
  .all(methodNotAllowed("GET", "POST"));

router
  .route(`${routePrefix}/:id`)
  .get(asyncHandler(budgetController.getBudgetById))
  .put(asyncHandler(budgetController.updateBudget))
  .patch(asyncHandler(budgetController.updateBudget))
  .delete(asyncHandler(budgetController.deleteBudget))
  .all(methodNotAllowed("GET", "PUT", "PATCH", "DELETE"));

module.exports = router;
