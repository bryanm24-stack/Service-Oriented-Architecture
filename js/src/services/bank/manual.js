const Joi = require('joi');
const { toCents, fromCents } = require('../../utils/money');
const httpError = require('../../utils/httpError');
// Canonical application contract, NOT the native BCA response format.
const rowSchema = Joi.object({
 date: Joi.string().pattern(/^20\d{2}-\d{2}-\d{2}$/).required().custom((v,h)=>new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v?v:h.error('any.invalid')),
 external_ref: Joi.string().trim().min(1).max(100).pattern(/^[A-Za-z0-9._:/-]+$/).required(),
 direction: Joi.string().valid('debit','credit').required(),
 amount: Joi.string().strict().pattern(/^\d{1,13}(\.\d{1,2})?$/).required().custom((v,h)=>toCents(v)>0n?fromCents(toCents(v)):h.error('any.invalid')),
 description: Joi.string().max(500).allow('').default(''),
}).unknown(false);
function csvRows(text) {
 const rows=[]; let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++) {const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted){quoted=false;}else if(cell===''){quoted=true;}else throw httpError(400,'CSV: tanda kutip tidak valid');}
  else if(c===','&&!quoted){row.push(cell);cell='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(quoted)throw httpError(400,'CSV: tanda kutip belum ditutup');
 row.push(cell);if(row.some(x=>x!==''))rows.push(row);
 const header=rows.shift(); const expected=['date','external_ref','direction','amount','description'];
 if(!header||header.join(',')!==expected.join(','))throw httpError(400,'Header CSV wajib: '+expected.join(','));
 return rows.map(cells=>cells.length===header.length?Object.fromEntries(header.map((k,i)=>[k,cells[i]])):{_invalid_columns:true});
}
function parseStatement({format,content}) {
 let rows;
 try {rows=format==='csv'?csvRows(content.replace(/^\uFEFF/,'')):JSON.parse(content);}catch(e){if(e.status)throw e;throw httpError(400,'Berkas bukan CSV/JSON yang valid');}
 if(!Array.isArray(rows)||!rows.length||rows.length>500)throw httpError(400,'Impor harus berisi 1 sampai 500 baris');
 const seen=new Set();
 return rows.map((raw,index)=>{const {value,error}=rowSchema.validate(raw,{abortEarly:false,convert:false});
  const errors=error?error.details.map(d=>d.path.join('.')+': isian tidak valid'):[];
  if(!error&&seen.has(value.external_ref))errors.push('Referensi berulang dalam berkas');
  if(!error)seen.add(value.external_ref);
  return {row_number:index+1,...(!error?value:{}),type:!error?(value.direction==='debit'?'expense':'income'):null,errors,status:errors.length?'invalid':'ready'};
 });
}
const getBalance=async()=>({amount:null,currency:'IDR',verified:false,source:'manual_import',as_of:null});
module.exports={parseStatement,getBalance,csvRows};
