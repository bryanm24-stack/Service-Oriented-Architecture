const {DataTypes:D}=require('sequelize');
const {sequelize}=require('../databases/connection');
module.exports=sequelize.define('BankConnection',{id:{type:D.INTEGER.UNSIGNED,primaryKey:true,autoIncrement:true}, user_id:{type:D.INTEGER,allowNull:false}, label:{type:D.STRING(80),allowNull:false}, account_last4:{type:D.STRING(4),allowNull:false}, mode:{type:D.STRING(24),allowNull:false,defaultValue:'manual_import'}, status:{type:D.STRING(24),allowNull:false,defaultValue:'ready_import'}},{tableName:'bank_connections',timestamps:true});
