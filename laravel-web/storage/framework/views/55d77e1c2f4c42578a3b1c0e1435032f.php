<?php $__env->startSection('title', 'Wish / Cicilan'); ?>
<?php $__env->startSection('content'); ?>
    <div class="page-heading">
        <div>
            <p class="eyebrow">Rencana pembelian</p>
            <h1>Wish / Cicilan</h1>
            <p class="subtitle">Rencanakan pembelian secara cash atau cicilan, lalu pantau jadwal pembayarannya.</p>
        </div>
        <a class="button" href="<?php echo e(route('wishes.create')); ?>"><?php if (isset($component)) { $__componentOriginalce262628e3a8d44dc38fd1f3965181bc = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginalce262628e3a8d44dc38fd1f3965181bc = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.icon','data' => ['name' => 'plus']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('icon'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['name' => 'plus']); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginalce262628e3a8d44dc38fd1f3965181bc)): ?>
<?php $attributes = $__attributesOriginalce262628e3a8d44dc38fd1f3965181bc; ?>
<?php unset($__attributesOriginalce262628e3a8d44dc38fd1f3965181bc); ?>
<?php endif; ?>
<?php if (isset($__componentOriginalce262628e3a8d44dc38fd1f3965181bc)): ?>
<?php $component = $__componentOriginalce262628e3a8d44dc38fd1f3965181bc; ?>
<?php unset($__componentOriginalce262628e3a8d44dc38fd1f3965181bc); ?>
<?php endif; ?>Tambah Wish</a>
    </div>

    <?php
        $totalPlanned = $wishes->where('status', 'planned')->count();
        $totalPaid = $wishes->where('status', 'paid')->count();
        $totalValue = $wishes->sum(fn ($wish) => (float) ($wish['price'] ?? 0));
    ?>
    <div class="cash-flow-grid">
        <section class="panel metric"><p class="muted small">Total rencana</p><strong><?php echo e($wishes->count()); ?></strong><span class="small muted">Wish tersimpan</span></section>
        <section class="panel metric"><p class="muted small">Belum lunas</p><strong class="expense-value"><?php echo e($totalPlanned); ?></strong><span class="small muted">Status Planned</span></section>
        <section class="panel metric"><p class="muted small">Sudah lunas</p><strong class="income-value"><?php echo e($totalPaid); ?></strong><span class="small muted">Status Paid</span></section>
    </div>

    <section class="panel">
        <div class="section-heading"><div><h2>Daftar wishlist</h2><p class="muted small">Total nilai rencana <?php echo e(\App\Support\Money::rupiah(\App\Support\Money::cents((string) $totalValue))); ?></p></div></div>
        <?php $__empty_1 = true; $__currentLoopData = $wishes; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $wish): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
            <article class="panel" style="margin-bottom:16px">
                <div class="section-heading">
                    <div>
                        <h2><?php echo e($wish['name']); ?></h2>
                        <p class="muted small"><?php echo e($wish['payment_method'] === 'cash' ? 'Pembayaran cash' : 'Pembayaran cicilan'); ?> · Dibuat <?php echo e(\Carbon\CarbonImmutable::parse($wish['createdAt'])->locale('id')->translatedFormat('d M Y')); ?></p>
                    </div>
                    <span class="transaction-type <?php echo e($wish['status'] === 'paid' ? 'income-tag' : 'expense-tag'); ?>"><?php echo e($wish['status'] === 'paid' ? 'Paid' : 'Planned'); ?></span>
                </div>
                <div class="cash-flow-grid">
                    <div><p class="muted small">Harga barang</p><strong><?php echo e(\App\Support\Money::rupiah(\App\Support\Money::cents((string) $wish['price']))); ?></strong></div>
                    <?php if($wish['payment_method'] === 'installment'): ?>
                        <div><p class="muted small">Uang muka</p><strong><?php echo e(\App\Support\Money::rupiah(\App\Support\Money::cents((string) $wish['down_payment']))); ?></strong></div>
                        <div><p class="muted small">Tenor</p><strong><?php echo e($wish['tenor_months']); ?> bulan</strong></div>
                    <?php endif; ?>
                </div>
                <?php if($wish['payment_method'] === 'installment'): ?>
                    <div class="table-scroll" style="margin-top:16px">
                        <table class="expense-table">
                            <thead><tr><th>Periode</th><th>Jatuh tempo</th><th>Nominal</th><th>Status</th><th>Aksi</th></tr></thead>
                            <tbody>
                                <?php $__currentLoopData = ($wish['installment_schedules'] ?? []); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $schedule): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td>Cicilan <?php echo e($schedule['period_number']); ?></td>
                                        <td><?php echo e(\Carbon\CarbonImmutable::parse($schedule['due_date'])->locale('id')->translatedFormat('d M Y')); ?></td>
                                        <td><?php echo e(\App\Support\Money::rupiah(\App\Support\Money::cents((string) $schedule['amount_snapshot']))); ?></td>
                                        <td><span class="transaction-type <?php echo e($schedule['status'] === 'paid' ? 'income-tag' : 'expense-tag'); ?>"><?php echo e($schedule['status'] === 'paid' ? 'Paid' : 'Planned'); ?></span></td>
                                        <td>
                                            <?php if($schedule['status'] === 'planned'): ?>
                                                <form method="post" action="<?php echo e(route('wishes.installments.pay', [$wish['id_wish'], $schedule['id_installment']])); ?>" data-mutation>
                                                    <?php echo csrf_field(); ?><button class="button secondary compact-button" type="submit">Bayar</button>
                                                </form>
                                            <?php else: ?>
                                                <span class="muted small">Transaksi #<?php echo e($schedule['transaction_id']); ?></span>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                            </tbody>
                        </table>
                    </div>
                <?php else: ?>
                    <?php if($wish['status'] === 'planned'): ?>
                        <form method="post" action="<?php echo e(route('wishes.pay', $wish['id_wish'])); ?>" style="margin-top:16px" data-mutation>
                            <?php echo csrf_field(); ?><button class="button" type="submit"><?php if (isset($component)) { $__componentOriginalce262628e3a8d44dc38fd1f3965181bc = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginalce262628e3a8d44dc38fd1f3965181bc = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.icon','data' => ['name' => 'check']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('icon'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['name' => 'check']); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginalce262628e3a8d44dc38fd1f3965181bc)): ?>
<?php $attributes = $__attributesOriginalce262628e3a8d44dc38fd1f3965181bc; ?>
<?php unset($__attributesOriginalce262628e3a8d44dc38fd1f3965181bc); ?>
<?php endif; ?>
<?php if (isset($__componentOriginalce262628e3a8d44dc38fd1f3965181bc)): ?>
<?php $component = $__componentOriginalce262628e3a8d44dc38fd1f3965181bc; ?>
<?php unset($__componentOriginalce262628e3a8d44dc38fd1f3965181bc); ?>
<?php endif; ?>Bayar cash</button>
                        </form>
                    <?php elseif(!empty($wish['paid_transaction_id'])): ?>
                        <p class="muted small">Transaksi pembayaran #<?php echo e($wish['paid_transaction_id']); ?></p>
                    <?php endif; ?>
                <?php endif; ?>
                <div class="row-actions" style="margin-top:14px">
                    <?php if($wish['status'] === 'planned' && collect($wish['installment_schedules'] ?? [])->where('status', 'paid')->isEmpty()): ?>
                        <a class="button secondary compact-button" href="<?php echo e(route('wishes.edit', $wish['id_wish'])); ?>"><?php if (isset($component)) { $__componentOriginalce262628e3a8d44dc38fd1f3965181bc = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginalce262628e3a8d44dc38fd1f3965181bc = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.icon','data' => ['name' => 'edit']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('icon'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['name' => 'edit']); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginalce262628e3a8d44dc38fd1f3965181bc)): ?>
<?php $attributes = $__attributesOriginalce262628e3a8d44dc38fd1f3965181bc; ?>
<?php unset($__attributesOriginalce262628e3a8d44dc38fd1f3965181bc); ?>
<?php endif; ?>
<?php if (isset($__componentOriginalce262628e3a8d44dc38fd1f3965181bc)): ?>
<?php $component = $__componentOriginalce262628e3a8d44dc38fd1f3965181bc; ?>
<?php unset($__componentOriginalce262628e3a8d44dc38fd1f3965181bc); ?>
<?php endif; ?>Edit</a>
                        <form method="post" action="<?php echo e(route('wishes.destroy', $wish['id_wish'])); ?>" data-confirm>
                            <?php echo csrf_field(); ?> <?php echo method_field('DELETE'); ?><button class="button secondary compact-button" type="submit"><?php if (isset($component)) { $__componentOriginalce262628e3a8d44dc38fd1f3965181bc = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginalce262628e3a8d44dc38fd1f3965181bc = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.icon','data' => ['name' => 'trash']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('icon'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['name' => 'trash']); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginalce262628e3a8d44dc38fd1f3965181bc)): ?>
<?php $attributes = $__attributesOriginalce262628e3a8d44dc38fd1f3965181bc; ?>
<?php unset($__attributesOriginalce262628e3a8d44dc38fd1f3965181bc); ?>
<?php endif; ?>
<?php if (isset($__componentOriginalce262628e3a8d44dc38fd1f3965181bc)): ?>
<?php $component = $__componentOriginalce262628e3a8d44dc38fd1f3965181bc; ?>
<?php unset($__componentOriginalce262628e3a8d44dc38fd1f3965181bc); ?>
<?php endif; ?>Hapus</button>
                        </form>
                    <?php endif; ?>
                </div>
            </article>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
            <?php if (isset($component)) { $__componentOriginal074a021b9d42f490272b5eefda63257c = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal074a021b9d42f490272b5eefda63257c = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.empty-state','data' => ['title' => 'Belum ada wishlist','description' => 'Tambahkan barang yang ingin dibeli dan tentukan metode pembayaran cash atau cicilan.']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('empty-state'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['title' => 'Belum ada wishlist','description' => 'Tambahkan barang yang ingin dibeli dan tentukan metode pembayaran cash atau cicilan.']); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginal074a021b9d42f490272b5eefda63257c)): ?>
<?php $attributes = $__attributesOriginal074a021b9d42f490272b5eefda63257c; ?>
<?php unset($__attributesOriginal074a021b9d42f490272b5eefda63257c); ?>
<?php endif; ?>
<?php if (isset($__componentOriginal074a021b9d42f490272b5eefda63257c)): ?>
<?php $component = $__componentOriginal074a021b9d42f490272b5eefda63257c; ?>
<?php unset($__componentOriginal074a021b9d42f490272b5eefda63257c); ?>
<?php endif; ?>
            <a class="button empty-action" href="<?php echo e(route('wishes.create')); ?>"><?php if (isset($component)) { $__componentOriginalce262628e3a8d44dc38fd1f3965181bc = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginalce262628e3a8d44dc38fd1f3965181bc = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.icon','data' => ['name' => 'plus']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('icon'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['name' => 'plus']); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginalce262628e3a8d44dc38fd1f3965181bc)): ?>
<?php $attributes = $__attributesOriginalce262628e3a8d44dc38fd1f3965181bc; ?>
<?php unset($__attributesOriginalce262628e3a8d44dc38fd1f3965181bc); ?>
<?php endif; ?>
<?php if (isset($__componentOriginalce262628e3a8d44dc38fd1f3965181bc)): ?>
<?php $component = $__componentOriginalce262628e3a8d44dc38fd1f3965181bc; ?>
<?php unset($__componentOriginalce262628e3a8d44dc38fd1f3965181bc); ?>
<?php endif; ?>Buat Wish pertama</a>
        <?php endif; ?>
    </section>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH C:\Users\Dana\Documents\Istts semester 5\Arsitektur Berbasis Layanan\Service-Oriented-Architecture\laravel-web\resources\views/wishes/index.blade.php ENDPATH**/ ?>