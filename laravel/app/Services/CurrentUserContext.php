<?php

namespace App\Services;

use Illuminate\Auth\AuthenticationException;

final class CurrentUserContext
{
    public function id(): int
    {
        $id = session('soa.user.id');
        if (! is_numeric($id) || (int) $id < 1) {
            throw new AuthenticationException;
        }

        return (int) $id;
    }
}
