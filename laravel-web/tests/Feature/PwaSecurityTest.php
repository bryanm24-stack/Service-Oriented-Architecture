<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PwaSecurityTest extends TestCase
{
    public function test_application_page_has_manifest_local_assets_and_security_headers(): void
    {
        config(['soa.local_preview' => true, 'soa.local_user_id' => 1]);
        Http::preventStrayRequests();
        $this->get('/aplikasi')->assertOk()->assertSee('manifest.webmanifest')->assertSee('assets/app.v1.js')
            ->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('Referrer-Policy', 'same-origin')
            ->assertHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
        Http::assertNothingSent();
    }

    public function test_manifest_and_static_icons_exist_and_shell_does_not_cache_financial_html(): void
    {
        $manifest = json_decode(file_get_contents(public_path('manifest.webmanifest')), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame('standalone', $manifest['display']);
        $this->assertSame('/', $manifest['scope']);
        foreach ($manifest['icons'] as $icon) {
            $path = public_path(ltrim($icon['src'], '/'));
            $this->assertFileExists($path);
            [$width, $height] = getimagesize($path);
            $this->assertSame($width.'x'.$height, $icon['sizes']);
        }
        $offline = file_get_contents(public_path('offline.html'));
        $this->assertStringNotContainsString('_token', $offline);
        $this->assertStringContainsString('Data keuangan tidak disimpan', $offline);
    }
}
