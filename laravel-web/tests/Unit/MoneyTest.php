<?php

namespace Tests\Unit;

use App\Exceptions\ApiUnavailable;
use App\Services\FinanceOverview;
use App\Support\Money;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_decimal_arithmetic_never_uses_floating_point(): void
    {
        $this->assertSame(30, Money::cents('0.10') + Money::cents('0.20'));
        $this->assertSame('0.30', Money::decimal(30));
        $this->assertSame('Rp15.000,50', Money::rupiah(1500050));
        $this->assertSame('−Rp1', Money::rupiah(-100));
        $this->assertSame('9999999999999.99', Money::decimal(Money::cents('9999999999999.99')));
    }

    public function test_invalid_or_excess_precision_money_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::cents('1.234');
    }

    public function test_summary_refuses_integer_overflow_instead_of_rounding_to_float(): void
    {
        $this->expectException(ApiUnavailable::class);
        (new FinanceOverview)->total(collect(array_fill(0, 10000, ['nominal' => '9999999999999.99'])));
    }
}
