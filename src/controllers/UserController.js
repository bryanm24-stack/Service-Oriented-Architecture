const { hashPassword } = require('../utils/password');
const { Op, QueryTypes } = require("sequelize");
const { User, sequelize } = require("../models");
const { requestUpstream } = require('../services/upstream');
const httpError = require('../utils/httpError');
const { parse, idSchema, userCreate, userPatch, userQuery } = require("../utils/validation/resourceSchemas");

const publicUser = user => {
    const data = user.toJSON();

    delete data.password;

    return data;
};

const getAllUsers = async (req, res) => {
    const { search, sort, limit, offset } = parse(userQuery, req.query);
    const where = search ? {
        name: {
            [Op.like]: `%${search}%`
        }
    } : {};
    const users = await User.findAll({
        where,
        order: [[sort, "ASC"]],
        limit,
        offset
    });

    res.json(users.map(publicUser));
};

const getUserById = async (req, res) => {
    const user = await User.findByPk(parse(idSchema, req.params.id));

    if (!user) {
        return res.status(404).json({
            message: "User tidak ditemukan"
        });
    }

    res.json(publicUser(user));
};

const createUser = async (req, res) => {
    const value = parse(userCreate, req.body);

    value.password = await hashPassword(value.password);

    const user = await User.create(value);

    res.location(`/api/v1/users/${user.id}`).status(201).json(publicUser(user));
};

const update = async (req, res, schema) => {
    const id = parse(idSchema, req.params.id);
    const value = parse(schema, req.body);
    const user = await User.findByPk(id);

    if (!user) {
        return res.status(404).json({
            message: "User tidak ditemukan"
        });
    }

    if (value.password !== undefined) {
        value.password = await hashPassword(value.password);
    }

    await user.update(value);

    res.json(publicUser(user));
};

const updateUser = (req, res) => update(req, res, userCreate);

const patchUser = (req, res) => update(req, res, userPatch);

const deleteUser = async (req, res) => {
    const user = await User.findByPk(parse(idSchema, req.params.id));

    if (!user) {
        return res.status(404).json({
            message: "User tidak ditemukan"
        });
    }

    await user.destroy(); // Soft delete; transaksi historis tetap disimpan.
    res.json({
        message: "User berhasil dihapus"
    });
};

const getUserByIdRaw = async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const [user] = await sequelize.query(
        "SELECT id, name, email, createdAt, updatedAt FROM users WHERE id = :id AND deletedAt IS NULL",
        {
            replacements: {
                id
            },
            type: QueryTypes.SELECT
        }
    );

    if (!user) {
        return res.status(404).json({
            message: "User tidak ditemukan"
        });
    }

    res.json(user);
};

const getUserSubscription = async (req, res) => {
    // Validasi input ID menggunakan Joi idSchema
    const id = parse(idSchema, req.params.id);

    // Ambil profil dari database (Syarat: gabungkan data lokal dan API luar)
    const user = await User.findByPk(id);
    if (!user) {
        throw httpError(404, "User tidak ditemukan"); 
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-DUMMY';
    const authString = Buffer.from(serverKey + ':').toString('base64');
    // Ubah baris ini (sementara untuk testing):
const orderId = '5ee64835-fddf-4926-8c28-2e1ed355843f';

    // Panggilan axios diwakilkan oleh layanan requestUpstream milik dosen
    // Otomatis menembak error 502 / 504 sesuai timeout
    const response = await requestUpstream({
        method: 'GET',
        url: `https://api.sandbox.midtrans.com/v2/${orderId}/status`,
        headers: {
            'Authorization': `Basic ${authString}`,
            'Accept': 'application/json'
        }
    });

    // Syarat: null-safe dan tidak meneruskan response mentah apa adanya
    if (!response.data || typeof response.data.transaction_status === 'undefined') {
        throw httpError(502, 'Respons layanan Midtrans tidak valid');
    }

    // Mapping field sesuai kontrak buatanmu
    const hasil = {
        profil_pengguna: {
            id_pengguna: user.id,
            nama: user.name,
            email: user.email
        },
        info_langganan: {
            status_pembayaran: response.data?.transaction_status ?? 'unknown',
            metode_pembayaran: response.data?.payment_type ?? 'belum_ada',
            waktu_transaksi: response.data?.transaction_time ?? null,
            sumber_data: "Midtrans API"
        }
    };

    return res.json({ data: hasil });
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    patchUser,
    deleteUser,
    getUserByIdRaw,
    getUserSubscription
};
