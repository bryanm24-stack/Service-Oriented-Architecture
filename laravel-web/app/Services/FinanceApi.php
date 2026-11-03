<?php

namespace App\Services;

use App\Exceptions\ApiUnavailable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

final class FinanceApi
{
    /** @return array<string, mixed> */
    private function request(string $method, string $path, array $data = []): array
    {
        $base = rtrim((string) config('soa.api_base_url'), '/');
        $url = parse_url($base);
        if (! is_array($url) || ! in_array($url['scheme'] ?? '', ['http', 'https'], true)
            || empty($url['host']) || isset($url['user']) || isset($url['pass']) || isset($url['query']) || isset($url['fragment'])
            || ! str_ends_with($base, '/api/v1')) {
            throw new ApiUnavailable('Konfigurasi koneksi belum siap.');
        }
        try {
            $client = Http::acceptJson()->asJson()->connectTimeout(2)->timeout(8)->withoutRedirecting();
            $response = $method === 'GET' ? $client->get($base.$path, $data) : $client->send($method, $base.$path, ['json' => $data]);
        } catch (ConnectionException $exception) {
            throw new ApiUnavailable($method === 'GET'
                ? 'Layanan data belum dapat dihubungi. Coba beberapa saat lagi.'
                : 'Status penyimpanan belum dapat dipastikan. Periksa daftar pengeluaran sebelum mengulangi.', previous: $exception);
        }
        if ($response->status() === 404) {
            abort(404);
        }
        if (in_array($response->status(), [400, 409, 422], true)) {
            if ($method === 'GET') {
                throw new ApiUnavailable('Data belum dapat dimuat. Silakan periksa koneksi layanan.');
            }
            throw ValidationException::withMessages(['_api' => 'Data belum dapat disimpan. Periksa isian atau muat ulang halaman.']);
        }
        if (! $response->successful()) {
            throw new ApiUnavailable('Layanan data belum tersedia. Silakan coba kembali.');
        }
        if ($response->status() === 204) {
            return [];
        }
        $body = $response->json();
        if (! is_array($body)) {
            throw new ApiUnavailable('Data yang diterima belum dapat ditampilkan.');
        }

        return $body;
    }

    /** @return array<int, array<string, mixed>> */
    public function expenses(int $userId): array
    {
        $rows = [];
        $seen = [];
        for ($offset = 0; $offset < 10000; $offset += 100) {
            $body = $this->request('GET', '/users/'.$userId.'/transactions', ['limit' => 100, 'offset' => $offset, 'sort' => 'asc']);
            $page = $body['data'] ?? null;
            if (! is_array($page) || count($page) > 100) {
                throw new ApiUnavailable('Data pengeluaran belum dapat ditampilkan.');
            }
            foreach ($page as $row) {
                if (! is_array($row) || ! isset($row['id_transaction'], $row['id_user'], $row['nominal'], $row['createdAt'])
                    || (int) $row['id_user'] !== $userId || isset($seen[$row['id_transaction']])) {
                    throw new ApiUnavailable('Data pengeluaran berubah. Muat ulang halaman.');
                }
                $seen[$row['id_transaction']] = true;
                $rows[] = $row;
            }
            if (count($page) < 100) {
                return $rows;
            }
        }
        throw new ApiUnavailable('Data terlalu besar untuk ringkasan ini. Hubungi pengelola aplikasi.');
    }

    /** @return array<int, array<string, mixed>> */
    public function categories(): array
    {
        $data = $this->request('GET', '/categories')['data'] ?? null;
        if (! is_array($data) || ! array_is_list($data)) {
            throw new ApiUnavailable('Kategori belum dapat ditampilkan.');
        }

        return $data;
    }

    /** @return array<string, mixed> */
    public function expense(int $id, int $userId): array
    {
        $row = $this->request('GET', '/transactions/'.$id)['data'] ?? [];
        abort_unless((int) ($row['id_user'] ?? 0) === $userId, 404);

        return $row;
    }

    public function createExpense(int $userId, array $values): void
    {
        $this->request('POST', '/transactions', ['id_user' => $userId, 'id_category' => (int) $values['id_category'], 'nominal' => $values['nominal'], 'catatan' => $values['catatan'] ?? null]);
    }

    public function updateExpense(int $id, int $userId, array $values): void
    {
        $this->expense($id, $userId);
        $this->request('PATCH', '/transactions/'.$id, $values);
    }

    public function deleteExpense(int $id, int $userId): void
    {
        $this->expense($id, $userId);
        $this->request('DELETE', '/transactions/'.$id);
    }

    public function budgets(int $userId): array
    {
        $rows = $this->request('GET', '/users/'.$userId.'/budgets')['data'] ?? [];
        if (! is_array($rows) || ! array_is_list($rows)) {
            throw new ApiUnavailable('Anggaran belum dapat ditampilkan.');
        }
        foreach ($rows as $row) {
            if ((int) ($row['user_id'] ?? 0) !== $userId) {
                throw new ApiUnavailable('Anggaran belum dapat ditampilkan.');
            }
        }

        return $rows;
    }

    public function budgetSummary(int $id, int $userId): array
    {
        $row = $this->request('GET', '/budgets/'.$id.'/summary')['data'] ?? [];
        abort_unless((int) ($row['user_id'] ?? 0) === $userId, 404);

        return $row;
    }
}
