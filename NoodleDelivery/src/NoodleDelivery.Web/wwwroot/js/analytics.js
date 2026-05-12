/**
 * analytics.js — Analytics dashboard page logic
 */

// ── Chart instances ───────────────────────────────────────────────────────────
const charts = {};
let _overTimeData = [];
let _overTimeFilter = 'all'; // 'all' | 'Pho' | 'Bun'

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Default date range: last 30 days
    // Default date range: last 30 days, but if that returns no data the user can adjust.
    // We use a fixed fallback of 2025-11-01 to 2025-11-30 only when localStorage is empty
    // and no recent data exists — here we simply default to last 30 days from today.
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const todayStr = today.toISOString().slice(0, 10);
    const fromStr = thirtyDaysAgo.toISOString().slice(0, 10);

    // Load persisted settings
    const savedRange = loadJson('noodle_daterange');
    const savedMetric = localStorage.getItem('noodle_metric') || 'both';
    const savedToggles = loadJson('noodle_toggles') || {
        restaurants: true,
        drivers: true,
        overtime: true,
        contribution: true,
    };

    // Default to 2025-11-01 → 2025-11-30 when no saved range exists (matches imported data)
    const defaultFrom = savedRange ? savedRange.from : '2025-11-01';
    const defaultTo = savedRange ? savedRange.to : '2025-11-30';
    document.getElementById('from-date').value = defaultFrom;
    document.getElementById('to-date').value = defaultTo;
    document.getElementById('cq-from').value = defaultFrom;
    document.getElementById('cq-to').value = defaultTo;

    // Restore metric radio
    const metricRadio = document.querySelector(`input[name="metric"][value="${savedMetric}"]`);
    if (metricRadio) metricRadio.checked = true;

    // Restore toggles
    setCheckbox('show-top-restaurants', savedToggles.restaurants !== false);
    setCheckbox('show-top-drivers', savedToggles.drivers !== false);
    setCheckbox('show-over-time', savedToggles.overtime !== false);
    setCheckbox('show-contribution', savedToggles.contribution !== false);

    // Event listeners
    document.getElementById('from-date').addEventListener('change', onDateChange);
    document.getElementById('to-date').addEventListener('change', onDateChange);

    document.querySelectorAll('input[name="metric"]').forEach(radio => {
        radio.addEventListener('change', () => {
            localStorage.setItem('noodle_metric', radio.value);
            loadDashboard();
        });
    });

    document.getElementById('toggle-charts-btn').addEventListener('click', () => {
        const panel = document.getElementById('toggle-panel');
        panel.classList.toggle('d-none');
    });

    ['show-top-restaurants', 'show-top-drivers', 'show-over-time', 'show-contribution'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            saveToggles();
            applyToggleVisibility();
        });
    });

    document.getElementById('entity-type').addEventListener('change', loadEntityOptions);
    document.getElementById('cq-generate').addEventListener('click', runCustomQuery);

    // Over-time product filter buttons
    ['all', 'pho', 'bun'].forEach(key => {
        document.getElementById(`ot-btn-${key}`).addEventListener('click', () => {
            _overTimeFilter = key === 'all' ? 'all' : key.charAt(0).toUpperCase() + key.slice(1);
            document.querySelectorAll('[id^="ot-btn-"]').forEach(b => b.classList.remove('active'));
            document.getElementById(`ot-btn-${key}`).classList.add('active');
            renderOverTimeChart(_overTimeData, document.querySelector('input[name="metric"]:checked')?.value || 'both');
        });
    });

    // Load entity options for custom query
    await loadEntityOptions();

    // Load dashboard
    loadDashboard();
});

function onDateChange() {
    const from = document.getElementById('from-date').value;
    const to = document.getElementById('to-date').value;
    localStorage.setItem('noodle_daterange', JSON.stringify({ from, to }));
    loadDashboard();
}

function saveToggles() {
    const toggles = {
        restaurants: document.getElementById('show-top-restaurants').checked,
        drivers: document.getElementById('show-top-drivers').checked,
        overtime: document.getElementById('show-over-time').checked,
        contribution: document.getElementById('show-contribution').checked,
    };
    localStorage.setItem('noodle_toggles', JSON.stringify(toggles));
}

function applyToggleVisibility() {
    toggleWrap('chart-top-restaurants-wrap', 'show-top-restaurants');
    toggleWrap('chart-top-drivers-wrap', 'show-top-drivers');
    toggleWrap('chart-over-time-wrap', 'show-over-time');
    toggleWrap('chart-contribution-wrap', 'show-contribution');
}

function toggleWrap(wrapId, checkboxId) {
    const wrap = document.getElementById(wrapId);
    const checked = document.getElementById(checkboxId).checked;
    if (checked) {
        wrap.classList.remove('d-none');
    } else {
        wrap.classList.add('d-none');
    }
}

// ── Load Dashboard ────────────────────────────────────────────────────────────
async function loadDashboard() {
    const from = document.getElementById('from-date').value;
    const to = document.getElementById('to-date').value;
    if (!from || !to) return;

    const metric = document.querySelector('input[name="metric"]:checked')?.value || 'both';

    try {
        const qs = `from=${from}&to=${to}`;
        const [topRest, topDriver, overTime, contribution, summary] = await Promise.all([
            fetchJson(`/api/v1/analytics/top-restaurants?${qs}&limit=5`).catch(() => []),
            fetchJson(`/api/v1/analytics/top-drivers?${qs}&limit=5`).catch(() => []),
            fetchJson(`/api/v1/analytics/over-time?${qs}`).catch(() => []),
            fetchJson(`/api/v1/analytics/restaurant-contribution?${qs}`).catch(() => []),
            fetchJson(`/api/v1/analytics/summary?${qs}`).catch(() => ({})),
        ]);

        renderKpis(summary, topRest, topDriver);
        renderTopRestaurantsChart(topRest, metric);
        renderTopDriversChart(topDriver, metric);
        renderOverTimeChart(overTime, metric);
        renderContributionChart(contribution);
        applyToggleVisibility();
    } catch (err) {
        showToast('Failed to load analytics data.', 'danger');
    }
}

// ── KPI Cards ─────────────────────────────────────────────────────────────────
function renderKpis(summary, topRest, topDriver) {
    // total_kg_by_product is { "Pho": 120, "Bun": 45 }
    const kgByProduct = summary.total_kg_by_product || {};
    const kgParts = Object.entries(kgByProduct).map(([name, kg]) => `${name}: ${Number(kg).toFixed(0)} kg`);
    document.getElementById('kpi-kg').textContent = kgParts.length ? kgParts.join(' · ') : '-';

    const totalRev = summary.total_revenue != null ? `₽${Number(summary.total_revenue).toLocaleString()}` : '-';
    document.getElementById('kpi-rev').textContent = totalRev;

    const topRestName = summary.top_restaurant ? summary.top_restaurant.name : (topRest && topRest[0] ? topRest[0].name : '-');
    const topDriverName = summary.top_driver ? summary.top_driver.name : (topDriver && topDriver[0] ? topDriver[0].name : '-');
    document.getElementById('kpi-top-rest').textContent = topRestName || '-';
    document.getElementById('kpi-top-driver').textContent = topDriverName || '-';
}

// ── Charts ────────────────────────────────────────────────────────────────────
function renderTopRestaurantsChart(data, metric) {
    const ctx = document.getElementById('chart-top-restaurants');
    if (!ctx) return;
    destroyChart('topRestaurants');

    const labels = (data || []).map(r => r.name);
    const datasets = buildStackedDatasets(data, metric);

    charts.topRestaurants = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Top Restaurants' }, legend: { position: 'top' } },
            scales: { x: { stacked: true }, y: { stacked: true } },
        },
    });
}

function renderTopDriversChart(data, metric) {
    const ctx = document.getElementById('chart-top-drivers');
    if (!ctx) return;
    destroyChart('topDrivers');

    const labels = (data || []).map(d => d.name);
    const datasets = buildStackedDatasets(data, metric);

    charts.topDrivers = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Top Drivers' }, legend: { position: 'top' } },
            scales: { x: { stacked: true }, y: { stacked: true } },
        },
    });
}

function renderOverTimeChart(data, metric) {
    const ctx = document.getElementById('chart-over-time');
    if (!ctx) return;
    destroyChart('overTime');

    _overTimeData = data || [];

    const labels = _overTimeData.map(d => d.date);
    let products = getUniqueProducts(_overTimeData);
    if (_overTimeFilter !== 'all') {
        products = products.filter(p => p === _overTimeFilter);
    }

    const datasets = products.map((prod, i) => ({
        label: `${prod} (kg)`,
        data: _overTimeData.map(d => (d.kg_by_product || {})[prod] || 0),
        borderColor: getColor(i),
        backgroundColor: getColor(i, 0.2),
        fill: false,
        tension: 0.3,
    }));

    charts.overTime = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Volume Over Time' }, legend: { position: 'top' } },
        },
    });
}

function renderContributionChart(data) {
    const ctx = document.getElementById('chart-contribution');
    if (!ctx) return;
    destroyChart('contribution');

    const labels = (data || []).map(d => d.name);
    const values = (data || []).map(d => d.revenue || 0);
    const colors = labels.map((_, i) => getColor(i, 0.7));

    charts.contribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: values, backgroundColor: colors }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Revenue Contribution by Restaurant' },
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, padding: 10 },
                },
            },
        },
    });
}

// ── Custom Query ──────────────────────────────────────────────────────────────
async function loadEntityOptions() {
    const type = document.getElementById('entity-type').value;
    const url = type === 'driver' ? '/api/v1/drivers' : '/api/v1/restaurants';
    try {
        const data = await fetchJson(url);
        const select = document.getElementById('entity-name');
        select.innerHTML = '';
        (data || []).forEach(item => {
            const idKey = type === 'driver' ? 'driver_id' : 'restaurant_id';
            const opt = document.createElement('option');
            opt.value = item[idKey];
            opt.textContent = item.name;
            select.appendChild(opt);
        });
    } catch {
        // ignore
    }
}

async function runCustomQuery() {
    const type = document.getElementById('entity-type').value;
    const id = document.getElementById('entity-name').value;
    const from = document.getElementById('cq-from').value;
    const to = document.getElementById('cq-to').value;
    const resultEl = document.getElementById('cq-result');

    if (!id || !from || !to) {
        resultEl.innerHTML = '<p class="text-muted">Please select an entity and date range.</p>';
        return;
    }

    resultEl.innerHTML = '<p class="text-muted">Loading...</p>';

    try {
        const data = await fetchJson(`/api/v1/analytics/entity?type=${type}&id=${id}&from=${from}&to=${to}`);

        const kgByProduct = data.total_kg_by_product || {};
        const kgParts = Object.entries(kgByProduct).map(([prod, kg]) => `${escapeHtml(prod)}: <strong>${Number(kg).toFixed(1)} kg</strong>`);
        const totalKgStr = kgParts.length ? kgParts.join(' &nbsp;·&nbsp; ') : '<strong>0 kg</strong>';
        const totalRev = data.total_revenue != null ? Number(data.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
        const name = data.name || '';

        resultEl.innerHTML = `
            <div class="mb-3">
                <strong>${escapeHtml(name)}</strong> &mdash;
                Volume: ${totalKgStr} &nbsp;·&nbsp;
                Revenue: <strong>₽${escapeHtml(totalRev)}</strong>
            </div>
            <div style="max-height:280px;"><canvas id="cq-chart"></canvas></div>
        `;

        const breakdown = data.daily_breakdown || [];
        if (breakdown.length === 0) {
            resultEl.insertAdjacentHTML('beforeend', '<p class="text-muted">No daily breakdown available.</p>');
            return;
        }

        const labels = breakdown.map(d => d.date);
        const products = [...new Set(breakdown.flatMap(d => Object.keys(d.kg_by_product || {})))];
        const datasets = products.map((prod, i) => ({
            label: `${prod} (kg)`,
            data: breakdown.map(d => (d.kg_by_product || {})[prod] || 0),
            backgroundColor: getColor(i, 0.7),
        }));

        const ctx = document.getElementById('cq-chart');
        if (ctx) {
            new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: { x: { stacked: true }, y: { stacked: true } },
                },
            });
        }
    } catch {
        resultEl.innerHTML = '<p class="text-danger">Failed to load data.</p>';
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildStackedDatasets(data, metric) {
    const products = getUniqueProducts(data);
    return products.map((prod, i) => {
        const kgData = (data || []).map(item => (item.kg_by_product || {})[prod] || 0);
        // revenue is per-entity total; split proportionally by kg share per product
        const revData = (data || []).map(item => {
            const totalKg = Object.values(item.kg_by_product || {}).reduce((a, b) => a + b, 0);
            const prodKg = (item.kg_by_product || {})[prod] || 0;
            const share = totalKg > 0 ? prodKg / totalKg : 0;
            return Math.round((item.revenue || 0) * share);
        });
        if (metric === 'kg') {
            return { label: `${prod} (kg)`, data: kgData, backgroundColor: getColor(i, 0.7) };
        } else if (metric === 'revenue') {
            return { label: `${prod} (₽)`, data: revData, backgroundColor: getColor(i, 0.7) };
        } else {
            return [
                { label: `${prod} (kg)`, data: kgData, backgroundColor: getColor(i * 2, 0.7) },
                { label: `${prod} (₽)`, data: revData, backgroundColor: getColor(i * 2 + 1, 0.7) },
            ];
        }
    }).flat();
}

function getUniqueProducts(data) {
    const set = new Set();
    (data || []).forEach(item => {
        Object.keys(item.kg_by_product || {}).forEach(p => set.add(p));
    });
    return [...set];
}

function destroyChart(key) {
    if (charts[key]) {
        charts[key].destroy();
        delete charts[key];
    }
}

const PALETTE = [
    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
    '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
    '#9c755f', '#bab0ac',
];

function getColor(index, alpha) {
    const hex = PALETTE[index % PALETTE.length];
    if (alpha == null) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function setCheckbox(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = value;
}

function loadJson(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

async function fetchJson(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
