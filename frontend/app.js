/* ============================================================
   EcoExtract — Terminal Console JavaScript
   Used by: frontend/terminal.html
   Not used by: frontend/index.html (that file has inline scripts)

   Handles:
   - Session auth gate (handleAuth / handleLogout)
   - Live telemetry logging (logSystemTelemetry)
   - Accordion expand/collapse (toggleAccordion)
   - Cross-sync of record data from main site's localStorage

   By: Shivam Singh Patel | NextGen AI Studio
============================================================ */

/* ── Global state ───────────────────────────────────────── */
let interactionCount = 0;

/* ============================================================
   CENTRAL TELEMETRY ENGINE
   Every user action in the terminal console gets logged here.
   Each log is a JSON packet with timestamp, event_id, action,
   and optional metadata. Logs stream into #live-terminal.
============================================================ */
function logSystemTelemetry(eventSignature, metadata = {}) {
    interactionCount++;
    const counterEl = document.getElementById('stat-ops');
    if (counterEl) counterEl.innerText = interactionCount;

    const terminalContainer = document.getElementById('live-terminal');
    if (!terminalContainer) return;

    const timestampISO = new Date().toISOString();

    // Construct strict telemetry analytics layout
    const packetPayload = {
        timestamp: timestampISO,
        event_id: `EVT_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        action: eventSignature,
        telemetry: metadata
    };

    const logRow = document.createElement('div');
    logRow.className = 'terminal-line';
    logRow.innerText = `[${timestampISO}] ${JSON.stringify(packetPayload)}`;

    // Ingest streaming logs directly to the top container
    terminalContainer.insertBefore(logRow, terminalContainer.firstChild);

    // Cap the log count so memory doesn't grow unbounded
    while (terminalContainer.children.length > 200) {
        terminalContainer.removeChild(terminalContainer.lastChild);
    }
}

/* ============================================================
   SESSION VALIDATION — LOGIN GATE
   Reads operator email + role from the login form, validates
   the email has an @ sign, hides the auth gate, shows the
   workspace, and starts the telemetry stream.
============================================================ */
function handleAuth() {
    const emailField = document.getElementById('auth-email');
    const roleField = document.getElementById('auth-role');

    if (!emailField || !roleField) return;

    const emailValue = emailField.value.trim();
    const roleValue = roleField.value;

    if (!emailValue || !emailValue.includes('@')) {
        alert("Authentication Refused: Please supply a verified operator email address.");
        return;
    }

    // Optional: validate password field exists before hiding gate
    const passField = document.getElementById('auth-pass');
    if (passField && passField.value.trim().length < 1) {
        alert("Authentication Refused: Please supply an access key.");
        return;
    }

    // Dynamic UI State Routing
    const authGate = document.getElementById('auth-gate');
    const workspace = document.getElementById('app-workspace');
    if (authGate) authGate.classList.add('hidden');
    if (workspace) workspace.classList.remove('hidden');

    // Set profile parameters
    const opName = document.getElementById('op-name');
    const opRole = document.getElementById('op-role');
    if (opName) opName.innerText = emailValue.split('@')[0];
    if (opRole) opRole.innerText = roleValue === 'admin' ? 'SYSTEM ADMIN' : 'CONTRIBUTOR';

    // Simulate multiple device node handshakes
    const statNodes = document.getElementById('stat-nodes');
    if (statNodes) statNodes.innerText = "2";

    // Log the successful auth
    logSystemTelemetry("NODE_AUTHORIZED_ENTRY", {
        identity_hash: btoa(emailValue),
        security_clearance: roleValue,
        client_handshake: navigator.userAgent.substring(0, 30)
    });

    // Sync any real record data from the main site
    syncRecordsFromLocalStorage();
}

/* ============================================================
   SESSION LOGOUT
   Logs the termination, then resets the UI back to the login
   gate after a short delay. Clears the form fields.
============================================================ */
function handleLogout() {
    logSystemTelemetry("OPERATOR_TERMINATED_SESSION");

    setTimeout(() => {
        const workspace = document.getElementById('app-workspace');
        const authGate = document.getElementById('auth-gate');
        const emailEl = document.getElementById('auth-email');
        const passEl = document.getElementById('auth-pass');

        if (workspace) workspace.classList.add('hidden');
        if (authGate) authGate.classList.remove('hidden');
        if (emailEl) emailEl.value = '';
        if (passEl) passEl.value = '';
    }, 400);
}

/* ============================================================
   MULTI-LEVEL ACCORDION
   Clicking an accordion toggle closes all others and expands
   (or collapses) the clicked one. Logs each interaction.
============================================================ */
function toggleAccordion(buttonElement) {
    const parentBlock = buttonElement.parentElement;
    const isCurrentlyActive = parentBlock.classList.contains('active');

    // Close all sibling accordion blocks
    document.querySelectorAll('.accordion-block').forEach(block => {
        block.classList.remove('active');
    });

    if (!isCurrentlyActive) {
        parentBlock.classList.add('active');
        logSystemTelemetry("ACCORDION_SECTION_EXPANDED", {
            target_node: buttonElement.innerText.trim()
        });
    } else {
        logSystemTelemetry("ACCORDION_SECTION_COLLAPSED", {
            target_node: buttonElement.innerText.trim()
        });
    }
}

/* ============================================================
   LOCAL STORAGE SYNC
   Reads the same localStorage keys the main site uses, so the
   terminal view stays in sync with the dashboard's confirmed
   records. This is what makes the terminal a *real* console,
   not just a demo.
============================================================ */
function syncRecordsFromLocalStorage() {
    let records = [];
    try {
        records = JSON.parse(localStorage.getItem('ecoextract_confirmed_records_v1') || '[]');
        if (!Array.isArray(records)) records = [];
    } catch (_) {
        records = [];
    }

    // Show record count in the terminal
    if (records.length > 0) {
        const totalGrams = records.reduce((s, r) => s + Number(r.grams || 0), 0);
        const totalKg = (totalGrams / 1000).toFixed(3);

        logSystemTelemetry("RECORDS_SYNCED_FROM_MAIN_SITE", {
            record_count: records.length,
            total_kg: Number(totalKg),
            source_key: "ecoextract_confirmed_records_v1"
        });

        // List each record briefly
        records.slice(0, 5).forEach((r, idx) => {
            logSystemTelemetry(`RECORD_${idx + 1}_DETAIL`, {
                material: r.material || r.category || 'unknown',
                grams: Number(r.grams) || 0,
                bin: r.bin || 'unassigned'
            });
        });

        if (records.length > 5) {
            logSystemTelemetry("ADDITIONAL_RECORDS_NOT_SHOWN", {
                remaining: records.length - 5
            });
        }
    } else {
        logSystemTelemetry("LOCAL_STORAGE_EMPTY", {
            hint: "Scan items on the main site to generate records, then return here."
        });
    }

    // Also check bin levels
    let bins = {};
    try {
        bins = JSON.parse(localStorage.getItem('ecoextract_bin_levels_v1') || '{}');
    } catch (_) {}
    if (Object.keys(bins).length > 0) {
        logSystemTelemetry("BIN_LEVELS_SYNCED", bins);
    }
}

/* ============================================================
   KEYBOARD SHORTCUTS
   Small quality-of-life: Enter key on login form submits,
   Escape from workspace returns to login.
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    // Enter submits login
    const passField = document.getElementById('auth-pass');
    if (passField) {
        passField.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAuth();
            }
        });
    }

    // Escape from workspace returns to login (with confirmation)
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            const workspace = document.getElementById('app-workspace');
            if (workspace && !workspace.classList.contains('hidden')) {
                if (window.confirm('Disconnect from EcoExtract terminal?')) {
                    handleLogout();
                }
            }
        }
    });

    // Log initial page load
    logSystemTelemetry("TERMINAL_PAGE_LOADED", {
        page: 'terminal.html',
        user_agent_short: navigator.userAgent.substring(0, 40),
        viewport: `${window.innerWidth}x${window.innerHeight}`
    });
});

/* ============================================================
   OPTIONAL — LIVE SYNC
   If the main site in another tab adds a record, this tab will
   pick it up and log the change. Uses the storage event which
   fires when localStorage changes in *another* tab of the same
   origin. This is a genuinely useful feature — the terminal
   becomes a live monitor of the main site's activity.
============================================================ */
window.addEventListener('storage', (event) => {
    if (event.key === 'ecoextract_confirmed_records_v1') {
        let newRecords = [];
        try {
            newRecords = JSON.parse(event.newValue || '[]');
        } catch (_) {}

        const totalGrams = newRecords.reduce((s, r) => s + Number(r.grams || 0), 0);
        logSystemTelemetry("CROSS_TAB_RECORD_UPDATE", {
            source: "another browser tab",
            new_record_count: newRecords.length,
            new_total_kg: Number((totalGrams / 1000).toFixed(3))
        });
    }

    if (event.key === 'ecoextract_bin_levels_v1') {
        let bins = {};
        try {
            bins = JSON.parse(event.newValue || '{}');
        } catch (_) {}

        logSystemTelemetry("CROSS_TAB_BIN_UPDATE", {
            source: "another browser tab",
            bins: bins
        });
    }
});

/* ============================================================
   EXPORTS (for testing / console access)
   Makes these functions callable from the browser console:
   > toggleAccordion(document.querySelector('.accordion-toggle'))
   > syncRecordsFromLocalStorage()
============================================================ */
window.EcoExtractTerminal = {
    handleAuth,
    handleLogout,
    toggleAccordion,
    logSystemTelemetry,
    syncRecordsFromLocalStorage,
    getInteractionCount: () => interactionCount
};
