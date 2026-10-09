const db = require("../models");

const Category = db.Category;

// ============================================================
// POST /api/v1/categories
// ============================================================
const createCategory = async (req, res) => {
  const { name, icon } = req.body;

  if (
    name === undefined ||
    typeof name !== "string" ||
    name.trim() === ""
  ) {
    return res.status(400).json({
      msg: "Nama category wajib diisi",
    });
  }

  try {
    const category = await Category.create({
      name,
      icon,
    });

    // 201 Created + Location Header
    res.set(
      "Location",
      `/api/v1/categories/${category.id}`
    );

    return res.status(201).json({
      msg: "Category berhasil dibuat",
      data: category,
    });
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        msg: err.errors.map((item) => item.message),
      });
    }

    throw err;
  }
};


// ============================================================
// GET /api/v1/categories
// ============================================================
const getCategories = async (req, res) => {
  const categories = await Category.findAll({
    order: [["id", "ASC"]],
  });

  return res.status(200).json({
    data: categories,
  });
};


// ============================================================
// GET /api/v1/categories/:id
// ============================================================
const getCategoryById = async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByPk(id);

  if (!category) {
    return res.status(404).json({
      msg: `Category dengan id ${id} tidak ditemukan`,
    });
  }

  return res.status(200).json({
    data: category,
  });
};


// ============================================================
// PATCH /api/v1/categories/:id
// ============================================================
const updateCategory = async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByPk(id);

  if (!category) {
    return res.status(404).json({
      msg: `Category dengan id ${id} tidak ditemukan`,
    });
  }

  const { name, icon } = req.body;

  // Tidak boleh request kosong
  if (name === undefined && icon === undefined) {
    return res.status(400).json({
      msg: "Minimal kirim field name atau icon",
    });
  }

  // Kalau name dikirim, tidak boleh kosong
  if (
    name !== undefined &&
    (
      typeof name !== "string" ||
      name.trim() === ""
    )
  ) {
    return res.status(400).json({
      msg: "Nama category tidak boleh kosong",
    });
  }

  try {
    if (name !== undefined) {
      category.name = name;
    }

    if (icon !== undefined) {
      category.icon = icon;
    }

    await category.save();

    return res.status(200).json({
      msg: "Category berhasil diperbarui",
      data: category,
    });
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        msg: err.errors.map((item) => item.message),
      });
    }

    throw err;
  }
};


// ============================================================
// DELETE /api/v1/categories/:id
// ============================================================
const deleteCategory = async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByPk(id);

  if (!category) {
    return res.status(404).json({
      msg: `Category dengan id ${id} tidak ditemukan`,
    });
  }

  /*
   * BUSINESS RULE 409
   *
   * Category tidak boleh dihapus apabila masih mempunyai
   * transaction yang terhubung.
   *
   * Model Transaction akan berasal dari bagian Dana.
   */
  if (db.Transaction) {
    const transactionCount = await db.Transaction.count({
      where: {
        categoryId: id,
      },
    });

    if (transactionCount > 0) {
      return res.status(409).json({
        msg:
          "Category tidak dapat dihapus karena masih memiliki transaction",
      });
    }
  }

  await category.destroy();

  return res.status(204).send();
};


module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};