/**
 * dataentry.js — Daily data entry page logic
 */

// ── State ────────────────────────────────────────────────────────────────────
const driverState = {}; // { driverId: { restaurantId: { pho: '', bun: '' } } }
let activeDriverId = null;
let products = [];   // [{ product_id, name }]
let drivers = [];    // [{ driver_id, name, phone, is_active }]
let restaurants = []; // [{ restaurant_id, name, is_active }]

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Set date to today
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('entry-date').value = today;

    // Load data in parallel
    try {
        const [productsData, driversData, restaurantsData] = await Promise.all([
            fetchJson('/api/v1/products'),
            fetchJson('/api/v1/drivers'),
            fetchJson('/api/v1/restaurants'),
        ]);
        products = productsData || [];
        drivers = (driversData || []).filter(d => d.is_active !== false);
        restaurants = (restaurantsData || []).filter(r => r.is_active !== false);
    } catch (err) {
        showToast('Failed to load data. Please refresh.', 'danger');
        return;
    }

    renderDriverTabs();

    // Select first driver automatically
    if (drivers.length > 0) {
        selectDriver(drivers[0].driver_id);
    } else {
        document.getElementById('driver-content').classList.add('d-none');
        document.getElementById('empty-state').classList.remove('d-none');
    }

    // Wire up submit button
    document.getElementById('submit-btn').addEventListener('click', handleSubmit);
});

// ── Driver Tabs ───────────────────────────────────────────────────────────────
function renderDriverTabs() {
    const tabsEl = document.getElementById('driver-tabs');
    tabsEl.innerHTML = '';

    drivers.forEach(driver => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        const a = document.createElement('a');
        a.className = 'nav-link';
        a.textContent = driver.name;
        a.setAttribute('data-driver-id', driver.driver_id);
        a.style.cursor = 'pointer';
        a.addEventListener('click', () => {
            saveDriverState();
            selectDriver(driver.driver_id);
        });
        li.appendChild(a);
        tabsEl.appendChild(li);
    });

    // Add [+] tab
    const addLi = document.createElement('li');
    addLi.className = 'nav-item';
    const addA = document.createElement('a');
    addA.className = 'nav-link add-tab text-success';
    addA.id = 'add-driver-tab';
    addA.textContent = '+';
    addA.style.cursor = 'pointer';
    addA.title = 'Add new driver';
    addA.addEventListener('click', openAddDriverModal);
    addLi.appendChild(addA);
    tabsEl.appendChild(addLi);
}

// ── Select Driver ─────────────────────────────────────────────────────────────
function selectDriver(driverId) {
    activeDriverId = driverId;

    // Update active tab styling
    document.querySelectorAll('#driver-tabs .nav-link[data-driver-id]').forEach(a => {
        a.classList.toggle('active', a.getAttribute('data-driver-id') === String(driverId));
    });

    document.getElementById('driver-content').classList.remove('d-none');
    document.getElementById('empty-state').classList.add('d-none');
    document.getElementById('error-msg').classList.add('d-none');
    renderRestaurantRows();
}

// ── Render Restaurant Rows ────────────────────────────────────────────────────
function renderRestaurantRows() {
    const tbody = document.getElementById('restaurant-rows');
    tbody.innerHTML = '';

    const activeRestaurants = restaurants.filter(r => r.is_active !== false);

    if (activeRestaurants.length === 0) {
        document.getElementById('driver-content').classList.add('d-none');
        document.getElementById('empty-state').classList.remove('d-none');
        return;
    }

    document.getElementById('driver-content').classList.remove('d-none');
    document.getElementById('empty-state').classList.add('d-none');

    const saved = driverState[activeDriverId] || {};
    let tabIndex = 1;

    activeRestaurants.forEach(restaurant => {
        const rid = restaurant.restaurant_id;
        const savedRow = saved[rid] || {};

        const tr = document.createElement('tr');
        tr.setAttribute('data-restaurant-id', rid);
        tr.innerHTML = `
            <td class="align-middle">${escapeHtml(restaurant.name)}</td>
            <td>
                <input type="number" class="form-control pho-input"
                    min="0" max="1000000" step="0.01"
                    tabindex="${tabIndex++}"
                    value="${escapeHtml(savedRow.pho || '')}" />
                <div class="invalid-feedback">Enter a value between 0 and 1,000,000.</div>
            </td>
            <td>
                <input type="number" class="form-control bun-input"
                    min="0" max="1000000" step="0.01"
                    tabindex="${tabIndex++}"
                    value="${escapeHtml(savedRow.bun || '')}" />
                <div class="invalid-feedback">Enter a value between 0 and 1,000,000.</div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach blur validation
    tbody.querySelectorAll('input[type=number]').forEach(input => {
        input.addEventListener('blur', () => validateInput(input));
    });
}

// ── Save Driver State ─────────────────────────────────────────────────────────
function saveDriverState() {
    if (!activeDriverId) return;
    const state = {};
    document.querySelectorAll('#restaurant-rows tr').forEach(tr => {
        const rid = tr.getAttribute('data-restaurant-id');
        if (!rid) return;
        const phoInput = tr.querySelector('.pho-input');
        const bunInput = tr.querySelector('.bun-input');
        state[rid] = {
            pho: phoInput ? phoInput.value : '',
            bun: bunInput ? bunInput.value : '',
        };
    });
    driverState[activeDriverId] = state;
}

// ── Input Validation ──────────────────────────────────────────────────────────
function validateInput(input) {
    const val = parseFloat(input.value);
    if (input.value !== '' && (isNaN(val) || val < 0 || val > 1000000)) {
        input.classList.add('is-invalid');
        return false;
    } else {
        input.classList.remove('is-invalid');
        return true;
    }
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleSubmit() {
    const submitBtn = document.getElementById('submit-btn');
    const errorMsg = document.getElementById('error-msg');
    submitBtn.disabled = true;
    errorMsg.classList.add('d-none');

    saveDriverState();

    const entryDate = document.getElementById('entry-date').value;
    if (!entryDate) {
        showToast('Please select a date.', 'warning');
        submitBtn.disabled = false;
        return;
    }

    // Validate all inputs first
    let hasValidationError = false;
    document.querySelectorAll('#restaurant-rows input[type=number]').forEach(input => {
        if (!validateInput(input)) hasValidationError = true;
    });
    if (hasValidationError) {
        showToast('Please fix validation errors before submitting.', 'warning');
        submitBtn.disabled = false;
        return;
    }

    // Get product IDs
    const phoProduct = products.find(p => p.name && p.name.toLowerCase().includes('pho'));
    const bunProduct = products.find(p => p.name && p.name.toLowerCase().includes('bun'));

    if (!phoProduct || !bunProduct) {
        showToast('Could not find product definitions. Check Manage → Prices.', 'danger');
        submitBtn.disabled = false;
        return;
    }

    // Build orders
    const orders = [];
    const saved = driverState[activeDriverId] || {};
    restaurants.filter(r => r.is_active !== false).forEach(restaurant => {
        const rid = restaurant.restaurant_id;
        const row = saved[rid] || {};
        const phoVal = parseFloat(row.pho) || 0;
        const bunVal = parseFloat(row.bun) || 0;
        if (phoVal > 0 || bunVal > 0) {
            const items = [];
            if (phoVal > 0) items.push({ product_id: phoProduct.product_id, quantity_kg: phoVal });
            if (bunVal > 0) items.push({ product_id: bunProduct.product_id, quantity_kg: bunVal });
            orders.push({ driver_id: activeDriverId, restaurant_id: rid, items });
        }
    });

    const payload = {
        date: entryDate,
        orders,
    };

    try {
        const resp = await fetch('/api/v1/orders/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (resp.ok) {
            showToast('Saved!', 'success');
            // Clear inputs for current driver
            document.querySelectorAll('#restaurant-rows input[type=number]').forEach(inp => inp.value = '');
            delete driverState[activeDriverId];
        } else {
            const data = await resp.json().catch(() => ({}));
            const code = data.code || data.error_code || '';

            if (resp.status === 400 && code === 'NO_NONZERO_ITEMS') {
                showToast('No quantities entered.', 'warning');
            } else if (resp.status === 400 && code === 'NO_PRICE_FOR_DATE') {
                showToast(`No price for ${data.product} on ${data.date}. Go to Manage → Prices.`, 'danger');
            } else if (resp.status === 409 && code === 'DUPLICATE_ORDER') {
                const conflicts = Array.isArray(data.restaurants) ? data.restaurants : [];
                const list = conflicts.length > 0
                    ? '<ul>' + conflicts.map(n => `<li>${escapeHtml(n)}</li>`).join('') + '</ul>'
                    : '';
                errorMsg.innerHTML = `<strong>Duplicate orders detected.</strong> The following restaurants already have orders for this date:${list}Please edit or delete the existing orders first.`;
                errorMsg.classList.remove('d-none');
            } else {
                showToast('An error occurred. Please try again.', 'danger');
            }
        }
    } catch (err) {
        showToast('An error occurred. Please try again.', 'danger');
    } finally {
        submitBtn.disabled = false;
    }
}

// ── Add Driver Modal ──────────────────────────────────────────────────────────
function openAddDriverModal() {
    const bodyHtml = `
        <div class="mb-3">
            <label class="form-label">Name <span class="text-danger">*</span></label>
            <input type="text" name="name" class="form-control" required />
        </div>
        <div class="mb-3">
            <label class="form-label">Phone</label>
            <input type="tel" name="phone" class="form-control" />
        </div>
    `;
    showModal('Add Driver', bodyHtml, async (formData) => {
        const name = formData.get('name')?.trim();
        if (!name) { showToast('Name is required.', 'warning'); return false; }
        try {
            const resp = await fetch('/api/v1/drivers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone: formData.get('phone') || null }),
            });
            if (!resp.ok) throw new Error('Failed');
            const newDriver = await resp.json();
            // Re-fetch drivers
            const driversData = await fetchJson('/api/v1/drivers');
            drivers = (driversData || []).filter(d => d.is_active !== false);
            renderDriverTabs();
            saveDriverState();
            selectDriver(newDriver.driver_id);
            showToast('Driver added!', 'success');
            return true;
        } catch {
            showToast('Failed to add driver.', 'danger');
            return false;
        }
    });
}

// ── Add Restaurant Modal ──────────────────────────────────────────────────────
function openAddRestaurantModal() {
    const bodyHtml = `
        <div class="mb-3">
            <label class="form-label">Name <span class="text-danger">*</span></label>
            <input type="text" name="name" class="form-control" required />
        </div>
        <div class="mb-3">
            <label class="form-label">Address</label>
            <input type="text" name="address" class="form-control" />
        </div>
        <div class="mb-3">
            <label class="form-label">Phone</label>
            <input type="tel" name="phone" class="form-control" />
        </div>
    `;
    showModal('Add Restaurant', bodyHtml, async (formData) => {
        const name = formData.get('name')?.trim();
        if (!name) { showToast('Name is required.', 'warning'); return false; }
        try {
            const resp = await fetch('/api/v1/restaurants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    address: formData.get('address') || null,
                    phone: formData.get('phone') || null,
                }),
            });
            if (!resp.ok) throw new Error('Failed');
            const restaurantsData = await fetchJson('/api/v1/restaurants');
            restaurants = (restaurantsData || []).filter(r => r.is_active !== false);
            renderRestaurantRows();
            showToast('Restaurant added!', 'success');
            return true;
        } catch {
            showToast('Failed to add restaurant.', 'danger');
            return false;
        }
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchJson(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
}
