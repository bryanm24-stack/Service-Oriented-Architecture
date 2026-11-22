<?php
namespace App\Http\Controllers;
use App\Services\BankApi;
use App\Services\FinanceApi;
use Illuminate\Http\Request;
final class BankController extends Controller {
 private function page(BankApi $api,FinanceApi $finance,?array $preview=null) {
  return view('bank.index',['bank'=>$api->call('GET','/bank/status'),'categories'=>$finance->categories(),'preview'=>$preview]);
 }
 public function index(BankApi $api,FinanceApi $finance){return $this->page($api,$finance);}
 public function connection(Request $request,BankApi $api){
  $values=$request->validate(['label'=>['required','string','min:2','max:80'],'account_last4'=>['required','regex:/^\d{4}$/']]);
  $api->call('POST','/bank/connections',$values);return to_route('bank.index')->with('success','Rekening impor dibuat. Belum terhubung ke API bank.');
 }
 public function preview(Request $request,BankApi $api,FinanceApi $finance){
  $values=$request->validate(['connection_id'=>['required','integer','min:1'],'category_id'=>['required','integer','min:1'],'format'=>['required','in:csv,json'],'content'=>['required','string','max:60000'],'is_synthetic'=>['required','in:0,1']]);
  $values['connection_id']=(int)$values['connection_id'];$values['category_id']=(int)$values['category_id'];$values['is_synthetic']=$request->boolean('is_synthetic');
  return $this->page($api,$finance,$api->call('POST','/bank/imports/preview',$values));
 }
 public function confirm(int $id,BankApi $api){
  $data=$api->call('POST','/bank/imports/'.$id.'/confirm');
  return to_route('bank.index')->with('success',($data['imported']??0).' transaksi diimpor; '.($data['duplicates']??0).' duplikat dilewati.');
 }
}
