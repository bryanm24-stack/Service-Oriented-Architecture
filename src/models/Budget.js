const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Budget extends Model {

    static associate(models) {
      Budget.belongsToMany(models.Budget_categories, {
        foreignKey: "budget_id",
        otherKey: "budget_category_id",
        as: "budget_categories",
      });
    }
  }

  Budget.init(
    {
      budget_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      month: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        validate: {
          min: { args: [1], msg: "Bulan harus antara 1-12" },
          max: { args: [12], msg: "Bulan harus antara 1-12" },
        },
      },
      year: {
        type: DataTypes.INTEGER.UNSIGNED, 
        allowNull: false,
        validate: {
          min: { args: [2000], msg: "Tahun harus >= 2000" },
          max: { args: [2100], msg: "Tahun harus <= 2100" },
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
      modelName: "Budget",
      tableName: "budget", 
      timestamps: true,
      paranoid: false,
      defaultScope: {
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      },
    }
  );

  return Budget;
};
