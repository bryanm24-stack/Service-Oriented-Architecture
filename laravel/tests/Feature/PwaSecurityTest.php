<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PwaSecurityTest extends TestCase
{
    public function test_login_and_register_use_local_assets_and_csp_without_inline_scripts(): void
    {
        foreach (['/login', '/register'] as $path) {
            $this->get($path)->assertOk()->assertSee('assets/app.v1.css')->assertDontSee('cdn.tailwindcss.com')->assertDontSee('<script>', false)->assertHeader('X-Content-Type-Options', 'nosniff');
        }
    }

    public function test_manifest_and_static_icons_exist_and_finance_is_not_cached(): void
    {
        $manifest = json_decode(file_get_contents(public_path('manifest.webmanifest')), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame('standalone', $manifest['display']);
        foreach ($manifest['icons'] as $icon) {
            $path = public_path(ltrim($icon['src'], '/'));
            $this->assertFileExists($path);
            [$w,$h] = getimagesize($path);
            $this->assertSame($w.'x'.$h, $icon['sizes']);
        }
        $this->assertStringContainsString('Data keuangan tidak disimpan', file_get_contents(public_path('offline.html')));
        $this->assertStringContainsString('STATIC_PATHS.has(url.pathname)', file_get_contents(public_path('sw.js')));
    }

    public function test_register_calls_same_node_users_database_and_does_not_flash_passwords(): void
    {
        Http::preventStrayRequests();
        Http::fake(['*/auth/register' => Http::response(['user' => ['id' => 12]], 201)]);
        $this->post('/register', ['name' => 'Test', 'email' => 'new@example.com', 'password' => 'Password123!', 'konfirmasi_password' => 'Password123!'])->assertRedirect(route('login'))->assertSessionHas('success');
        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/auth/register') && $r['name'] === 'Test' && ! isset($r['role']));
        $this->post('/register', ['name' => 'Test', 'email' => 'bad', 'password' => 'short', 'konfirmasi_password' => 'wrong'])->assertSessionHasErrors(['email', 'password', 'konfirmasi_password']);
        $this->assertNull(session()->getOldInput('password'));
        $this->assertNull(session()->getOldInput('konfirmasi_password'));
    }
}
