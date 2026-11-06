@if (count($items))
    <div class="table-scroll" tabindex="0" role="region" aria-label="Daftar transaksi">
        <table class="expense-table">
            <caption class="sr-only">Transaksi sesuai periode dan filter</caption>
            <thead>
                <tr>
                    <th scope="col">Catatan</th>
                    <th scope="col">Jenis</th>
                    <th scope="col">Kategori</th>
                    <th scope="col">Tanggal</th>
                    <th scope="col" class="amount">Nominal</th>
                    @if ($allowActions)
                        <th scope="col" class="action-column">Aksi</th>
                    @endif
                </tr>
            </thead>
            <tbody>
                @foreach ($items as $item)
                    <tr>
                        <td><span class="table-description">{{ $item['catatan'] ?: 'Tanpa catatan' }}</span></td>
                        <td><span
                                class="transaction-type {{ $item['type'] === 'income' ? 'income-tag' : 'expense-tag' }}">{{ $item['type'] === 'income' ? 'Pemasukan' : 'Pengeluaran' }}</span>
                        </td>
                        <td><span class="category-tag">{{ $item['category']['name'] ?? 'Tanpa kategori' }}</span></td>
                        <td class="muted">
                            {{ \Carbon\CarbonImmutable::parse($item['createdAt'])->timezone(config('app.timezone'))->locale('id')->translatedFormat('d M Y') }}
                        </td>
                        <td class="amount">
                            {{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $item['nominal'])) }}</td>
                        @if ($allowActions)
                            <td>
                                <div class="row-actions"><a class="icon-button"
                                        href="{{ route('expenses.edit', $item['id_transaction']) }}"
                                        aria-label="Edit transaksi {{ $item['catatan'] }}"><x-icon name="edit" /></a>
                                    <form method="post"
                                        action="{{ route('expenses.destroy', $item['id_transaction']) }}" data-confirm>
                                        @csrf @method('DELETE')<button class="icon-button" type="submit"
                                            aria-label="Hapus transaksi {{ $item['catatan'] }}"><x-icon
                                                name="trash" /></button></form>
                                </div>
                            </td>
                        @endif
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    <div class="expense-cards">
        @foreach ($items as $item)
            <article class="expense-card"><span class="expense-card-icon"><x-icon name="receipt" /></span>
                <div class="expense-card-main">
                    <h3>{{ $item['catatan'] ?: 'Tanpa catatan' }}</h3><span
                        class="transaction-type {{ $item['type'] === 'income' ? 'income-tag' : 'expense-tag' }}">{{ $item['type'] === 'income' ? 'Pemasukan' : 'Pengeluaran' }}</span>
                    <p>{{ $item['category']['name'] ?? 'Tanpa kategori' }} <span>·</span>
                        {{ \Carbon\CarbonImmutable::parse($item['createdAt'])->timezone(config('app.timezone'))->locale('id')->translatedFormat('d M') }}
                    </p>
                    <strong>{{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $item['nominal'])) }}</strong>
                    @if ($allowActions)
                        <div class="mobile-row-actions"><a class="text-action"
                                href="{{ route('expenses.edit', $item['id_transaction']) }}"><x-icon
                                    name="edit" />Edit</a>
                            <form method="post" action="{{ route('expenses.destroy', $item['id_transaction']) }}"
                                data-confirm>@csrf @method('DELETE')<button class="text-action danger-text"
                                    type="submit"><x-icon name="trash" />Hapus</button></form>
                        </div>
                    @endif
                </div>
            </article>
        @endforeach
    </div>
@else<x-empty-state title="Belum ada catatan"
        description="Coba periode atau filter lain, atau catat transaksi pertama Anda." /><a class="button empty-action"
        href="{{ route('expenses.create') }}"><x-icon name="plus" />Catat
        transaksi</a>
@endif
