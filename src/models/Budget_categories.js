const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Budget_categories extends Model {

    static associate(models) {
      Budget_categories.belongsToMany(models.Budget, {
        foreignKey: "budget_category_id",
        otherKey: "budget_id",
        as: "budgets",
      });
    }
  }

  Budget_categories.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      budget_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      category_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      allocated_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: { args: [0], msg: "Allocated amount tidak boleh negatif" },
        },
      },
      keterangan: {
        type: DataTypes.VIRTUAL,
        get() {
          return `Buku ini berjudul ${this.judul}, ditulis ${
            this.penulis
          } dan terbit pada tahun ${this.tahun_terbit}`;
        },
        set() {
          throw new Error("keterangan dihitung otomatis, tidak bisa diisi");
        },
      },
    },
    {
      sequelize,       
      modelName: "Budget_categories",
      tableName: "budget_categories", 
      timestamps: true,
      paranoid: false,
      defaultScope: {
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      },
    }
  );

  return Budget_categories;
};
