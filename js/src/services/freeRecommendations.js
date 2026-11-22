const {toCents,fromCents}=require('../utils/money');
// Pure deterministic rules; no provider, key, tier or token wallet dependency.
function calculate({period,income,expense,commitments,inputs}) {
 const earned=toCents(income),spent=toCents(expense);
 const pending=commitments.reduce((sum,x)=>sum+toCents(x.amount),0n);
 const surplus=earned-spent-pending;
 const missing=[];
 if(!inputs.income_confirmed)missing.push('income_confirmed');
 if(!inputs.commitments_confirmed)missing.push('commitments_confirmed');
 if(earned===0n&&!inputs.income_confirmed&&!missing.includes('income_confirmed'))missing.push('income_confirmed');
 const cards=[];
 if(commitments.length)cards.push({kind:'needs',priority:1,amount:fromCents(pending),due_date:commitments[0].due_date,reason:`${commitments.length} kewajiban belum tercatat, total Rp${fromCents(pending)}; sudah dikurangkan dalam proyeksi.`,action:commitments[0].kind==='installment'?'wishes':'commitments'});
 if(missing.length)cards.push({kind:'data',priority:0,amount:null,reason:'Konfirmasikan kelengkapan pemasukan dan kewajiban. Angka nol belum membuktikan tidak ada kebutuhan.',action:'complete_data'});
 else if(surplus<=0n)cards.push({kind:'needs',priority:2,amount:fromCents(-surplus),reason:`Arus kas setelah komitmen ${fromCents(surplus)}. Tinjau pengeluaran dan kewajiban sebelum mengalokasikan tabungan.`,action:'transactions'});
 else {
  let remaining=surplus;
  if(inputs.reserve_target===undefined)cards.push({kind:'liquidity',priority:2,amount:null,reason:`Surplus proyeksi Rp${fromCents(surplus)}. Isi target cadangan yang masih perlu dipenuhi sebelum membagi dana.`,action:'preferences'});
  else {const target=toCents(inputs.reserve_target);const amount=remaining<target?remaining:target;remaining-=amount;cards.push({kind:'liquidity',priority:2,amount:fromCents(amount),reason:`Dari surplus Rp${fromCents(surplus)}, prioritaskan sisa target cadangan Rp${fromCents(target)}.`,action:'preferences'});
   if(inputs.goal_target!==undefined){const goal=toCents(inputs.goal_target);const amount=remaining<goal?remaining:goal;remaining-=amount;cards.push({kind:'goal',priority:3,amount:fromCents(amount),reason:`Sisa setelah cadangan Rp${fromCents(surplus-(surplus<target?surplus:target))}; target tabungan/modal Rp${fromCents(goal)}.`,action:'wishes'});}
   if(inputs.horizon_months&&inputs.risk_profile)cards.push({kind:'education',priority:4,amount:null,reason:`Horizon ${inputs.horizon_months} bulan; toleransi risiko ${inputs.risk_profile}; sisa proyeksi Rp${fromCents(remaining)}. ${inputs.horizon_months<=12?'Pelajari likuiditas dan perlindungan dana untuk kebutuhan dekat.':'Pelajari diversifikasi, biaya dan kemungkinan kerugian sesuai horizon.'} Ini edukasi, tanpa janji return atau rekomendasi produk.`,action:'preferences'});
  }
 }
 return {period,label:'Surplus proyeksi dari data tercatat; bukan saldo bank atau kas terverifikasi',free:true,uses_ai_tokens:false,data_incomplete:missing.length>0,missing_inputs:missing,optional_inputs:['reserve_target','goal_target','horizon_months','risk_profile'].filter(k=>inputs[k]===undefined),income:fromCents(earned),expense:fromCents(spent),unpaid_commitments:fromCents(pending),projected_surplus:fromCents(surplus),commitments,cards:cards.sort((a,b)=>a.priority-b.priority)};
}
module.exports={calculate};
