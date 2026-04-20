/**
 * modals.js — shared modal helpers using Bootstrap 5
 */

/**
 * showModal(title, bodyHtml, onSubmit)
 * Creates and shows a Bootstrap modal dynamically.
 * onSubmit(formData) is called when the form is submitted.
 * Returns the modal instance.
 */
function showModal(title, bodyHtml, onSubmit) {
    // Remove any existing dynamic modal
    const existing = document.getElementById('dynamic-modal');
    if (existing) existing.remove();

    const modalEl = document.createElement('div');
    modalEl.className = 'modal fade';
    modalEl.id = 'dynamic-modal';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-labelledby', 'dynamic-modal-label');
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="dynamic-modal-label">${escapeHtml(title)}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="dynamic-modal-form" novalidate>
                        ${bodyHtml}
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" form="dynamic-modal-form" class="btn btn-primary" id="dynamic-modal-submit">Save</button>
                </div>
            </div>
        </div>
    `;

    const container = document.getElementById('modal-container');
    container.appendChild(modalEl);

    const modal = new bootstrap.Modal(modalEl);

    const form = modalEl.querySelector('#dynamic-modal-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = modalEl.querySelector('#dynamic-modal-submit');
        submitBtn.disabled = true;
        try {
            const formData = new FormData(form);
            const success = await onSubmit(formData);
            if (success !== false) {
                modal.hide();
            }
        } finally {
            submitBtn.disabled = false;
        }
    });

    // Clean up after hidden
    modalEl.addEventListener('hidden.bs.modal', () => {
        modalEl.remove();
    });

    modal.show();
    return modal;
}

/**
 * showConfirmModal(title, message, onConfirm)
 * Simple confirm/cancel modal.
 */
function showConfirmModal(title, message, onConfirm) {
    const existing = document.getElementById('confirm-modal');
    if (existing) existing.remove();

    const modalEl = document.createElement('div');
    modalEl.className = 'modal fade';
    modalEl.id = 'confirm-modal';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-labelledby', 'confirm-modal-label');
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="confirm-modal-label">${escapeHtml(title)}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">${message}</div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirm-modal-ok">Confirm</button>
                </div>
            </div>
        </div>
    `;

    const container = document.getElementById('modal-container');
    container.appendChild(modalEl);

    const modal = new bootstrap.Modal(modalEl);

    modalEl.querySelector('#confirm-modal-ok').addEventListener('click', async () => {
        const btn = modalEl.querySelector('#confirm-modal-ok');
        btn.disabled = true;
        try {
            await onConfirm();
            modal.hide();
        } finally {
            btn.disabled = false;
        }
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
        modalEl.remove();
    });

    modal.show();
    return modal;
}

/**
 * showToast(message, type='success')
 * Creates a Bootstrap toast in #toast-container and auto-hides after 2500ms.
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${type} border-0 mb-2`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${escapeHtml(message)}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 2500 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

/**
 * escapeHtml(str) — basic XSS prevention
 */
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
