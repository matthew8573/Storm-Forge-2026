/**
 * manage.js — Manage pages logic (Drivers, Restaurants, Prices)
 */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.toLowerCase();

    if (path.includes('/manage/drivers')) {
        initDriversPage();
    } else if (path.includes('/manage/restaurants')) {
        initRestaurantsPage();
    } else if (path.includes('/manage/prices')) {
        initPricesPage();
    }
});

// ════════════════════════════════════════════════════════════════════════════
// DRIVERS PAGE
// ════════════════════════════════════════════════════════════════════════════
async function initDriversPage() {
    await loadDrivers();

    document.getElementById('add-btn').addEventListener('click', () => {
        openAddEditDriverModal(null);
    });
}

async function loadDrivers() {
    try {
        const drivers = await fetchJson('/api/v1/drivers?include_inactive=true');
        renderList(drivers, renderDriverRow);
    } catch {
        showToast('Failed to load drivers.', 'danger');
    }
}

function renderDriverRow(driver) {
    const tr = document.createElement('tr');
    const statusBadge = driver.is_active
        ? `<span class="badge bg-success status-badge" style="cursor:pointer;" title="Click to deactivate">Active</span>`
        : `<span class="badge bg-secondary status-badge" style="cursor:pointer;" title="Click to activate">Inactive</span>`;

    tr.innerHTML = `
        <td class="align-middle fw-medium">${escapeHtml(driver.name)}</td>
        <td class="align-middle text-muted">${escapeHtml(driver.phone || '—')}</td>
        <td class="align-middle">${statusBadge}</td>
        <td class="align-middle text-end">
            <button class="btn btn-sm btn-outline-primary me-1 edit-btn">Edit</button>
            <button class="btn btn-sm btn-outline-danger delete-btn">Delete</button>
        </td>
    `;

    tr.querySelector('.edit-btn').addEventListener('click', () => openAddEditDriverModal(driver));
    tr.querySelector('.delete-btn').addEventListener('click', () => confirmDeleteDriver(driver));
    tr.querySelector('.status-badge').addEventListener('click', () => toggleDriverStatus(driver));

    return tr;
}

function openAddEditDriverModal(driver) {
    const isEdit = driver != null;
    const bodyHtml = `
        <div class="mb-3">
            <label class="form-label">Name <span class="text-danger">*</span></label>
            <input type="text" name="name" class="form-control" value="${isEdit ? escapeHtml(driver.name) : ''}" required />
        </div>
        <div class="mb-3">
            <label class="form-label">Phone</label>
            <input type="tel" name="phone" class="form-control" value="${isEdit ? escapeHtml(driver.phone || '') : ''}" />
        </div>
    `;
    showModal(isEdit ? 'Edit Driver' : 'Add Driver', bodyHtml, async (formData) => {
        const name = formData.get('name')?.trim();
        if (!name) { showToast('Name is required.', 'warning'); return false; }

        const body = { name, phone: formData.get('phone') || null };
        const url = isEdit ? `/api/v1/drivers/${driver.driver_id}` : '/api/v1/drivers';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const resp = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!resp.ok) throw new Error('Failed');
            showToast(isEdit ? 'Driver updated!' : 'Driver added!', 'success');
            await loadDrivers();
            return true;
        } catch {
            showToast('Failed to save driver.', 'danger');
            return false;
        }
    });
}

function confirmDeleteDriver(driver) {
    showConfirmModal(
        'Delete Driver',
        `Are you sure you want to delete <strong>${escapeHtml(driver.name)}</strong>?`,
        async () => {
            try {
                const resp = await fetch(`/api/v1/drivers/${driver.driver_id}`, { method: 'DELETE' });
                if (resp.status === 409) {
                    // Cannot delete — offer deactivate
                    showConfirmModal(
                        'Cannot Delete Driver',
                        `<strong>${escapeHtml(driver.name)}</strong> has existing orders and cannot be deleted. Deactivate instead?`,
                        async () => {
                            await toggleDriverStatus(driver, false);
                        }
                    );
                } else if (!resp.ok) {
                    throw new Error('Failed');
                } else {
                    showToast('Driver deleted.', 'success');
                    await loadDrivers();
                }
            } catch {
                showToast('Failed to delete driver.', 'danger');
            }
        }
    );
}

async function toggleDriverStatus(driver, forceInactive) {
    const newActive = forceInactive !== undefined ? !forceInactive : !driver.is_active;
    try {
        const resp = await fetch(`/api/v1/drivers/${driver.driver_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: driver.name, phone: driver.phone, is_active: newActive }),
        });
        if (!resp.ok) throw new Error('Failed');
        showToast(`Driver ${newActive ? 'activated' : 'deactivated'}.`, 'success');
        await loadDrivers();
    } catch {
        showToast('Failed to update driver status.', 'danger');
    }
}

// ════════════════════════════════════════════════════════════════════════════
// RESTAURANTS PAGE
// ════════════════════════════════════════════════════════════════════════════
async function initRestaurantsPage() {
    await loadRestaurants();

    document.getElementById('add-btn').addEventListener('click', () => {
        openAddEditRestaurantModal(null);
    });
}

async function loadRestaurants() {
    try {
        const restaurants = await fetchJson('/api/v1/restaurants?include_inactive=true');
        renderList(restaurants, renderRestaurantRow);
    } catch {
        showToast('Failed to load restaurants.', 'danger');
    }
}

function renderRestaurantRow(restaurant) {
    const tr = document.createElement('tr');
    const statusBadge = restaurant.is_active
        ? `<span class="badge bg-success status-badge" style="cursor:pointer;" title="Click to deactivate">Active</span>`
        : `<span class="badge bg-secondary status-badge" style="cursor:pointer;" title="Click to activate">Inactive</span>`;
    const priceText = restaurant.price_per_kg > 0 ? `₽${Number(restaurant.price_per_kg).toFixed(0)}` : '<span class="text-muted">—</span>';

    tr.innerHTML = `
        <td class="align-middle fw-medium">${escapeHtml(restaurant.name)}</td>
        <td class="align-middle text-muted">${escapeHtml(restaurant.phone || '—')}</td>
        <td class="align-middle">${priceText}</td>
        <td class="align-middle">${statusBadge}</td>
        <td class="align-middle text-end">
            <button class="btn btn-sm btn-outline-primary me-1 edit-btn">Edit</button>
            <button class="btn btn-sm btn-outline-danger delete-btn">Delete</button>
        </td>
    `;

    tr.querySelector('.edit-btn').addEventListener('click', () => openAddEditRestaurantModal(restaurant));
    tr.querySelector('.delete-btn').addEventListener('click', () => confirmDeleteRestaurant(restaurant));
    tr.querySelector('.status-badge').addEventListener('click', () => toggleRestaurantStatus(restaurant));

    return tr;
}

function openAddEditRestaurantModal(restaurant) {
    const isEdit = restaurant != null;
    const bodyHtml = `
        <div class="mb-3">
            <label class="form-label">Name <span class="text-danger">*</span></label>
            <input type="text" name="name" class="form-control" value="${isEdit ? escapeHtml(restaurant.name) : ''}" required />
        </div>
        <div class="mb-3">
            <label class="form-label">Address</label>
            <input type="text" name="address" class="form-control" value="${isEdit ? escapeHtml(restaurant.address || '') : ''}" />
        </div>
        <div class="mb-3">
            <label class="form-label">Phone</label>
            <input type="tel" name="phone" class="form-control" value="${isEdit ? escapeHtml(restaurant.phone || '') : ''}" />
        </div>
    `;
    showModal(isEdit ? 'Edit Restaurant' : 'Add Restaurant', bodyHtml, async (formData) => {
        const name = formData.get('name')?.trim();
        if (!name) { showToast('Name is required.', 'warning'); return false; }

        const body = {
            name,
            address: formData.get('address') || null,
            phone: formData.get('phone') || null,
        };
        const url = isEdit ? `/api/v1/restaurants/${restaurant.restaurant_id}` : '/api/v1/restaurants';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const resp = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!resp.ok) throw new Error('Failed');
            showToast(isEdit ? 'Restaurant updated!' : 'Restaurant added!', 'success');
            await loadRestaurants();
            return true;
        } catch {
            showToast('Failed to save restaurant.', 'danger');
            return false;
        }
    });
}

function confirmDeleteRestaurant(restaurant) {
    showConfirmModal(
        'Delete Restaurant',
        `Are you sure you want to delete <strong>${escapeHtml(restaurant.name)}</strong>?`,
        async () => {
            try {
                const resp = await fetch(`/api/v1/restaurants/${restaurant.restaurant_id}`, { method: 'DELETE' });
                if (resp.status === 409) {
                    showConfirmModal(
                        'Cannot Delete Restaurant',
                        `<strong>${escapeHtml(restaurant.name)}</strong> has existing orders and cannot be deleted. Deactivate instead?`,
                        async () => {
                            await toggleRestaurantStatus(restaurant, false);
                        }
                    );
                } else if (!resp.ok) {
                    throw new Error('Failed');
                } else {
                    showToast('Restaurant deleted.', 'success');
                    await loadRestaurants();
                }
            } catch {
                showToast('Failed to delete restaurant.', 'danger');
            }
        }
    );
}

async function toggleRestaurantStatus(restaurant, forceInactive) {
    const newActive = forceInactive !== undefined ? !forceInactive : !restaurant.is_active;
    try {
        const resp = await fetch(`/api/v1/restaurants/${restaurant.restaurant_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: restaurant.name,
                address: restaurant.address,
                phone: restaurant.phone,
                is_active: newActive,
            }),
        });
        if (!resp.ok) throw new Error('Failed');
        showToast(`Restaurant ${newActive ? 'activated' : 'deactivated'}.`, 'success');
        await loadRestaurants();
    } catch {
        showToast('Failed to update restaurant status.', 'danger');
    }
}

// ════════════════════════════════════════════════════════════════════════════
// PRICES PAGE
// ════════════════════════════════════════════════════════════════════════════
async function initPricesPage() {
    try {
        const products = await fetchJson('/api/v1/products');
        const container = document.getElementById('prices-container');
        container.innerHTML = '';

        const today = new Date().toISOString().slice(0, 10);

        for (const product of (products || [])) {
            const section = document.createElement('div');
            section.className = 'card mb-4';

            // Fetch effective price and history in parallel
            const [effectivePrice, priceHistory] = await Promise.all([
                fetchJson(`/api/v1/products/${product.product_id}/prices/effective?date=${today}`).catch(() => null),
                fetchJson(`/api/v1/products/${product.product_id}/prices`).catch(() => []),
            ]);

            const currentPriceText = effectivePrice && effectivePrice.unit_price != null
                ? `$${Number(effectivePrice.unit_price).toFixed(4)}/kg`
                : 'No price set';

            section.innerHTML = `
                <div class="card-header d-flex justify-content-between align-items-center">
                    <strong>${escapeHtml(product.name)}</strong>
                    <span>Current: <strong>${escapeHtml(currentPriceText)}</strong></span>
                    <button class="btn btn-sm btn-success add-price-btn" data-product-id="${product.product_id}" data-product-name="${escapeHtml(product.name)}">Add Price</button>
                </div>
                <div class="card-body">
                    <button class="btn btn-sm btn-outline-secondary mb-2 toggle-history-btn">Show Price History</button>
                    <div class="price-history d-none" id="history-${product.product_id}">
                        ${renderPriceHistoryTable(priceHistory)}
                    </div>
                </div>
            `;

            section.querySelector('.toggle-history-btn').addEventListener('click', (e) => {
                const historyDiv = section.querySelector('.price-history');
                const isHidden = historyDiv.classList.toggle('d-none');
                e.target.textContent = isHidden ? 'Show Price History' : 'Hide Price History';
            });

            section.querySelector('.add-price-btn').addEventListener('click', () => {
                openAddPriceModal(product, section);
            });

            container.appendChild(section);
        }
    } catch {
        showToast('Failed to load products.', 'danger');
    }
}

function renderPriceHistoryTable(history) {
    if (!history || history.length === 0) {
        return '<p class="text-muted mb-0">No price history.</p>';
    }
    const rows = history.map(p => `
        <tr>
            <td>${escapeHtml(p.effective_from || '')}</td>
            <td>$${Number(p.unit_price).toFixed(4)}</td>
        </tr>
    `).join('');
    return `
        <table class="table table-sm table-bordered mb-0">
            <thead><tr><th>Effective From</th><th>Unit Price (per kg)</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function openAddPriceModal(product, sectionEl) {
    const today = new Date().toISOString().slice(0, 10);
    const bodyHtml = `
        <div class="mb-3">
            <label class="form-label">Unit Price (per kg) <span class="text-danger">*</span></label>
            <input type="number" name="unit_price" class="form-control" min="0" step="0.0001" required />
        </div>
        <div class="mb-3">
            <label class="form-label">Effective From <span class="text-danger">*</span></label>
            <input type="date" name="effective_from" class="form-control" value="${today}" required />
        </div>
    `;
    showModal(`Add Price — ${product.name}`, bodyHtml, async (formData) => {
        const unitPrice = parseFloat(formData.get('unit_price'));
        const effectiveFrom = formData.get('effective_from');

        if (isNaN(unitPrice) || unitPrice < 0) { showToast('Enter a valid unit price.', 'warning'); return false; }
        if (!effectiveFrom) { showToast('Effective from date is required.', 'warning'); return false; }

        try {
            const resp = await fetch(`/api/v1/products/${product.product_id}/prices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unit_price: unitPrice, effective_from: effectiveFrom }),
            });
            if (!resp.ok) throw new Error('Failed');
            showToast('Price added!', 'success');
            // Refresh just this product section
            await refreshProductSection(product, sectionEl);
            return true;
        } catch {
            showToast('Failed to add price.', 'danger');
            return false;
        }
    });
}

async function refreshProductSection(product, sectionEl) {
    const today = new Date().toISOString().slice(0, 10);
    const [effectivePrice, priceHistory] = await Promise.all([
        fetchJson(`/api/v1/products/${product.product_id}/prices/effective?date=${today}`).catch(() => null),
        fetchJson(`/api/v1/products/${product.product_id}/prices`).catch(() => []),
    ]);

    const currentPriceText = effectivePrice && effectivePrice.unit_price != null
        ? `$${Number(effectivePrice.unit_price).toFixed(4)}/kg`
        : 'No price set';

    const header = sectionEl.querySelector('.card-header span');
    if (header) header.innerHTML = `Current: <strong>${escapeHtml(currentPriceText)}</strong>`;

    const historyDiv = sectionEl.querySelector('.price-history');
    if (historyDiv) historyDiv.innerHTML = renderPriceHistoryTable(priceHistory);
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ════════════════════════════════════════════════════════════════════════════
function renderList(items, rowFn) {
    const tbody = document.getElementById('list-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-3">No items found.</td></tr>';
        return;
    }
    items.forEach(item => tbody.appendChild(rowFn(item)));
}

async function fetchJson(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
}
