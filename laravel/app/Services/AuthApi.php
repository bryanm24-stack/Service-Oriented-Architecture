<?php

namespace App\Services;

use App\Exceptions\ApiUnavailable;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Session;
use Illuminate\Validation\ValidationException;

final class AuthApi
{
    public function send(string $method, string $path, array $data = [], bool $authenticated = false, array $headers = []): Response
    {
        $base = rtrim((string) config('soa.api_base_url'), '/');
        $url = parse_url($base);
        if (! is_array($url) || ! in_array($url['scheme'] ?? '', ['http', 'https'], true) || empty($url['host']) || isset($url['user']) || isset($url['pass']) || isset($url['query']) || isset($url['fragment']) || ! str_ends_with($base, '/api/v1')) {
            throw new ApiUnavailable('Konfigurasi koneksi API belum siap.');
        }
        try {
            $client = Http::acceptJson()->asJson()->connectTimeout(3)->timeout(str_contains($path, '/ai/analyze') ? 40 : 10)->withoutRedirecting();
            $client = $client->withHeaders($headers);
            if ($authenticated) {
                $client = $client->withToken((string) Session::get('soa.access_token'));
            }
            if (Session::has('soa.refresh_token')) {
                $client = $client->withCookies(['refreshToken' => Session::get('soa.refresh_token')], $url['host']);
            }

            return $method === 'GET' ? $client->get($base.$path, $data) : $client->send($method, $base.$path, ['json' => $data === [] ? (object) [] : $data]);
        } catch (ConnectionException $error) {
            if (str_contains($path, '/ai/analyze')) {
                throw ValidationException::withMessages([
                    '_api' => ['Koneksi analisis terputus dan hasil provider belum dapat dipastikan. Jangan kirim ulang otomatis; periksa halaman Kuota AI terlebih dahulu.'],
                ]);
            }
            throw new ApiUnavailable($method === 'GET' ? 'Layanan data belum dapat dihubungi. Coba lagi.' : 'Status penyimpanan belum dapat dipastikan. Periksa data sebelum mengulangi.', previous: $error);
        }
    }

    private function remember(Response $response): void
    {
        $body = $response->json();
        if (! is_array($body) || ! is_string($body['accessToken'] ?? null) || ! is_array($body['user'] ?? null)) {
            throw new ApiUnavailable('Respons login tidak valid.');
        }
        $refresh = null;
        foreach ($response->cookies()->toArray() as $cookie) {
            if ($cookie['Name'] === 'refreshToken') {
                $refresh = $cookie['Value'];
            }
        }
        if (! $refresh) {
            throw new ApiUnavailable('Cookie sesi belum diterima dari API.');
        }
        Session::put('soa', ['access_token' => $body['accessToken'], 'refresh_token' => $refresh, 'user' => $body['user']]);
    }

    public function login(array $values): void
    {
        $response = $this->send('POST', '/auth/login', $values);
        $this->validateResponse($response);
        Session::regenerate();
        Session::forget('soa.ai_api_key');
        $this->remember($response);
    }

    public function register(array $values): void
    {
        $this->validateResponse($this->send('POST', '/auth/register', $values));
    }

    public function refresh(): void
    {
        if (! Session::has('soa.refresh_token')) {
            $this->endSession();
        }
        $response = $this->send('POST', '/auth/refresh');
        if ($response->status() === 401 || $response->status() === 403) {
            $this->endSession();
        }
        $this->validateResponse($response);
        $this->remember($response);
    }

    public function authorized(string $method, string $path, array $values = [], array $headers = []): Response
    {
        if (! Session::has('soa.access_token')) {
            $this->endSession();
        }
        $response = $this->send($method, $path, $values, true, $headers);
        if ($response->status() === 401) {
            $this->refresh();
            $response = $this->send($method, $path, $values, true, $headers);
            if ($response->status() === 401) {
                $this->endSession();
            }
        }

        return $response;
    }

    public function ensure(): void
    {
        $response = $this->authorized('GET', '/auth/me');
        $this->validateResponse($response);
        $user = $response->json('user');
        if (! is_array($user) || empty($user['id'])) {
            $this->endSession();
        }
        Session::put('soa.user', $user);
    }

    public function logout(): void
    {
        if (Session::has('soa.access_token')) {
            $response = $this->authorized('POST', '/auth/logout');
            $this->validateResponse($response);
        }
        Session::invalidate();
        Session::regenerateToken();
    }

    private function endSession(): never
    {
        Session::invalidate();
        Session::regenerateToken();
        throw new AuthenticationException;
    }

    public function validateResponse(Response $response): void
    {
        if ($response->successful()) {
            return;
        }
        if (in_array($response->status(), [400, 401, 409, 422, 429], true)) {
            $errors = [];
            foreach ($response->json('errors', []) as $error) {
                if (is_array($error)) {
                    $errors[$error['field'] ?? '_api'][] = $error['message'] ?? 'Isian tidak valid.';
                }
            }
            if (! $errors) {
                $errors['_api'][] = $response->json('msg') ?: ($response->status() === 409 ? 'Terjadi konflik data. Periksa kembali permintaan Anda.' : ($response->status() === 429 ? 'Batas permintaan tercapai. Tunggu sebelum mencoba lagi.' : ($response->status() === 401 ? 'Email atau password salah.' : 'Periksa seluruh isian Anda.')));
            }
            throw ValidationException::withMessages($errors);
        }
        if (in_array($response->status(), [502, 503, 504], true)) {
            throw ValidationException::withMessages([
                '_api' => [$response->json('msg') ?: 'Layanan AI belum dapat memastikan hasil. Jangan kirim ulang otomatis; periksa riwayat kuota terlebih dahulu.'],
            ]);
        }
        if ($response->status() === 403) {
            abort(403);
        }
        if ($response->status() === 404) {
            abort(404);
        }
        throw new ApiUnavailable('Layanan data belum tersedia. Silakan coba kembali.');
    }
}
