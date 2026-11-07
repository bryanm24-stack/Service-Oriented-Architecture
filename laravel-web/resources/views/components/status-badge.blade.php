@props(['status'])
@php
    [$label, $tone] = match($status) {
        'active' => ['Aktif', 'success'],
        'inactive' => ['Nonaktif', 'neutral'],
        'archived' => ['Arsip', 'neutral'],
        'pending' => ['Pending · belum dibayar', 'warning'],
        'paid' => ['Paid · pembayaran terverifikasi', 'success'],
        'failed' => ['Gagal', 'danger'],
        'cancelled' => ['Dibatalkan', 'neutral'],
        'expired' => ['Kedaluwarsa', 'neutral'],
        default => ['Belum tersedia', 'neutral'],
    };
@endphp
<span class="status-badge status-{{ $tone }}">{{ $label }}</span>
