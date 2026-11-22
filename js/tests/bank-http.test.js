const test=require('node:test'),assert=require('node:assert/strict'),jwt=require('jsonwebtoken');
test('Bank real HTTP: owner, preview, synthetic block, idempotency, duplicate, rollback',async()=>{
 const db=require('../src/models');process.env.JWT_ACCESS_SECRET='bank-http-test-key'.repeat(4);
 let state={connections:[],batches:[],items:[],transactions:[]},fail=false;const originals=[];
 const replace=(o,k,f)=>{originals.push([o,k,o[k]]);o[k]=f;};
 const match=(row,where={})=>Object.entries(where).every(([k,v])=>v&&typeof v==='object'?v[require('sequelize').Op.in]?.includes(row[k]):row[k]===v);
 const wrap=row=>row&&({...row,update:async values=>{Object.assign(row,values);return wrap(row);}});
 for(const [model,key]of [[db.BankConnection,'connections'],[db.BankImportBatch,'batches'],[db.BankImportItem,'items']]){
  replace(model,'findOne',async({where})=>wrap(state[key].find(x=>match(x,where))));
  replace(model,'findAll',async({where})=>state[key].filter(x=>match(x,where)));
  replace(model,'create',async values=>{if(key==='items'&&fail)throw Error('simulate insert failure');const row={id:state[key].length+1,status:key==='batches'?'preview':'ready_import',mode:'manual_import',...structuredClone(values)};state[key].push(row);return wrap(row);});
 }
 replace(db.User,'findByPk',async id=>({id,role:'user'}));replace(db.AuthSession,'findByPk',async id=>({id,user_id:Number(id),expires_at:new Date(Date.now()+60000)}));replace(db.Category,'findByPk',async id=>id===1?{id}:null);
 replace(db.Transaction,'create',async values=>{const row={id_transaction:state.transactions.length+1,...values};state.transactions.push(row);return row;});
 replace(db.sequelize,'transaction',async callback=>{const before=structuredClone(state);try{return await callback({LOCK:{UPDATE:'UPDATE'}});}catch(e){state=before;throw e;}});
 const server=require('../index').listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api/v1/bank';
 const token=id=>jwt.sign({sid:String(id)},process.env.JWT_ACCESS_SECRET,{subject:String(id),issuer:process.env.JWT_ISSUER||'projectsoa',audience:process.env.JWT_AUDIENCE||'projectsoa-clients',expiresIn:60});
 const req=async(method,path,body,id=1)=>{const response=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token(id),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
 const row={date:'2026-11-22',external_ref:'REF1',direction:'debit',amount:'100.20',description:'Fixture test'};
 const preview=async(content=[row],synthetic=false,id=1)=>req('POST','/imports/preview',{connection_id:1,category_id:1,format:'json',content:JSON.stringify(content),is_synthetic:synthetic},id);
 try{
  assert.equal((await req('POST','/connections',{label:'Alias','account_last4':'1234'})).status,201);
  assert.equal((await preview([row],false,2)).status,404);
  let p=await preview([row],true);assert.equal(p.status,201);assert.equal(state.transactions.length,0);assert.equal((await req('POST',`/imports/${p.body.data.batch_id}/confirm`,{})).status,409);
  p=await preview();assert.equal(p.body.data.rows[0].type,'expense');assert.equal((await req('POST',`/imports/${p.body.data.batch_id}/confirm`,{},2)).status,404);
  let confirmed=await req('POST',`/imports/${p.body.data.batch_id}/confirm`,{});assert.equal(confirmed.body.data.imported,1);assert.equal(state.transactions.length,1);assert.equal(state.transactions[0].createdAt.toISOString(),'2026-11-22T05:00:00.000Z');
  assert.equal((await req('POST',`/imports/${p.body.data.batch_id}/confirm`,{})).body.data.replayed,true);
  p=await preview();assert.equal(p.body.data.rows[0].status,'duplicate');confirmed=await req('POST',`/imports/${p.body.data.batch_id}/confirm`,{});assert.equal(confirmed.body.data.imported,0);assert.equal(state.transactions.length,1);
  p=await preview([{...row,external_ref:'REF2'}]);fail=true;assert.equal((await req('POST',`/imports/${p.body.data.batch_id}/confirm`,{})).status,500);assert.equal(state.transactions.length,1);fail=false;assert.equal((await req('POST',`/imports/${p.body.data.batch_id}/confirm`,{})).body.data.imported,1);
  p=await preview([{...row,amount:'-1'}]);assert.equal(p.body.data.can_confirm,false);assert.equal((await req('POST',`/imports/${p.body.data.batch_id}/confirm`,{})).status,409);
  const status=await req('GET','/status');assert.equal(status.body.data.connections[0].account_masked,'******1234');assert.equal(status.body.data.balance.amount,null);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));for(const[o,k,f]of originals.reverse())o[k]=f;await db.sequelize.close();}
});
