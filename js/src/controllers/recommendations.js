const Joi=require('joi');
const {Op,fn,literal}=require('sequelize');
const {Transaction,RecurringCost,RecurringOccurrence,Wish,InstallmentSchedule}=require('../models');
const {parse}=require('../utils/validation/resourceSchemas');
const {calculate}=require('../services/freeRecommendations');
const money=Joi.string().pattern(/^\d{1,13}(\.\d{1,2})?$/);
const schema=Joi.object({period:Joi.string().pattern(/^20\d{2}-(0[1-9]|1[0-2])$/).default(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7)),income_confirmed:Joi.boolean().default(false),commitments_confirmed:Joi.boolean().default(false),reserve_target:money,goal_target:money,horizon_months:Joi.number().integer().min(1).max(600),risk_profile:Joi.string().valid('low','medium','high')}).unknown(false);
exports.free=async(req,res)=>{
 const inputs=parse(schema,req.query),[year,month]=inputs.period.split('-').map(Number);
 const start=new Date(Date.UTC(year,month-1,1,-7)),end=new Date(Date.UTC(year,month,1,-7));
 const [totals,recurring,installments]=await Promise.all([
 Transaction.findAll({where:{id_user:req.user.id,createdAt:{[Op.gte]:start,[Op.lt]:end}},attributes:[[fn('COALESCE',fn('SUM',literal("CASE WHEN type = 'income' THEN nominal ELSE 0 END")),0),'income'],[fn('COALESCE',fn('SUM',literal("CASE WHEN type = 'expense' THEN nominal ELSE 0 END")),0),'expense']],raw:true}),
 RecurringOccurrence.findAll({where:{status:{[Op.in]:['planned','locked']},transaction_id:null,due_date:{[Op.lt]:`${month===12?year+1:year}-${String(month===12?1:month+1).padStart(2,'0')}-01`}},include:[{model:RecurringCost,as:'recurring_cost',required:true,where:{user_id:req.user.id,status:'active'},attributes:['name']}],attributes:['id_occurrence','amount_snapshot','due_date']}),
 InstallmentSchedule.findAll({where:{status:'planned',transaction_id:null,due_date:{[Op.lt]:`${month===12?year+1:year}-${String(month===12?1:month+1).padStart(2,'0')}-01`}},include:[{model:Wish,as:'wish',required:true,where:{user_id:req.user.id,status:'planned'},attributes:['name']}],attributes:['id_installment','amount_snapshot','due_date']})]);
 const commitments=[...recurring.map(x=>({kind:'recurring',id:x.id_occurrence,name:x.recurring_cost.name,amount:String(x.amount_snapshot),due_date:x.due_date})),...installments.map(x=>({kind:'installment',id:x.id_installment,name:x.wish.name,amount:String(x.amount_snapshot),due_date:x.due_date}))].sort((a,b)=>a.due_date.localeCompare(b.due_date));
 res.set('Cache-Control','no-store, private').json({data:calculate({period:inputs.period,income:String(totals[0]?.income||'0.00'),expense:String(totals[0]?.expense||'0.00'),commitments,inputs})});
};
exports.schema=schema;
