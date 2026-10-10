const express = require("express");

const router = express.Router();

const methodNotAllowed =
  require("../middlewares/methodNotAllowed");

const asyncHandler =
  require("../utils/asyncHandler");

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/category");


// ============================================================
// /api/v1/categories
// ============================================================

router
  .route("/")
  .get(
    asyncHandler(getCategories)
  )
  .post(
    asyncHandler(createCategory)
  )
  .all(
    methodNotAllowed("GET", "POST")
  );


// ============================================================
// /api/v1/categories/:id
// ============================================================

router
  .route("/:id")
  .get(
    asyncHandler(getCategoryById)
  )
  .patch(
    asyncHandler(updateCategory)
  )
  .delete(
    asyncHandler(deleteCategory)
  )
  .all(
    methodNotAllowed(
      "GET",
      "PATCH",
      "DELETE"
    )
  );
aaa

module.exports = router;