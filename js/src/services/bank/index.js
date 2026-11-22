const manual=require('./manual');
const httpError=require('../../utils/httpError');
// Replace a provider behind this contract only after verified access. No guessed URL or credentials.
const manualAdapter={getBalance:manual.getBalance,getStatements:async input=>({source:'manual_import',verified:false,rows:manual.parseStatement(input)})};
const unavailable={getBalance:async()=>{throw httpError(503,'Akses sandbox resmi belum diverifikasi');},getStatements:async()=>{throw httpError(503,'Akses sandbox resmi belum diverifikasi');}};
module.exports={getAdapter:mode=>mode==='manual_import'?manualAdapter:unavailable};
