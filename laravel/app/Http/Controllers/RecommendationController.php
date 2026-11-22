<?php
namespace App\Http\Controllers;
use App\Services\BankApi;
use Illuminate\Http\Request;
final class RecommendationController extends Controller {
 public function index(Request $request,BankApi $api){
  $values=$request->validate(['period'=>['nullable','date_format:Y-m'],'income_confirmed'=>['nullable','in:1'],'commitments_confirmed'=>['nullable','in:1'],'reserve_target'=>['nullable','regex:/^\d{1,13}(\.\d{1,2})?$/'],'goal_target'=>['nullable','regex:/^\d{1,13}(\.\d{1,2})?$/'],'horizon_months'=>['nullable','integer','min:1','max:600'],'risk_profile'=>['nullable','in:low,medium,high']]);
  $values=array_filter($values,fn($v)=>$v!==null&&$v!=='');
  $values['income_confirmed']=$request->boolean('income_confirmed');$values['commitments_confirmed']=$request->boolean('commitments_confirmed');
  return view('recommendations.index',['tips'=>$api->call('GET','/recommendations/free',$values),'filters'=>$values]);
 }
}
