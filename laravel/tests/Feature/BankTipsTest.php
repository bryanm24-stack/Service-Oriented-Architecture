<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Support\Facades\Http;
class BankTipsTest extends TestCase {
 private function signed(): static {
  Http::preventStrayRequests();
  Http::fake([
   '*/auth/me'=>Http::response(['user'=>['id'=>1,'name'=>'Test','role'=>'user']]),
   '*/bank/status'=>Http::response(['data'=>['source'=>'Impor pengguna; bukan API BCA','sandbox'=>['reason'=>'Client ID belum terverifikasi'],'connections'=>[['id'=>1,'label'=>'Alias','account_masked'=>'******1234']]]]),
   '*/categories'=>Http::response(['data'=>[['id'=>1,'name'=>'Umum']]]),
   '*/recommendations/free*'=>Http::response(['data'=>['period'=>'2026-11','label'=>'Surplus proyeksi; bukan saldo bank','data_incomplete'=>true,'income'=>'0.00','expense'=>'0.00','unpaid_commitments'=>'0.00','projected_surplus'=>'0.00','cards'=>[],'commitments'=>[]]]),
  ]);
  return $this->withSession(['soa'=>['access_token'=>'fixture','refresh_token'=>'fixture','user'=>['id'=>1,'role'=>'user']]]);
 }
 public function test_private_pages_need_login(): void {
  $this->get('/app/bank')->assertRedirect(route('login'));
  $this->get('/app/tips')->assertRedirect(route('login'));
 }
 public function test_bank_has_manual_mode_mask_and_synthetic_label(): void {
  $this->signed()->get('/app/bank')->assertOk()->assertSee('Siap impor')->assertSee('Belum terhubung')->assertSee('******1234')->assertSee('DATA SINTETIS')->assertDontSee('<script>',false);
 }
 public function test_tips_does_not_call_ai_or_wallet(): void {
  $this->signed()->get('/app/tips?period=2026-11')->assertOk()->assertSee('Tidak memakai kuota AI')->assertSee('Data belum lengkap')->assertSee('Tambah pemasukan');
  Http::assertNotSent(fn($r)=>str_contains($r->url(),'/ai/')||str_contains($r->url(),'token-wallet'));
 }
}
