const { Category, Transaction } = require("../models");
const { parse, idSchema, categoryCreate, categoryPatch } = require("../utils/validation/resourceSchemas");

const createCategory = async (req, res) => {
    const category = await Category.create(parse(categoryCreate, req.body));

    res.location(`/api/v1/categories/${category.id}`).status(201).json({
        msg: "Category berhasil dibuat",
        data: category
    });
};

const getCategories = async (req, res) => {
    res.json({
        data: await Category.findAll({
            order: [["id", "ASC"]]
        })
    });
};

const getCategoryById = async (req, res) => {
    const category = await Category.findByPk(parse(idSchema, req.params.id));

    if (!category) {
        return res.status(404).json({
            msg: "Category tidak ditemukan"
        });
    }

    res.json({
        data: category
    });
};

const updateCategory = async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const value = parse(categoryPatch, req.body);
    const category = await Category.findByPk(id);

    if (!category) {
        return res.status(404).json({
            msg: "Category tidak ditemukan"
        });
    }

    await category.update(value);

    res.json({
        msg: "Category berhasil diperbarui",
        data: category
    });
};

const deleteCategory = async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const category = await Category.findByPk(id);

    if (!category) {
        return res.status(404).json({
            msg: "Category tidak ditemukan"
        });
    }

    if (await Transaction.count({
        where: {
            id_category: id
        }
    })) {
        return res.status(409).json({
            msg: "Category masih memiliki transaksi"
        });
    }

    // FK RESTRICT juga menjaga kondisi balapan dengan transaksi baru.
    await category.destroy();

    res.status(204).send();
};

module.exports = {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};
