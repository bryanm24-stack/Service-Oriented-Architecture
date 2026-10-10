const { hashPassword } = require('../utils/password');
const { Op, QueryTypes } = require("sequelize");
const { User, sequelize } = require("../models");
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

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    patchUser,
    deleteUser,
    getUserByIdRaw
};
