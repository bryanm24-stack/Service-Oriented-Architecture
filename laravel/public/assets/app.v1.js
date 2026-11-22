(() => {
    'use strict';
    let installPrompt = null;
    let pendingDelete = null;
    const confirmDialog = document.getElementById('confirm-dialog');
    const installDialog = document.getElementById('install-dialog');
    const offlineBanner = document.querySelector('[data-offline]');

    const showConnection = () => {
        if (offlineBanner) offlineBanner.hidden = navigator.onLine;
    };
    addEventListener('online', showConnection);
    addEventListener('offline', showConnection);
    showConnection();

    document.addEventListener('submit', (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() === 'get') return;
        if (!navigator.onLine) {
            event.preventDefault();
            showConnection();
            offlineBanner?.scrollIntoView({ block: 'center' });
            return;
        }
        if (form.hasAttribute('data-confirm') && !form.hasAttribute('data-confirmed')) {
            event.preventDefault();
            pendingDelete = form;
            if (confirmDialog) {
                confirmDialog.querySelector('#confirm-title').textContent = form.dataset.confirmTitle || 'Hapus transaksi?';
                confirmDialog.querySelector('[data-confirm-description]').textContent = form.dataset.confirmDescription || 'Catatan ini akan dihapus dari daftar transaksi Anda.';
                confirmDialog.querySelector('[data-confirm-delete]').textContent = form.dataset.confirmLabel || 'Ya, hapus';
            }
            if (confirmDialog) confirmDialog.showModal();
            return;
        }
        form.querySelectorAll('button[type="submit"]').forEach((button) => {
            button.disabled = true;
            button.dataset.submitting = 'true';
        });
    });
    document.querySelector('[data-confirm-delete]')?.addEventListener('click', () => {
        const form = pendingDelete;
        confirmDialog?.close();
        pendingDelete = null;
        if (form) {
            form.setAttribute('data-confirmed', 'true');
            form.requestSubmit();
        }
    });
    confirmDialog?.addEventListener('close', () => {
        pendingDelete = null;
    });
    document.querySelectorAll('[data-close-dialog]').forEach((button) => {
        button.addEventListener('click', () => button.closest('dialog')?.close());
    });
    addEventListener('pageshow', () => {
        document.querySelectorAll('[data-submitting]').forEach((button) => {
            button.disabled = false;
            delete button.dataset.submitting;
        });
        document
            .querySelectorAll('[data-confirmed]')
            .forEach((form) => form.removeAttribute('data-confirmed'));
    });

    addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        installPrompt = event;
    });
    document.querySelectorAll('[data-install]').forEach((button) => {
        button.addEventListener('click', async () => {
            if (installPrompt) {
                await installPrompt.prompt();
                await installPrompt.userChoice;
                installPrompt = null;
            } else if (installDialog) {
                installDialog.showModal();
            }
        });
    });
    const installed =
        matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (installed) {
        document.querySelectorAll('[data-install]').forEach((button) => {
            button.hidden = true;
        });
        document.querySelectorAll('[data-installed]').forEach((element) => {
            element.hidden = false;
        });
    }
    if ('serviceWorker' in navigator && isSecureContext) {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // The application remains usable online if offline installation fails.
        });
    }
})();

(() => {
 const method=document.getElementById('payment_method');
 const fields=document.getElementById('installment-fields');
 if(method&&fields){const sync=()=>{const enabled=method.value==='installment';fields.hidden=!enabled;for(const id of ['down_payment','tenor_value','tenor_type']){const el=document.getElementById(id);el.disabled=!enabled;if(id!=='tenor_type')el.required=enabled;}};method.addEventListener('change',sync);sync();}
 const button=document.getElementById('preview-button'),form=document.getElementById('recurring-form');
 if(button&&form)button.addEventListener('click',async()=>{
  const panel=document.getElementById('preview-panel'),result=document.getElementById('preview-results');panel.hidden=false;result.textContent='Memuat preview...';
  const values=Object.fromEntries(new FormData(form));delete values._method;delete values._token;
  try{const response=await fetch(form.dataset.previewUrl,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRF-TOKEN':form.querySelector('[name="_token"]').value},body:JSON.stringify(values)});const body=await response.json();if(!response.ok)throw Error('Isian belum valid');result.textContent='';for(const row of body.data){const item=document.createElement('p');item.textContent=row.due_date+' · Rp '+row.amount_snapshot;result.append(item);}}
  catch{result.textContent='Preview belum tersedia. Periksa isian dan koneksi.';}
 });
})();
