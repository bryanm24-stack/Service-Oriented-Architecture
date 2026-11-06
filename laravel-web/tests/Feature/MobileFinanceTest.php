<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MobileFinanceTest extends TestCase
{
    private array $row;

    protected function setUp(): void
    {
        parent::setUp();
        $this->row = ['id_transaction' => 7, 'id_user' => 1, 'id_category' => 1, 'type' => 'expense', 'nominal' => '15000.10', 'catatan' => "..PATCH.. O'Connor <script>alert(1)</script>", 'createdAt' => '2026-11-06T05:00:00Z', 'category' => ['id' => 1, 'name' => 'Makanan']];
        Http::preventStrayRequests();
        Http::fake([
            '*/auth/me' => Http::response(['user' => ['id' => 1, 'name' => 'User A', 'email' => 'a@example.com', 'role' => 'user']]),
            '*/transactions/summary*' => Http::response(['data' => ['label' => 'Arus kas tercatat', 'income' => '100000.20', 'expense' => '15000.10', 'difference' => '85000.10', 'total_transactions' => 25]]),
            '*/transactions/7' => Http::response(['data' => $this->row]),
            '*/transactions*' => Http::response(['data' => [$this->row], 'meta' => ['total' => 25, 'limit' => 10, 'offset' => 0]]),
            '*/categories' => Http::response(['data' => [['id' => 1, 'name' => 'Makanan']]]),
            '*/users/1/budgets' => Http::response(['data' => []]),
        ]);
    }

    private function signed(): static
    {
        return $this->withSession(['soa' => ['access_token' => 'test-token', 'refresh_token' => 'test-refresh', 'user' => ['id' => 1, 'name' => 'User A']]]);
    }

    public function test_private_pages_require_login_and_ignore_old_preview_flag(): void
    {
        config(['soa.local_preview' => true, 'soa.local_user_id' => 1]);
        $this->get('/app/dashboard')->assertRedirect(route('login'));
        $this->get('/app/transactions')->assertRedirect(route('login'));
        Http::assertNothingSent();
    }

    public function test_dashboard_uses_actual_server_summary_and_escapes_user_text(): void
    {
        $this->signed()->get('/app/dashboard?period=2026-11')->assertOk()->assertSee('Rp100.000,20')->assertSee('Rp85.000,10')->assertSee('25 transaksi')
            ->assertDontSee('<script>alert(1)</script>', false)->assertSee('&lt;script&gt;alert(1)&lt;/script&gt;', false)->assertSee('Arus kas tercatat');
        Http::assertSent(fn ($r) => str_contains($r->url(), '/transactions/summary') && $r['period'] === '2026-11' && $r->hasHeader('Authorization', 'Bearer test-token'));
        Http::assertSent(fn ($r) => str_contains($r->url(), '/transactions?') && $r['period'] === '2026-11' && $r['limit'] === 5);
    }

    public function test_filters_and_pagination_are_sent_to_api_and_totals_are_not_page_totals(): void
    {
        $response = $this->signed()->get('/app/transactions?start_date=2026-11-01&end_date=2026-11-30&type=expense&category_id=1&search=Lunch&page=2')
            ->assertOk()->assertSee('Rp85.000,10')->assertSee('Pemasukan')->assertSee('Pengeluaran');
        $this->assertMatchesRegularExpression('/dari\s+25/', $response->getContent());
        Http::assertSent(fn ($r) => str_contains($r->url(), '/transactions?') && $r['offset'] === 10 && $r['type'] === 'expense' && $r['category_id'] == 1 && $r['search'] === 'Lunch' && $r['start_date'] === '2026-11-01');
        Http::assertSent(fn ($r) => str_contains($r->url(), '/transactions/summary') && ! isset($r['offset']));
    }

    public function test_crud_sends_type_and_decimal_but_never_client_owner(): void
    {
        $values = ['id_category' => '1', 'type' => 'income', 'nominal' => '0.10', 'catatan' => 'Salary'];
        $this->signed()->post('/app/transactions', $values)->assertRedirect(route('expenses.index'))->assertSessionHas('success');
        Http::assertSent(fn ($r) => $r->method() === 'POST' && $r['type'] === 'income' && $r['nominal'] === '0.10' && ! isset($r['id_user']));
        $this->patch('/app/transactions/7', [...$values, 'nominal' => '25'])->assertRedirect(route('expenses.index'));
        Http::assertSent(fn ($r) => $r->method() === 'PATCH' && $r['nominal'] === '25.00' && $r['type'] === 'income');
        $this->delete('/app/transactions/7')->assertRedirect(route('expenses.index'));
    }

    public function test_invalid_owner_money_and_type_show_errors_without_mutation(): void
    {
        $this->signed()->post('/app/transactions', ['id_user' => 2, 'nominal' => '-1', 'type' => 'invalid'])->assertSessionHasErrors(['id_user', 'id_category', 'nominal', 'type']);
        Http::assertNotSent(fn ($r) => in_array($r->method(), ['POST', 'PATCH', 'DELETE'], true));
    }

    public function test_empty_result_has_clear_state(): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake(['*/auth/me' => Http::response(['user' => ['id' => 1, 'name' => 'A']]), '*/transactions/summary*' => Http::response(['data' => ['income' => '0.00', 'expense' => '0.00', 'difference' => '0.00', 'total_transactions' => 0]]), '*/transactions*' => Http::response(['data' => [], 'meta' => ['total' => 0]]), '*/categories' => Http::response(['data' => []])]);
        $this->signed()->get('/app/transactions')->assertOk()->assertSee('Belum ada catatan')->assertSee('Rp0');
    }

    public function test_connection_failure_is_clear_and_does_not_leak_secrets(): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake(['*' => Http::response(['secret' => 'SELECT password SECRET'], 500)]);
        $this->signed()->get('/app/dashboard')->assertStatus(502)->assertSee('Belum bisa memuat data.')->assertDontSee('SECRET');
    }
}
