const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      // Relasi ini aktif setelah model Transaction milik Dana sudah digabung.
      if (models.Transaction) {
        Category.hasMany(models.Transaction, {
          foreignKey: "categoryId",
          as: "transactions",
        });
      }
    }
  }

  Category.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING(100),
        allowNull: false,

        validate: {
          notEmpty: {
            msg: "Nama category tidak boleh kosong",
          },
          len: {
            args: [1, 100],
            msg: "Nama category maksimal 100 karakter",
          },
        },

        // Getter/Setter requirement
        set(value) {
          this.setDataValue(
            "name",
            String(value).trim().replace(/\s+/g, " ")
          );
        },
      },

      icon: {
        type: DataTypes.STRING(255),
        allowNull: true,

        set(value) {
          if (value === null || value === undefined || value === "") {
            this.setDataValue("icon", null);
            return;
          }

          this.setDataValue("icon", String(value).trim());
        },
      },

      // VIRTUAL: tidak tersimpan di database
      formatted_name: {
        type: DataTypes.VIRTUAL,

        get() {
          const name = this.getDataValue("name");

          if (!name) {
            return null;
          }

          return name
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
        },

        set() {
          throw new Error(
            "formatted_name dihitung otomatis dan tidak dapat diisi"
          );
        },
      },
    },
    {
      sequelize,
      modelName: "Category",
      tableName: "categories",

      timestamps: true,

      defaultScope: {
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
      },
    }
  );

  return Category;
};