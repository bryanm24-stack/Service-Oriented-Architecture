<div class="cash-flow-grid">
    @foreach (['income' => ['Pemasukan', 'income-value'], 'expense' => ['Pengeluaran', 'expense-value'], 'difference' => ['Selisih tercatat', '']] as $key => $item)
        <section class="panel metric">
            <p class="muted small">{{ $item[0] }}</p><strong
                class="{{ $item[1] }}">{{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $summary[$key])) }}</strong><span
                class="small muted">{{ $key === 'difference' ? 'Pemasukan dikurangi pengeluaran' : 'Sesuai periode dan filter' }}</span>
        </section>
    @endforeach
</div>
<p class="cash-flow-caption">Arus kas tercatat · {{ $summary['total_transactions'] }} transaksi. Selisih ini bukan saldo
    rekening bank.</p>
