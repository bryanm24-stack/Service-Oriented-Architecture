const router = require("express").Router();
const controller = require("../controllers/UserController");
const asyncHandler = require("../utils/asyncHandler");
const methodNotAllowed = require("../middlewares/methodNotAllowed");

router.route("/")
.get(asyncHandler(controller.getAllUsers))
.post(asyncHandler(controller.createUser))
.all(methodNotAllowed("GET", "POST"));

router.route("/:id")
.get(asyncHandler(controller.getUserById))
.put(asyncHandler(controller.updateUser))
.patch(asyncHandler(controller.patchUser))
.delete(asyncHandler(controller.deleteUser))
.all(methodNotAllowed("GET", "PUT", "PATCH", "DELETE"));

module.exports = router;
