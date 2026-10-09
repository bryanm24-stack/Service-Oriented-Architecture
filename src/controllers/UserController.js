const { User } = require('../models');
const { Op } = require('sequelize'); // Wajib di-import
const { sequelize } = require('../databases/connection'); // Wajib import connection

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
        const { name, email, password } = req.body;
        const newUser = await User.create({ name, email, password });
        
        res.setHeader('Location', `/api/v1/users/${newUser.id}`);
        res.status(201).json(newUser);
    } catch (error) {
        // Tangkap aturan bisnis: Email duplikat -> 409
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ message: "Email sudah terdaftar" });
        }
        // Tangkap validasi format/kosong -> 400
        if (error.name === 'SequelizeValidationError') {
             const errors = error.errors.map(e => ({ field: e.path, message: e.message }));
             return res.status(400).json({ message: "Validasi gagal", errors });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

// 4. PUT /api/v1/users/:id (Ubah seluruh atribut)
const updateUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        
        user.name = name;
        user.email = email;
        user.password = password; 
        
        await user.save();
        res.status(200).json(user);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ message: "Email sudah terdaftar" });
        }
        if (error.name === 'SequelizeValidationError') {
             const errors = error.errors.map(e => ({ field: e.path, message: e.message }));
             return res.status(400).json({ message: "Validasi gagal", errors });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

// 5. PATCH /api/v1/users/:id (Ubah sebagian atribut)
const patchUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        
        // Hanya update field yang dikirim di req.body
        const { name, email, password } = req.body;
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (password !== undefined) user.password = password;
        
        await user.save();
        res.status(200).json(user);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ message: "Email sudah terdaftar" });
        }
        if (error.name === 'SequelizeValidationError') {
             const errors = error.errors.map(e => ({ field: e.path, message: e.message }));
             return res.status(400).json({ message: "Validasi gagal", errors });
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
    getUserByIdRaw
};