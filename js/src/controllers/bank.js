const Joi=require('joi');
const {Op}=require('sequelize');
const {BankConnection:Connection,BankImportBatch:Batch,BankImportItem:Item,Category,Transaction,sequelize}=require('../models');
const {parse,idSchema}=require('../utils/validation/resourceSchemas');
const httpError=require('../utils/httpError');
const adapter=require('../services/bank').getAdapter('manual_import');
const empty=Joi.object({}).unknown(false);
const config={mode:'manual_import',status:'ready_import',source:'Impor pengguna; bukan API BCA',sandbox:{available:false,status:'not_connected',reason:'Client ID dan akses sandbox tim belum terverifikasi'},balance:{amount:null,verified:false,currency:'IDR'}};
const connectionView=r=>({id:r.id,label:r.label,account_masked:'******'+r.account_last4,mode:r.mode,status:r.status});
const owned=async(req,id,transaction)=>{const row=await Connection.findOne({where:{id:parse(idSchema,id),user_id:req.user.id},transaction,...(transaction?{lock:transaction.LOCK.UPDATE}:{})});if(!row)throw httpError(404,'Rekening impor tidak ditemukan');return row;};
exports.status=async(req,res)=>{parse(empty,req.query);res.json({data:{...config,connections:(await Connection.findAll({where:{user_id:req.user.id},order:[['id','ASC']]})).map(connectionView)}});};
exports.create=async(req,res)=>{
 parse(empty,req.query);
 const values=parse(Joi.object({label:Joi.string().trim().min(2).max(80).required(),account_last4:Joi.string().pattern(/^\d{4}$/).required()}).unknown(false),req.body);
 const row=await Connection.create({...values,user_id:req.user.id});res.location('/api/v1/bank/status').status(201).json({data:connectionView(row)});
};
exports.preview=async(req,res)=>{
 parse(empty,req.query);
 const v=parse(Joi.object({connection_id:idSchema,category_id:idSchema,format:Joi.string().valid('csv','json').required(),content:Joi.string().max(60000).required(),is_synthetic:Joi.boolean().strict().required()}).unknown(false),req.body);
 const connection=await owned(req,v.connection_id);
 if(!await Category.findByPk(v.category_id))throw httpError(404,'Kategori tidak ditemukan');
 const {rows}=await adapter.getStatements(v);
 const refs=rows.filter(x=>x.status==='ready').map(x=>x.external_ref);
 const existing=refs.length?await Item.findAll({where:{connection_id:connection.id,external_ref:{[Op.in]:refs}},attributes:['external_ref']}):[];
 const seen=new Set(existing.map(x=>x.external_ref));
 for(const row of rows)if(seen.has(row.external_ref)){row.status='duplicate';row.errors.push('Referensi sudah diimpor pada rekening ini');}
 const batch=await Batch.create({user_id:req.user.id,connection_id:connection.id,category_id:v.category_id,is_synthetic:v.is_synthetic,preview:rows});
 res.status(201).json({data:{batch_id:batch.id,connection:connectionView(connection),is_synthetic:v.is_synthetic,source:'manual_import',rows,can_confirm:!rows.some(x=>x.status==='invalid')&&rows.some(x=>x.status==='ready')}});
};
exports.confirm=async(req,res)=>{
 parse(empty,req.query);parse(empty,req.body||{});
 const id=parse(idSchema,req.params.id);
 const result=await sequelize.transaction(async transaction=>{
  const initial=await Batch.findOne({where:{id,user_id:req.user.id},transaction});if(!initial)throw httpError(404,'Batch tidak ditemukan');
  await owned(req,initial.connection_id,transaction); // serializes imports for this connection
  const batch=await Batch.findOne({where:{id,user_id:req.user.id},transaction,lock:transaction.LOCK.UPDATE});
  if(batch.status==='committed')return {batch_id:id,status:'committed',replayed:true,imported:0};
  const rows=typeof batch.preview==='string'?JSON.parse(batch.preview):batch.preview;
  if(rows.some(x=>x.status==='invalid'))throw httpError(409,'Perbaiki baris error dan buat preview baru');
  if(batch.is_synthetic)throw httpError(409,'Data sintetis hanya untuk preview; tidak dimasukkan ke pembukuan nyata');
  if(!await Category.findByPk(batch.category_id,{transaction}))throw httpError(409,'Kategori sudah tidak tersedia');
  let imported=0,duplicates=0;
  for(const row of rows){
   if(await Item.findOne({where:{connection_id:batch.connection_id,external_ref:row.external_ref},transaction,lock:transaction.LOCK.UPDATE})){duplicates++;continue;}
   const expense=await Transaction.create({id_user:req.user.id,id_category:batch.category_id,type:row.type,nominal:row.amount,catatan:row.description,createdAt:new Date(row.date+'T12:00:00+07:00')},{transaction});
   await Item.create({batch_id:id,connection_id:batch.connection_id,external_ref:row.external_ref,transaction_id:expense.id_transaction},{transaction});imported++;
  }
  await batch.update({status:'committed'},{transaction});return {batch_id:id,status:'committed',imported,duplicates,replayed:false};
 });res.json({data:result});
};
