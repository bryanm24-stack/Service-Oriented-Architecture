
const { budgetSchema, idBudgetSchema } = require("../utils/validation");
const { validasiJoi, validasiParsial } = require("../utils/validation/validateJoi");

const { Budget, Budget_categories } = require("../models");
const getAllBudgets = async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      include: [
        {
          model: Budget_categories,
          as: "budget_categories",
          through: { attributes: ['allocated_amount'] },
        },
      ],
    });
    res.json({ 
      status: 'success', 
      data: budgets 
    });
  } catch (error) {
        res.status(500).json({ 
      error: "Terjadi kesalahan server", 
      status: 'error', 
      message: error.message 
    });
  }
}

const getBudgetById = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findByPk(id, {
      include: [
        {
          model: Budget_categories,
          as: "budget_categories",
          through: { attributes: ['allocated_amount'] },
        },
      ],
    });
    if (!budget) {
      return res.status(404).json({ 
        error: "Budget tidak ditemukan", 
        status: 'error', 
        message: `Budget dengan ID tersebut tidak ditemukan: ${error.message}` 
      });
    }
    res.json({ 
      status: 'success', 
      data: budget 
    });
  } catch (error) {
        res.status(500).json({ 
      error: "Terjadi kesalahan server", 
      status: 'error', 
      message: error.message 
    });
  }
}
const createBudget = async (req, res) => {
    const { error, value } = validasiJoi(req.body, budgetSchema);
    if (error) {
      return res.status(400).json({ 
        error: "Validasi gagal", 
        status: 'error', 
        message: error.details[0].message 
      });
    }
    const {user_id, month, year, budget_categories} = value;
    const transaction = await Budget.sequelize.transaction();
  try {
    // budget sudah ada?
    const existingBudget = await Budget.findOne({
      where: { user_id, month, year },
      transaction,
    });
    // kalo ada, return 409 conflict
    if (existingBudget) {
      await transaction.rollback();
      return res.status(409).json({ 
        error: "Budget sudah ada", 
        status: 'error', 
        message: `Budget untuk user_id ${user_id}, bulan ${month}, tahun ${year} sudah ada` 
      });
    }
    // budget baru
    const newBudget = await Budget.create({ user_id, month, year }, { transaction });
    const pivotData = budget_categories.map(category => ({
      budget_id: newBudget.budget_id,
      budget_category_id: category.category_id,
      allocated_amount: category.allocated_amount,
    }));
    await Budget_categories.bulkCreate(pivotData, { transaction });
    // commit transaction setelah semua operasi berhasil
    await transaction.commit();

    const createdBudget = await Budget.findByPk(newBudget.budget_id, {
      include: [
        {
          model: Budget_categories,
          as: "budget_categories",
          through: { attributes: ['allocated_amount'] },
        },
      ],
    });
    res.status(201).json({
      status: 'success',
      data: createdBudget,
    });
  } catch (error) {
      res.status(500).json({ 
      error: "Terjadi kesalahan server", 
      status: 'error', 
      message: error.message 
    });
  }
}

// Update Budget (PUT)
const updateBudget = async (req, res) => {
  const { id } = req.params;
  const { error, value } = validasiParsial(req.body, budgetSchema);
  if (error) {
    return res.status(400).json({ 
      error: "Validasi gagal", 
      status: 'error', 
      message: error.details[0].message 
    });
  }

  const {user_id, month, year, budget_categories} = value;
  const transaction = await Budget.sequelize.transaction();
  
  try {
    const budget = await Budget.findByPk(id, {transaction});
    if (!budget) {
      return res.status(404).json({ 
        error: "Budget tidak ditemukan", 
        status: 'error', 
        message: `Budget dengan ID ${id} tidak ditemukan` 
      });
    }

    const existingBudget = await Budget.findOne({
      where: { user_id, month, year,
        id: { [Budget.sequelize.Op.ne]: id }
       },
      transaction,
    });

    if (existingBudget) {
      await transaction.rollback();
      return res.status(409).json({ 
        error: "Budget sudah ada", 
        status: 'error', 
        message: `Budget untuk user_id ${user_id} untuk periode ${month}/${year} sudah ada` 
      });
    }

    await budget.update({ user_id, month, year }, { transaction });

    await Budget_categories.destroy({ where: { budget_id: id }, transaction });
    const pivotData = budget_categories.map(category => ({
      budget_id: id,
      budget_category_id: category.category_id,
      allocated_amount: category.allocated_amount,
    }));
    await Budget_categories.bulkCreate(pivotData, { transaction });

    await transaction.commit();
    const updatedBudget = await Budget.findByPk(id, {
      include: [
        {
          model: Budget_categories,
          as: "budget_categories",
          through: { attributes: ['allocated_amount'] },
        },
      ],
    });
    res.json({
      status: 'success',
      message: `Budget dengan ID ${id} berhasil diperbarui`,
      data: updatedBudget,
    });

  } catch (error) {
      res.status(500).json({ 
      error: "Terjadi kesalahan server", 
      status: 'error', 
      message: error.message 
    });
  }
}
const deleteBudget = async (req, res) => {
    const { error, value } = validasiParsial(req.body, idBudgetSchema);
    if (error) {
      return res.status(400).json({ 
        error: "Parameter ID tidak valid", 
        status: 'error', 
        message: error.details[0].message 
      });
    }

    const { id } = value;
    const transaction = await Budget.sequelize.transaction();

  try {
    const budget = await Budget.findOne({ where: { id }, transaction });
    if (!budget) {
      return res.status(404).json({ 
        error: "Budget tidak ditemukan", 
        status: 'error', 
        message: `Budget dengan ID ${id} tidak ditemukan` 
      });
    }
    await Budget_categories.destroy({ where: { budget_id: id }, transaction });
    await budget.destroy({ transaction });
    await transaction.commit();
    return res.status(200).json({
      status: 'success',
      message: `Budget dengan ID ${id} berhasil dihapus`,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ 
      error: "Terjadi kesalahan server", 
      status: 'error', 
      message: error.message 
    });
  }
}

module.exports = {
  getAllBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget
};
