<?php

namespace Tests\Feature;

use Carbon\Carbon;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MobileFinanceTest extends TestCase
{
    private array $expense;

    protected function setUp(): void
    {
        parent::setUp();
        config(['soa.local_preview' => true, 'soa.local_user_id' => 1]);
        $this->travelTo(Carbon::parse('2026-11-03 12:00:00', 'Asia/Jakarta'));
        $this->expense = ['id_transaction' => 1, 'id_user' => 1, 'id_category' => 1,
            'nominal' => '15000.10', 'catatan' => "..PATCH.. O'Connor <script>alert(1)</script>",
            'createdAt' => '2026-11-03T04:00:00.000Z', 'category' => ['id' => 1, 'name' => 'Makanan']];
        Http::preventStrayRequests();
        $this->fakeApi([
            '*/users/1/transactions*' => Http::response(['data' => [$this->expense]]),
            '*/users/1/budgets' => Http::response(['data' => []]),
            '*/categories' => Http::response(['data' => [['id' => 1, 'name' => 'Makanan']]]),
            '*/transactions/1' => Http::response(['data' => $this->expense]),
            '*/transactions' => Http::response(['success' => true, 'data' => $this->expense], 201),
        ]);
    }

    private function fakeApi(array|callable $responses): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake($responses);
    }

    public function test_dashboard_reads_scoped_api_data_and_escapes_sql_like_text(): void
    {
        $this->get('/')->assertOk()->assertSee('Rp15.000,10')->assertSee("..PATCH.. O'Connor")
            ->assertDontSee('<script>alert(1)</script>', false)->assertSee('&lt;script&gt;alert(1)&lt;/script&gt;', false)
            ->assertHeader('Cache-Control', 'max-age=0, no-store, private');
        Http::assertSent(fn ($request): bool => str_contains($request->url(), '/users/1/transactions') && $request['limit'] === 100);
    }

    public function test_pages_and_create_form_render_without_authentication_routes(): void
    {
        foreach (['/pengeluaran', '/pengeluaran/tambah', '/anggaran', '/kategori', '/aplikasi'] as $path) {
            $this->get($path)->assertOk();
        }
        $this->get('/pengeluaran/tambah')->assertSee('name="_token"', false)->assertDontSee('name="id_user"', false);
        $this->get('/login')->assertNotFound();
        $this->get('/register')->assertNotFound();
    }

    public function test_store_sets_owner_on_server_and_sends_normalized_decimal(): void
    {
        $this->post('/pengeluaran', ['id_category' => '1', 'nominal' => '0.10', 'catatan' => "..PATCH.. O'Connor"])
            ->assertRedirect(route('expenses.index'))->assertSessionHas('success');
        Http::assertSent(fn ($request): bool => $request->method() === 'POST' && $request['id_user'] === 1
            && $request['nominal'] === '0.10' && $request['catatan'] === "..PATCH.. O'Connor");
    }

    public function test_injected_owner_and_invalid_money_are_rejected_without_api_write(): void
    {
        $this->post('/pengeluaran', ['id_user' => 999, 'id_category' => 1, 'nominal' => '15000'])
            ->assertSessionHasErrors('id_user');
        $this->post('/pengeluaran', ['id_category' => 1, 'nominal' => '1; DROP TABLE users'])
            ->assertSessionHasErrors('nominal');
        Http::assertNothingSent();
    }

    public function test_patch_and_delete_verify_owner_before_mutation(): void
    {
        $this->fakeApi(['*/transactions/1' => Http::response(['data' => [...$this->expense, 'id_user' => 2]])]);
        $this->patch('/pengeluaran/1', ['nominal' => '10.00', 'catatan' => 'Tes'])->assertNotFound();
        $this->delete('/pengeluaran/1')->assertNotFound();
        Http::assertNotSent(fn ($request): bool => in_array($request->method(), ['PATCH', 'DELETE'], true));
    }

    public function test_patch_preserves_category_and_uses_legacy_payload(): void
    {
        $this->patch('/pengeluaran/1', ['nominal' => '25', 'catatan' => 'Diperbarui'])->assertRedirect(route('expenses.index'));
        Http::assertSent(fn ($request): bool => $request->method() === 'PATCH' && $request['nominal'] === '25.00'
            && ! isset($request['id_category']) && ! isset($request['user_id']));
    }

    public function test_delete_confirms_owned_expense_and_accepts_no_content_response(): void
    {
        $this->fakeApi(function ($request) {
            return $request->method() === 'DELETE' ? Http::response(null, 204) : Http::response(['data' => $this->expense]);
        });
        $this->delete('/pengeluaran/1')->assertRedirect(route('expenses.index'))->assertSessionHas('success');
        Http::assertSent(fn ($request): bool => $request->method() === 'DELETE');
    }

    public function test_production_is_blocked_even_when_local_preview_flag_is_true(): void
    {
        $this->app->instance('env', 'production');
        $this->get('/')->assertStatus(503)->assertSee('Akses belum tersedia.');
        Http::assertNothingSent();
    }

    public function test_offline_api_returns_clear_error_without_upstream_secrets(): void
    {
        foreach ([400, 500] as $status) {
            $this->fakeApi(['*' => Http::response(['error' => 'SELECT password SECRET_INTERNAL'], $status)]);
            $this->get('/')->assertStatus(502)->assertSee('Belum bisa memuat data.')->assertDontSee('SECRET_INTERNAL');
        }
    }

    public function test_budget_detail_and_categories_are_rendered_from_api(): void
    {
        $summary = ['budget_id' => 1, 'user_id' => 1, 'year' => 2026, 'month' => 11,
            'total_allocated' => '100000.00', 'total_spent' => '15000.10', 'total_remaining' => '84999.90',
            'categories' => [['category_id' => 1, 'name' => 'Makanan', 'allocated_amount' => '100000.00', 'spent' => '15000.10', 'remaining' => '84999.90', 'over_budget' => false]]];
        $this->fakeApi(['*/budgets/1/summary' => Http::response(['data' => $summary])]);
        $this->get('/anggaran/1')->assertOk()->assertSee('Rp84.999,90');
    }

    public function test_dashboard_collects_all_api_pages_instead_of_showing_first_page_as_total(): void
    {
        $this->fakeApi(function ($request) {
            if (str_contains($request->url(), '/transactions')) {
                $offset = (int) $request['offset'];
                $count = $offset === 0 ? 100 : 1;
                $rows = [];
                for ($i = 1; $i <= $count; $i++) {
                    $rows[] = [...$this->expense, 'id_transaction' => $offset + $i, 'nominal' => '0.10'];
                }

                return Http::response(['data' => $rows]);
            }

            return Http::response(['data' => []]);
        });
        $this->get('/')->assertOk()->assertSee('Rp10,10')->assertSee('101 transaksi tercatat');
        Http::assertSent(fn ($request): bool => str_contains($request->url(), '/transactions') && $request['offset'] === 100);
    }
}
