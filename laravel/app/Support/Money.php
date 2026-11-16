<?php

namespace App\Support;

use InvalidArgumentException;

final class Money
{
    public static function cents(string|int $value): int
    {
        $value = (string) $value;
        if (! preg_match('/^(-?)(\d{1,13})(?:\.(\d{1,2}))?$/D', $value, $parts)) {
            throw new InvalidArgumentException('Format nominal tidak valid.');
        }
        $cents = (int) $parts[2] * 100 + (int) str_pad($parts[3] ?? '', 2, '0');

        return $parts[1] === '-' ? -$cents : $cents;
    }

    public static function decimal(int $cents): string
    {
        return ($cents < 0 ? '-' : '').intdiv(abs($cents), 100).'.'.str_pad((string) (abs($cents) % 100), 2, '0', STR_PAD_LEFT);
    }

    public static function rupiah(int $cents): string
    {
        $amount = abs($cents);
        $whole = preg_replace('/\B(?=(\d{3})+(?!\d))/', '.', (string) intdiv($amount, 100));
        $fraction = $amount % 100;

        return ($cents < 0 ? '−' : '').'Rp'.$whole.($fraction ? ','.str_pad((string) $fraction, 2, '0', STR_PAD_LEFT) : '');
    }
}
