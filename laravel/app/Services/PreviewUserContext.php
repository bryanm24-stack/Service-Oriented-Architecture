<?php

namespace App\Services;

final class PreviewUserContext
{
    public function id(): int
    {
        abort_unless(app()->environment(['local', 'testing']) && config('soa.local_preview'), 503, 'Akses belum tersedia.');
        $id = config('soa.local_user_id');
        abort_unless(is_int($id) && $id >= 1 && $id <= 2147483647, 503, 'Akun uji belum dikonfigurasi.');

        return $id;
    }
}
