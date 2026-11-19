<?php $attributes ??= new \Illuminate\View\ComponentAttributeBag;

$__newAttributes = [];
$__propNames = \Illuminate\View\ComponentAttributeBag::extractPropNames((['name']));

foreach ($attributes->all() as $__key => $__value) {
    if (in_array($__key, $__propNames)) {
        $$__key = $$__key ?? $__value;
    } else {
        $__newAttributes[$__key] = $__value;
    }
}

$attributes = new \Illuminate\View\ComponentAttributeBag($__newAttributes);

unset($__propNames);
unset($__newAttributes);

foreach (array_filter((['name']), 'is_string', ARRAY_FILTER_USE_KEY) as $__key => $__value) {
    $$__key = $$__key ?? $__value;
}

$__defined_vars = get_defined_vars();

foreach ($attributes->all() as $__key => $__value) {
    if (array_key_exists($__key, $__defined_vars)) unset($$__key);
}

unset($__defined_vars, $__key, $__value); ?>
<svg <?php echo e($attributes->merge(['class' => 'icon'])); ?> viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <?php switch($name):
        case ('wallet'): ?>
            <path d="M20 8V5a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14v11H6a3 3 0 0 1-3-3V6" />
            <path d="M20 12h-5v5h5M17 14.5h.01" />
        <?php break; ?>

        <?php case ('home'): ?>
            <path d="m3 10 9-7 9 7v10H3Z" />
            <path d="M9 20v-7h6v7" />
        <?php break; ?>

        <?php case ('receipt'): ?>
            <path d="M5 3h14v18l-3-2-4 2-4-2-3 2Z" />
            <path d="M9 8h6M9 12h6" />
        <?php break; ?>

        <?php case ('chart'): ?>
            <path d="M12 3a9 9 0 1 0 9 9h-9Z" />
            <path d="M16 3.9A9 9 0 0 1 20.1 8H16Z" />
        <?php break; ?>

        <?php case ('grid'): ?>
            <rect x="3" y="3" width="7" height="7" rx="2" />
            <rect x="14" y="3" width="7" height="7" rx="2" />
            <rect x="3" y="14" width="7" height="7" rx="2" />
            <rect x="14" y="14" width="7" height="7" rx="2" />
        <?php break; ?>

        <?php case ('phone'): ?>
            <rect x="6" y="2" width="12" height="20" rx="3" />
            <path d="M10 18h4" />
        <?php break; ?>

        <?php case ('plus'): ?>
            <path d="M12 5v14M5 12h14" />
        <?php break; ?>

        <?php case ('arrow'): ?>
            <path d="M5 12h14m-5-5 5 5-5 5" />
        <?php break; ?>

        <?php case ('left'): ?>
            <path d="m14 6-6 6 6 6" />
        <?php break; ?>

        <?php case ('right'): ?>
            <path d="m10 6 6 6-6 6" />
        <?php break; ?>

        <?php case ('check'): ?>
            <path d="m5 12 4 4L19 6" />
        <?php break; ?>

        <?php case ('filter'): ?>
            <path d="M4 6h16M7 12h10M10 18h4" />
        <?php break; ?>

        <?php case ('shield'): ?>
            <path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6Z" />
            <path d="m8 12 3 3 5-5" />
        <?php break; ?>

        <?php case ('info'): ?>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6M12 7h.01" />
        <?php break; ?>

        <?php case ('offline'): ?>
            <path
                d="m3 3 18 18M2 8a17 17 0 0 1 3-2m5-1a17 17 0 0 1 12 3M5 12a12 12 0 0 1 4-2m6 0a12 12 0 0 1 4 2M8 16a7 7 0 0 1 8 0M12 20h.01" />
        <?php break; ?>

        <?php case ('sparkle'): ?>
            <path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3Z" />
        <?php break; ?>

        <?php case ('search'): ?>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
        <?php break; ?>

        <?php case ('edit'): ?>
            <path d="m14 5 5 5M4 20l5-1L20 8a3.5 3.5 0 0 0-5-5L4 14Z" />
        <?php break; ?>

        <?php case ('trash'): ?>
            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
        <?php break; ?>

        <?php case ('download'): ?>
            <path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" />
        <?php break; ?>

        <?php default: ?>
            <circle cx="12" cy="12" r="8" />
    <?php endswitch; ?>
</svg>
<?php /**PATH C:\Users\Dana\Documents\Istts semester 5\Arsitektur Berbasis Layanan\Service-Oriented-Architecture\laravel-web\resources\views/components/icon.blade.php ENDPATH**/ ?>