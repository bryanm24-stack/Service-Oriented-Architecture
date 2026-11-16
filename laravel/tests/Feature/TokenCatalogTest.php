<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class TokenCatalogTest extends TestCase
{
    private string $orderId = 'SOA-00000000-0000-4000-8000-000000000001';

    private string $key = '00000000-0000-4000-8000-000000000002';

    private array $bundle;

    private array $purchase;

    private function fakeApi(string $role = 'user'): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake([
            '*/auth/me' => Http::response(['user' => ['id' => 1, 'name' => 'Buyer', 'role' => $role]]),
            '*/token-purchases/*/checkout' => Http::response(['data' => ['available' => false, 'purchase' => $this->purchase]]),
            '*/token-purchases/'.$this->orderId => Http::response(['data' => $this->purchase]),
            '*/token-purchases' => Http::response(['data' => [$this->purchase], 'meta' => ['total' => 1]]),
            '*/token-purchases?*' => Http::response(['data' => [$this->purchase], 'meta' => ['total' => 1]]),
            '*/admin/token-bundles/1' => Http::response(['data' => $this->bundle]),
            '*/admin/token-bundles*' => Http::response(['data' => [$this->bundle], 'meta' => ['total' => 1]]),
            '*/token-bundles*' => Http::response(['data' => [$this->bundle], 'meta' => ['total' => 1]]),
            '*/categories/1' => Http::response(['data' => ['id' => 1, 'name' => 'Food', 'icon' => 'food']]),
            '*/categories' => Http::response(['data' => [['id' => 1, 'name' => 'Food', 'icon' => 'food']]]),
        ]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->bundle = ['id' => 1, 'name' => 'DEMO <script>alert(1)</script>', 'price_idr' => '25000.50', 'token_quota' => 2000, 'is_active' => true, 'deletedAt' => null];
        $this->purchase = ['order_id' => $this->orderId, 'user_id' => 1, 'token_bundle_id' => 1, 'bundle_name_snapshot' => 'Harga lama', 'price_idr_snapshot' => '10000.25', 'token_quota_snapshot' => 1000, 'status' => 'pending', 'bundle' => $this->bundle];
        $this->fakeApi();
    }

    private function signed(string $cachedRole = 'user'): static
    {
        return $this->withSession(['soa' => ['access_token' => 'test-token', 'refresh_token' => 'test-refresh', 'user' => ['id' => 1, 'role' => $cachedRole]]]);
    }

    public function test_user_catalog_prices_and_quota_match_api_and_never_show_admin_controls(): void
    {
        $this->signed()->get('/app/token-bundles')->assertOk()
            ->assertSee('Rp25.000,50')->assertSee('2.000')->assertSee('Beli paket')
            ->assertSee('Pembayaran belum dibuka')->assertSee('pending')
            ->assertDontSee('/app/admin/', false)->assertDontSee('Kelola paket')
            ->assertDontSee('<script>alert(1)</script>', false)->assertSee('&lt;script&gt;alert(1)&lt;/script&gt;', false);
        $this->assertNotEmpty(session('token_order_keys.1'));
        Http::assertSent(fn ($r) => str_contains($r->url(), '/token-bundles?') && $r->hasHeader('Authorization', 'Bearer test-token'));
    }

    public function test_admin_routes_use_fresh_server_role_even_if_session_claimed_admin(): void
    {
        foreach (['/app/admin/token-bundles', '/app/admin/token-bundles/create', '/app/admin/categories', '/app/admin/categories/1/edit'] as $url) {
            $this->signed('admin')->get($url)->assertForbidden();
        }
        $this->post('/app/admin/token-bundles', ['name' => 'Forged'])->assertForbidden();
        $this->put('/app/admin/categories/1', ['name' => 'Forged'])->assertForbidden();
        $this->delete('/app/admin/token-bundles/1')->assertForbidden();
        Http::assertNotSent(fn ($r) => str_contains($r->url(), '/admin/') || in_array($r->method(), ['POST', 'PUT', 'DELETE'], true));
    }

    public function test_admin_pages_share_table_and_form_components_and_render_archived_badge(): void
    {
        $this->bundle['deletedAt'] = '2026-11-06 00:00:00';
        $this->bundle['is_active'] = false;
        $this->fakeApi('admin');
        $this->signed()->get('/app/admin/token-bundles?status=archived')->assertOk()->assertSee('data-table-scroll')->assertSee('Arsip')->assertDontSee('Arsipkan');
        $this->get('/app/admin/token-bundles/create')->assertOk()->assertSee('token_quota')->assertSee('price_idr')->assertSee('is_active')->assertSee('field-help');
        $this->get('/app/admin/categories')->assertOk()->assertSee('data-table-scroll')->assertSee('Tambah kategori');
        $this->get('/app/admin/categories/create')->assertOk()->assertSee('name="icon"', false);
    }

    public function test_admin_form_normalizes_types_and_put_includes_every_field(): void
    {
        $this->fakeApi('admin');
        $values = ['name' => 'DEMO Hemat', 'token_quota' => '1000', 'price_idr' => '15000.5', 'is_active' => '0'];
        $this->signed()->post('/app/admin/token-bundles', $values)->assertRedirect(route('admin.bundles.index'));
        Http::assertSent(fn ($r) => $r->method() === 'POST' && $r['price_idr'] === '15000.50' && $r['token_quota'] === 1000 && $r['is_active'] === false);
        $this->put('/app/admin/token-bundles/1', $values)->assertRedirect(route('admin.bundles.index'));
        Http::assertSent(fn ($r) => $r->method() === 'PUT' && count($r->data()) === 4);
        $this->post('/app/admin/categories', ['name' => 'Food', 'icon' => '🍽'])->assertRedirect(route('admin.categories.index'));
        $this->put('/app/admin/categories/1', ['name' => 'Meals', 'icon' => ''])->assertRedirect(route('admin.categories.index'));
        Http::assertSent(fn ($r) => $r->method() === 'PUT' && str_ends_with($r->url(), '/categories/1') && array_key_exists('icon', $r->data()));
    }

    public function test_admin_validation_rejects_invalid_fields_before_api_write(): void
    {
        $this->fakeApi('admin');
        $this->signed()->post('/app/admin/token-bundles', ['name' => '', 'token_quota' => '0', 'price_idr' => '-1', 'is_active' => 'yes', 'deletedAt' => 'forged'])
            ->assertSessionHasErrors(['name', 'token_quota', 'price_idr', 'is_active', 'deletedAt']);
        $this->post('/app/admin/categories', ['name' => '', 'role' => 'admin'])->assertSessionHasErrors(['name', 'role']);
        Http::assertNotSent(fn ($r) => $r->method() !== 'GET');
    }

    public function test_archive_sends_empty_json_object_and_handles_204(): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake([
            '*/auth/me' => Http::response(['user' => ['id' => 1, 'role' => 'admin']]),
            '*/admin/token-bundles/1' => Http::response(null, 204),
        ]);
        $this->signed()->delete('/app/admin/token-bundles/1')->assertRedirect(route('admin.bundles.index'))->assertSessionHas('success');
        Http::assertSent(fn ($r) => $r->method() === 'DELETE' && $r->body() === '{}');
    }

    public function test_order_form_sends_only_bundle_id_and_reuses_idempotency_header(): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake([
            '*/auth/me' => Http::response(['user' => ['id' => 1, 'role' => 'user']]),
            '*/token-purchases' => Http::response(['data' => $this->purchase], 201),
        ]);
        $this->signed()->withSession(['token_order_keys' => [1 => $this->key]]);
        $values = ['token_bundle_id' => '1', 'idempotency_key' => $this->key];
        $this->post('/app/token-purchases', $values)->assertRedirect(route('token-purchases.show', $this->orderId))->assertSessionHas('success');
        $this->post('/app/token-purchases', $values)->assertRedirect(route('token-purchases.show', $this->orderId));
        Http::assertSent(fn ($r) => $r->method() === 'POST' && $r->hasHeader('Idempotency-Key', $this->key) && $r->data() === ['token_bundle_id' => 1]);
        $this->assertSame($this->key, session('token_order_keys.1'));
    }

    public function test_order_rejects_forged_owner_price_quota_status_or_missing_session_key(): void
    {
        $this->signed()->withSession(['token_order_keys' => [1 => $this->key]]);
        foreach (['price_idr', 'token_quota', 'user_id', 'status'] as $field) {
            $this->post('/app/token-purchases', ['token_bundle_id' => 1, 'idempotency_key' => $this->key, $field => 'forged'])->assertSessionHasErrors($field);
        }
        $this->post('/app/token-purchases', ['token_bundle_id' => 1, 'idempotency_key' => '00000000-0000-4000-8000-999999999999'])->assertStatus(419);
        Http::assertNotSent(fn ($r) => $r->method() === 'POST');
    }

    public function test_order_shows_snapshot_and_checkout_is_explicitly_disabled(): void
    {
        $this->signed()->get('/app/token-purchases/'.$this->orderId)->assertOk()
            ->assertSee('Harga lama')->assertSee('Rp10.000,25')->assertSee('1.000')
            ->assertDontSee('Rp25.000,50')->assertSee('Pending')->assertSee('Status checkout');
        $this->get('/app/token-purchases/'.$this->orderId.'/checkout')->assertOk()
            ->assertSee('Checkout belum tersedia')->assertSee('Bayar · belum tersedia')->assertSee('disabled', false);
        $this->get('/app/token-purchases')->assertOk()->assertSee('Harga lama')->assertSee('Rp10.000,25');
        Http::assertNotSent(fn ($r) => $r->method() !== 'GET');
    }

    public function test_explicit_new_order_rotates_key_without_creating_a_purchase(): void
    {
        $this->signed()->withSession(['token_order_keys' => [1 => $this->key]])->post('/app/token-bundles/1/new-order')
            ->assertRedirect(route('tokens.index').'#paket-1');
        $this->assertNotSame($this->key, session('token_order_keys.1'));
        Http::assertNotSent(fn ($r) => $r->method() === 'POST');
    }

    public function test_empty_catalog_and_history_have_clear_states(): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake([
            '*/auth/me' => Http::response(['user' => ['id' => 1, 'role' => 'user']]),
            '*' => Http::response(['data' => [], 'meta' => ['total' => 0]]),
        ]);
        $this->signed()->get('/app/token-bundles')->assertOk()->assertSee('Paket belum tersedia');
        $this->get('/app/token-purchases')->assertOk()->assertSee('Belum ada order');
    }
}
