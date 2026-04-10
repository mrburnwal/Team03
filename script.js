// DataGuardian Vanilla JS Logic
const API_BASE = 'http://localhost:8000/api';

// --- State Management ---
let state = {
    resources: [],
    summary: {},
    envFilter: 'All',
    typeFilter: 'All',
    backingUpId: null
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupEventListeners();
});

// --- API Interactions ---
async function fetchData() {
    try {
        const res = await fetch(`${API_BASE}/scorecard`);
        const data = await res.json();
        state.resources = data.resources;
        state.summary = data.summary;
        renderDashboard();
    } catch (err) {
        console.error("Fetch failed", err);
    }
}

async function handleCreateSystem(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const params = new URLSearchParams();
    params.append('name', formData.get('name'));
    params.append('type', formData.get('type'));
    params.append('env', formData.get('env'));
    params.append('criticality', formData.get('criticality'));

    try {
        const res = await fetch(`${API_BASE}/systems?${params.toString()}`, { method: 'POST' });
        if (res.status === 400) {
            const err = await res.json();
            showError(err.detail);
            return;
        }
        hideSystemForm();
        fetchData();
        e.target.reset();
    } catch (err) {
        showError("Failed to connect to server");
    }
}

async function handleSimulatedBackup(resourceId, type) {
    state.backingUpId = resourceId;
    renderDashboard();

    // 2s Simulation
    setTimeout(async () => {
        let successWeight = 0.75;
        if (type === 'Database') successWeight = 0.7;
        if (type === 'Compute') successWeight = 0.8;

        const status = Math.random() < successWeight ? 'Success' : 'Failed';
        const res = await fetch(`${API_BASE}/backups?system_id=${resourceId}&status=${status}`, { method: 'POST' });
        const jobResult = await res.json();

        state.backingUpId = null;
        showJobModal(jobResult);
        fetchData();
    }, 2000);
}

async function handleChat(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    addChatMessage('user', message);
    input.value = '';

    try {
        const res = await fetch(`${API_BASE}/chat?message=${encodeURIComponent(message)}`, { method: 'POST' });
        const data = await res.json();
        addChatMessage('assistant', data.response);
    } catch (err) {
        addChatMessage('assistant', "Sorry, I am having trouble connecting to my central brain.");
    }
}

// --- Rendering ---
function renderDashboard() {
    // Update KPIs
    document.getElementById('totalKpi').textContent = state.summary.total || 0;
    document.getElementById('readyKpi').textContent = state.summary.ready || 0;
    document.getElementById('atRiskKpi').textContent = state.summary.at_risk || 0;
    document.getElementById('criticalKpi').textContent = state.summary.critical || 0;

    // Filter Resources
    const filtered = state.resources.filter(r => {
        const envMatch = state.envFilter === 'All' || r.env === state.envFilter;
        const typeMatch = state.typeFilter === 'All' || r.type === state.typeFilter;
        return envMatch && typeMatch;
    });

    // Update Table
    const tbody = document.getElementById('resourceTableBody');
    tbody.innerHTML = filtered.map(r => `
        <tr>
            <td style="font-weight: 600">${r.name}</td>
            <td>${r.env}</td>
            <td>${r.type}</td>
            <td>${r.last_backup}</td>
            <td>${r.success_rate}</td>
            <td>
                <span class="badge badge-${r.status.toLowerCase().replace(' ', '-')}">
                    ${r.status}
                </span>
            </td>
            <td>
                <button 
                    onclick="handleSimulatedBackup(${r.id}, '${r.type}')"
                    class="filter-btn backup-btn ${state.backingUpId === r.id ? 'active' : ''}"
                    ${state.backingUpId === r.id ? 'disabled' : ''}
                    style="padding: 0.25rem 0.5rem; font-size: 0.7rem; width: 100%"
                >
                    ${state.backingUpId === r.id ? '⚡ Backing up...' : '🔄 Run Backup'}
                </button>
            </td>
        </tr>
    `).join('');
}

function addChatMessage(role, text) {
    const container = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg msg-${role}`;
    
    // Basic Markdown Parsing (Bold and Newlines)
    const sanitized = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const formatted = sanitized
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    msgDiv.innerHTML = formatted;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

// --- UI Helpers ---
function setupEventListeners() {
    // Form Toggle
    document.getElementById('toggleFormBtn').addEventListener('click', () => {
        const form = document.getElementById('systemForm');
        form.classList.toggle('hidden-section');
    });

    // Create System
    document.getElementById('createSystemForm').addEventListener('submit', handleCreateSystem);

    // Environment Filters
    document.querySelectorAll('.env-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.env-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.envFilter = btn.dataset.env;
            renderDashboard();
        });
    });

    // Type Filter
    document.getElementById('typeFilter').addEventListener('change', (e) => {
        state.typeFilter = e.target.value;
        renderDashboard();
    });

    // Seed Data
    document.getElementById('seedBtn').addEventListener('click', async () => {
        await fetch(`${API_BASE}/seed`, { method: 'POST' });
        fetchData();
    });

    // Download
    document.getElementById('downloadBtn').addEventListener('click', () => {
        window.open(`${API_BASE}/export?env=${state.envFilter}&type=${state.typeFilter}`, '_blank');
    });

    // Modal Close
    document.querySelectorAll('.closeModal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('jobModal').classList.add('hidden-section');
        });
    });

    // Chat
    document.getElementById('chatTrigger').addEventListener('click', () => {
        document.getElementById('chatWindow').classList.toggle('hidden-section');
    });
    document.getElementById('chatForm').addEventListener('submit', handleChat);
}

function showJobModal(result) {
    document.getElementById('modalTitle').textContent = `Job Result: ${result.resource_name}`;
    const banner = document.getElementById('statusBanner');
    banner.className = `status-banner ${result.status.toLowerCase()}`;
    banner.textContent = result.status === 'Success' ? '✓ Backup Successful' : '⚠ Backup Failed';

    const terminal = document.getElementById('terminalLogs');
    terminal.innerHTML = result.logs.map(log => `<div class="log-line">${log}</div>`).join('');

    document.getElementById('jobModal').classList.remove('hidden-section');
}

function hideSystemForm() {
    document.getElementById('systemForm').classList.add('hidden-section');
    document.getElementById('formError').classList.add('hidden-section');
}

function showError(msg) {
    const err = document.getElementById('formError');
    err.textContent = msg;
    err.classList.remove('hidden-section');
}
