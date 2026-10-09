const express = require('express');
const router = express.Router();
// Pastikan path ke file controllermu benar (tergantung penamaan huruf besar/kecil di foldermu)
const userController = require('../controllers/UserController'); 
const methodNotAllowed = require('../middlewares/methodNotAllowed');

// Routes untuk koleksi (tanpa ID)
router.route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser)
    .all(methodNotAllowed);

// Routes untuk resource spesifik (dengan ID)
router.route('/:id')
    .get(userController.getUserById)
    .put(userController.updateUser)
    .patch(userController.patchUser) // Endpoint PATCH didaftarkan di sini
    .delete(userController.deleteUser)
    .all(methodNotAllowed);

module.exports = router;