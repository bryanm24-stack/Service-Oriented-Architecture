const { User } = require('../models');
const { Op } = require('sequelize'); // Wajib di-import
const { sequelize } = require('../databases/connection'); // Wajib import connection
const Joi = require('joi'); // Tambahkan import Joi di atas

// Buat aturan Joi berbahasa Indonesia (Taruh di luar fungsi agar bisa dipakai berulang)
const userValidationSchema = Joi.object({   
    name: Joi.string().required().messages({
        'string.empty': 'Field name tidak boleh kosong',
        'any.required': 'Field name wajib diisi'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Field email formatnya tidak valid',
        'string.empty': 'Field email tidak boleh kosong',
        'any.required': 'Field email wajib diisi'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Field password minimal 8 karakter',
        'string.empty': 'Field password tidak boleh kosong',
        'any.required': 'Field password wajib diisi'
    })
});

// 1. GET /api/v1/users (Sudah dilengkapi pagination, limit, offset, dan sort)
const getAllUsers = async (req, res) => {
    try {
        const { limit, offset, sort, search } = req.query;

        // Siapkan kondisi filter jika query search diisi
        const whereCondition = search ? {
            name: {
                [Op.like]: `%${search}%`
            }
        } : {};

        const users = await User.findAll({
            where: whereCondition,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
            order: sort ? [[sort, 'ASC']] : [['id', 'ASC']]
        });

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// 2. GET /api/v1/users/:id
const getUserById = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// 3. POST /api/v1/users
const createUser = async (req, res) => {
    try {
        // 1. Jalankan Joi dengan abortEarly: false sesuai perintah soal
        const { error, value } = userValidationSchema.validate(req.body, { abortEarly: false });
        
        // 2. Jika validasi Joi gagal, kumpulkan errornya dan return 400
        if (error) {
            const errors = error.details.map(err => ({
                field: err.context.key,
                message: err.message
            }));
            return res.status(400).json({ message: "Validasi gagal", errors });
        }

        // 3. Ekstrak data HANYA dari 'value' yang lolos validasi (bukan req.body mentah)
        const { name, email, password } = value;
        
        // 4. Simpan ke database
        const newUser = await User.create({ name, email, password });
        
        res.setHeader('Location', `/api/v1/users/${newUser.id}`);
        res.status(201).json(newUser);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ message: "Email sudah terdaftar" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

// 4. PUT /api/v1/users/:id (Ubah seluruh atribut)
// 4. PUT /api/v1/users/:id (Ubah seluruh atribut)
const updateUser = async (req, res) => {
    try {
        // 1. Validasi Joi dengan abortEarly: false
        const { error, value } = userValidationSchema.validate(req.body, { abortEarly: false });
        
        if (error) {
            const errors = error.details.map(err => ({
                field: err.context.key,
                message: err.message
            }));
            return res.status(400).json({ message: "Validasi gagal", errors });
        }

        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        
        // 2. Ekstrak dari 'value' Joi yang sudah aman
        const { name, email, password } = value;
        
        // 3. Update data
        user.name = name;
        user.email = email;
        user.password = password; 
        
        await user.save();
        res.status(200).json(user);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ message: "Email sudah terdaftar" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

// 5. PATCH /api/v1/users/:id (Ubah sebagian atribut)
// 5. PATCH /api/v1/users/:id (Ubah sebagian atribut)
const patchUser = async (req, res) => {
    try {
        // 1. Validasi menggunakan schema PATCH khusus
        const { error, value } = patchValidationSchema.validate(req.body, { abortEarly: false });
        
        if (error) {
            const errors = error.details.map(err => ({
                // Jika errornya dari .min(1), context.key tidak ada, jadi kita set 'body'
                field: err.context?.key || 'body', 
                message: err.message
            }));
            return res.status(400).json({ message: "Validasi gagal", errors });
        }

        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        
        // 2. Ekstrak data dari 'value' dan update HANYA jika nilainya dikirim
        const { name, email, password } = value;
        
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (password !== undefined) user.password = password;
        
        await user.save();
        res.status(200).json(user);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ message: "Email sudah terdaftar" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

// 6. DELETE /api/v1/users/:id
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        await user.destroy(); 
        res.status(200).json({ message: "User berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

const getUserByIdRaw = async (req, res) => {
    try {
        const [results] = await sequelize.query(
            'SELECT * FROM users WHERE id = :userId AND deletedAt IS NULL',
            {
                replacements: { userId: req.params.id }, // WAJIB ada replacements
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!results) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    patchUser,
    deleteUser,
    getUserByIdRaw,
    userValidationSchema,
};