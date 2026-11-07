@if($paginator->hasPages())
<nav class="pagination" aria-label="Halaman {{ $label }}">
    <span>{{ $paginator->firstItem() }}–{{ $paginator->lastItem() }} dari {{ $paginator->total() }}</span>
    <div class="row-actions">
        @if($paginator->previousPageUrl())<a class="button secondary compact-button" href="{{ $paginator->previousPageUrl() }}" rel="prev">Sebelumnya</a>@endif
        @if($paginator->nextPageUrl())<a class="button secondary compact-button" href="{{ $paginator->nextPageUrl() }}" rel="next">Berikutnya</a>@endif
    </div>
</nav>
@endif
