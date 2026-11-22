const {DataTypes:D}=require('sequelize');
const {sequelize}=require('../databases/connection');
module.exports=sequelize.define('BankImportBatch',{id:{type:D.INTEGER.UNSIGNED,primaryKey:true,autoIncrement:true}, user_id:{type:D.INTEGER,allowNull:false}, connection_id:{type:D.INTEGER.UNSIGNED,allowNull:false}, category_id:{type:D.INTEGER.UNSIGNED,allowNull:false}, is_synthetic:{type:D.BOOLEAN,allowNull:false,defaultValue:false}, status:{type:D.STRING(20),allowNull:false,defaultValue:'preview'}, preview:{type:D.JSON,allowNull:false}},{tableName:'bank_import_batches',timestamps:true});
