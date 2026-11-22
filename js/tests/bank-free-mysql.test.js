const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
test('MySQL bank/tips: migrations, concurrent imports, owner and no double commitment/token charge', {skip:process.env.RUN_MYSQL_TESTS!=='1',timeout:120000},async()=>{
 require('dotenv').config();const mysql=require('mysql2/promise');const name='soa_test_bank_'+crypto.randomBytes(6).toString('hex');
 process.env.DB_NAME=name;process.env.DB_HOST=process.env.TEST_DB_HOST||process.env.DB_HOST||'127.0.0.1';process.env.DB_PORT=process.env.TEST_DB_PORT||process.env.DB_PORT||'3306';process.env.JWT_ACCESS_SECRET=crypto.randomBytes(48).toString('hex');
 const admin=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''});
 let db,server;
 try{
  const migrate=require('../scripts/migrate');await migrate();await migrate();db=require('../src/models');
  const users=await Promise.all([db.User.create({name:'A',email:'bank-a@test.example',password:'unused-test-hash'}),db.User.create({name:'B',email:'bank-b@test.example',password:'unused-test-hash'})]);
  const jwt=require('jsonwebtoken'),tokens=[];for(const u of users){const session=await db.AuthSession.create({id:crypto.randomUUID(),user_id:u.id,token_hash:crypto.randomBytes(32).toString('hex'),expires_at:new Date(Date.now()+60000)});tokens.push(jwt.sign({sid:session.id},process.env.JWT_ACCESS_SECRET,{subject:String(u.id),issuer:process.env.JWT_ISSUER||'projectsoa',audience:process.env.JWT_AUDIENCE||'projectsoa-clients',expiresIn:60}));}
  const category=await db.Category.findOne();server=require('../index').listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api/v1';
  const req=async(method,path,body,user=0)=>{const response=await fetch(base+path,{method,headers:{Authorization:'Bearer '+tokens[user],'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
  const connection=(await req('POST','/bank/connections',{label:'SQL fixture',account_last4:'1234'})).body.data;
  const rows=[{date:'2026-11-01',external_ref:'SQL-REF-1',direction:'credit',amount:'1000.00',description:'Fixture'}];
  const payload={connection_id:connection.id,category_id:category.id,format:'json',content:JSON.stringify(rows),is_synthetic:false};
  assert.equal((await req('POST','/bank/imports/preview',payload,1)).status,404);
  const batches=await Promise.all([req('POST','/bank/imports/preview',payload),req('POST','/bank/imports/preview',payload)]);
  const results=await Promise.all(batches.map(x=>req('POST','/bank/imports/'+x.body.data.batch_id+'/confirm',{})));
  assert(results.every(x=>x.status===200));assert.equal(results.reduce((s,x)=>s+x.body.data.imported,0),1);assert.equal(await db.BankImportItem.count(),1);assert.equal(await db.Transaction.count({where:{id_user:users[0].id}}),1);
  const synthetic=await req('POST','/bank/imports/preview',{...payload,is_synthetic:true});assert.equal((await req('POST','/bank/imports/'+synthetic.body.data.batch_id+'/confirm',{})).status,409);
  const cost=await db.RecurringCost.create({user_id:users[0].id,category_id:category.id,name:'Internet',amount:'200.00',interval:'monthly',start_date:'2026-11-01',next_due_date:'2026-11-25',due_day:25});
  const occurrence=await db.RecurringOccurrence.create({recurring_cost_id:cost.id_recurring_cost,scheduled_for:'2026-11-25',due_date:'2026-11-25',amount_snapshot:'200.00'});
  await db.TokenWallet.create({user_id:users[0].id,available_tokens:1000,reserved_tokens:0,balance:1000});const before=(await db.TokenWallet.findByPk(users[0].id)).toJSON();
  const path='/recommendations/free?period=2026-11&income_confirmed=true&commitments_confirmed=true';let tips=await req('GET',path);assert.equal(tips.status,200);assert.equal(tips.body.data.projected_surplus,'800.00');
  const expense=await db.Transaction.create({id_user:users[0].id,id_category:category.id,type:'expense',nominal:'200.00',createdAt:new Date('2026-11-25T05:00:00Z')});await occurrence.update({transaction_id:expense.id_transaction});
  tips=await req('GET',path);assert.equal(tips.body.data.projected_surplus,'800.00');assert.equal(tips.body.data.unpaid_commitments,'0.00');assert.equal((await req('GET',path,undefined,1)).body.data.income,'0.00');
  assert.deepEqual((await db.TokenWallet.findByPk(users[0].id)).toJSON(),before);assert.equal(await db.TokenLedger.count({where:{user_id:users[0].id}}),0);
 }finally{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}if(db)await db.sequelize.close();await admin.query('DROP DATABASE IF EXISTS '+mysql.escapeId(name));await admin.end();}
});
