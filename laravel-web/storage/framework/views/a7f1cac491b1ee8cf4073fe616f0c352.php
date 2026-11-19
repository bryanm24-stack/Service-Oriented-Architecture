<div class="cash-flow-grid">
    <?php $__currentLoopData = ['income' => ['Pemasukan', 'income-value'], 'expense' => ['Pengeluaran', 'expense-value'], 'difference' => ['Selisih tercatat', '']]; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <section class="panel metric">
            <p class="muted small"><?php echo e($item[0]); ?></p><strong
                class="<?php echo e($item[1]); ?>"><?php echo e(\App\Support\Money::rupiah(\App\Support\Money::cents((string) $summary[$key]))); ?></strong><span
                class="small muted"><?php echo e($key === 'difference' ? 'Pemasukan dikurangi pengeluaran' : 'Sesuai periode dan filter'); ?></span>
        </section>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
</div>
<p class="cash-flow-caption">Arus kas tercatat · <?php echo e($summary['total_transactions']); ?> transaksi. Selisih ini bukan saldo
    rekening bank.</p>
<?php /**PATH C:\Users\Dana\Documents\Istts semester 5\Arsitektur Berbasis Layanan\Service-Oriented-Architecture\laravel-web\resources\views/partials/cash-flow.blade.php ENDPATH**/ ?>