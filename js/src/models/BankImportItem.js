const {DataTypes:D}=require('sequelize');
const {sequelize}=require('../databases/connection');
module.exports=sequelize.define('BankImportItem',{id:{type:D.INTEGER.UNSIGNED,primaryKey:true,autoIncrement:true}, batch_id:{type:D.INTEGER.UNSIGNED,allowNull:false}, connection_id:{type:D.INTEGER.UNSIGNED,allowNull:false}, external_ref:{type:D.STRING(100),allowNull:false}, transaction_id:{type:D.INTEGER.UNSIGNED,allowNull:false}},{tableName:'bank_import_items',timestamps:true,indexes:[{unique:true,fields:['connection_id','external_ref']}]});
