const test=require('node:test'),assert=require('node:assert/strict');
const {calculate}=require('../src/services/freeRecommendations');
const manual=require('../src/services/bank/manual');
const inputs={income_confirmed:true,commitments_confirmed:true,reserve_target:'100.00',goal_target:'200.00',horizon_months:6,risk_profile:'low'};
const commitment={kind:'recurring',id:1,name:'Internet',amount:'200.00',due_date:'2026-11-25'};
test('Tips: surplus positif, cadangan dan tujuan tidak melebihi surplus',()=>{
 const x=calculate({period:'2026-11',income:'1000.00',expense:'300.00',commitments:[commitment],inputs});
 assert.equal(x.projected_surplus,'500.00');assert.equal(x.data_incomplete,false);assert.equal(x.cards.find(x=>x.kind==='liquidity').amount,'100.00');assert.equal(x.cards.find(x=>x.kind==='goal').amount,'200.00');assert(x.cards.find(x=>x.kind==='education').reason.includes('6 bulan'));assert.equal(x.uses_ai_tokens,false);
});
test('Tips: defisit dan data tidak lengkap tidak menghasilkan alokasi investasi',()=>{
 const x=calculate({period:'2026-11',income:'100.00',expense:'300.00',commitments:[commitment],inputs});assert.equal(x.projected_surplus,'-400.00');assert(!x.cards.some(x=>x.kind==='education'));
 const y=calculate({period:'2026-11',income:'0.00',expense:'0.00',commitments:[],inputs:{}});assert(y.data_incomplete);assert.deepEqual(y.missing_inputs,['income_confirmed','commitments_confirmed']);assert(!y.cards.some(x=>x.kind==='education'));
});
test('Bank: CSV quoted sama dengan JSON; mapping debit/kredit dan presisi',()=>{
 const rows=[{date:'2026-11-22',external_ref:'REF1',direction:'debit',amount:'0.10',description:'Makan, siang'},{date:'2026-11-22',external_ref:'REF2',direction:'credit',amount:'9999999999999.99',description:''}];
 const csv='date,external_ref,direction,amount,description\r\n2026-11-22,REF1,debit,0.10,"Makan, siang"\r\n2026-11-22,REF2,credit,9999999999999.99,';
 const a=manual.parseStatement({format:'json',content:JSON.stringify(rows)});assert.deepEqual(manual.parseStatement({format:'csv',content:csv}),a);assert.equal(a[0].type,'expense');assert.equal(a[1].type,'income');assert.equal(a[1].amount,'9999999999999.99');
});
test('Bank: error baris, kalender, angka negatif, duplikat dan batas input',()=>{
 const row={date:'2026-02-30',external_ref:'REF',direction:'debit',amount:'-1'};assert.equal(manual.parseStatement({format:'json',content:JSON.stringify([row])})[0].status,'invalid');
 const good={...row,date:'2026-11-22',amount:'1.00'};assert.equal(manual.parseStatement({format:'json',content:JSON.stringify([good,good])})[1].status,'invalid');assert.throws(()=>manual.parseStatement({format:'json',content:'[]'}));assert.throws(()=>manual.parseStatement({format:'csv',content:'wrong,header\na,b'}));
});
test('Real HTTP JWT: whitelist, owner, 3 queries, linked transactions excluded, wallet unchanged',async()=>{
 const db=require('../src/models'),jwt=require('jsonwebtoken');process.env.JWT_ACCESS_SECRET='bank-tips-test-secret-'.repeat(3);
 const original=[],replace=(obj,k,fn)=>{original.push([obj,k,obj[k]]);obj[k]=fn;};let calls=0,wallet={available_tokens:'1000',reserved_tokens:'0'};
 replace(db.User,'findByPk',async id=>({id,role:'user'}));replace(db.AuthSession,'findByPk',async id=>({id,user_id:Number(id),expires_at:new Date(Date.now()+60000)}));
 replace(db.Transaction,'findAll',async opts=>{calls++;assert.deepEqual(Object.keys(opts.where).sort(),['createdAt','id_user']);return [{income:opts.where.id_user===1?'1000.00':'0.00',expense:'300.00'}];});
 replace(db.RecurringOccurrence,'findAll',async opts=>{calls++;assert.equal(opts.where.transaction_id,null);assert.equal(opts.include[0].required,true);assert.equal(opts.where.due_date[require('sequelize').Op.lt],'2026-12-01');return opts.include[0].where.user_id===1?[{id_occurrence:1,amount_snapshot:'200.00',due_date:'2026-11-25',recurring_cost:{name:'Internet'}}]:[];});
 replace(db.InstallmentSchedule,'findAll',async opts=>{calls++;assert.equal(opts.where.transaction_id,null);assert(opts.include[0].where.user_id);return [];});
 replace(db.TokenWallet,'update',async()=>{throw Error('Wallet must not be modified');});replace(db.TokenWallet,'findByPk',async()=>structuredClone(wallet));
 const before=await db.TokenWallet.findByPk(1);const axios=require('axios'),adapter=axios.defaults.adapter;axios.defaults.adapter=()=>{throw Error('Paid provider forbidden');};
 const app=require('../index'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api/v1';
 const token=id=>jwt.sign({sid:String(id)},process.env.JWT_ACCESS_SECRET,{subject:String(id),issuer:process.env.JWT_ISSUER||'projectsoa',audience:process.env.JWT_AUDIENCE||'projectsoa-clients',expiresIn:60});
 const get=(path,id)=>fetch(base+path,{headers:id?{Authorization:'Bearer '+token(id)}:{}});
 try {assert.equal((await get('/recommendations/free')).status,401);assert.equal((await get('/recommendations/free?user_id=2',1)).status,400);
 const response=await get('/recommendations/free?period=2026-11&income_confirmed=true&commitments_confirmed=true',1);assert.equal(response.status,200);const x=(await response.json()).data;assert.equal(x.projected_surplus,'500.00');assert.equal(calls,3);
 const other=(await (await get('/recommendations/free?period=2026-11',2)).json()).data;assert.equal(other.income,'0.00');assert.equal(other.commitments.length,0);assert.deepEqual(await db.TokenWallet.findByPk(1),before);assert.deepEqual(wallet,before);assert.equal((await get('/bank/status')).status,401);
 } finally {axios.defaults.adapter=adapter;server.closeAllConnections();await new Promise(r=>server.close(r));for(const [o,k,f]of original.reverse())o[k]=f;await db.sequelize.close();}
});
