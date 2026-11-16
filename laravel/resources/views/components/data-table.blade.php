@props(['columns', 'caption', 'empty' => false, 'emptyTitle' => 'Belum ada data', 'emptyDescription' => 'Data akan tampil setelah ditambahkan.'])
@if($empty)
    <x-empty-state :title="$emptyTitle" :description="$emptyDescription" />
@else
    <div class="data-table-scroll" role="region" aria-label="{{ $caption }}" tabindex="0">
        <table class="data-table">
            <caption class="sr-only">{{ $caption }}</caption>
            <thead><tr>@foreach($columns as $column)<th scope="col">{{ $column }}</th>@endforeach</tr></thead>
            <tbody>{{ $slot }}</tbody>
        </table>
    </div>
    <p class="table-hint muted small">Pada layar kecil, geser tabel untuk melihat seluruh kolom.</p>
@endif
