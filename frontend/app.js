let interactionCount = 0;

// Central Telemetry JSON Serialization Engine
function logSystemTelemetry(eventSignature, metadata = {}) {
    interactionCount++;
    document.getElementById('stat-ops').innerText = interactionCount;

    const terminalContainer = document.getElementById('live-terminal');
    const timestampISO = new Date().toISOString();
    
    // Construct strict telemetry analytics layout
    const packetPayload = {
        timestamp: timestampISO,
        event_id: `EVT_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        action: eventSignature,
        telemetry: metadata
    };

    const logRow = document.createElement('div');
    logRow.className = 'terminal-line';
    logRow.innerText = `[${timestampISO}] ${JSON.stringify(packetPayload)}`;
    
    // Ingest streaming logs directly to the top container
    terminalContainer.insertBefore(logRow, terminalContainer.firstChild);
}

// Session Validation Router Gate Controller
function handleAuth() {
    const emailField = document.getElementById('auth-email').value;
    const roleField = document.getElementById('auth-role').value;

    if (!emailField || !emailField.includes('@')) {
        alert("Authentication Refused: Please supply a verified operator email address.");
        return;
    }

    // Dynamic UI State Routing Layout
    document.getElementById('auth-gate').classList.add('hidden');
    document.getElementById('app-workspace').classList.remove('hidden');
    
    // Set Profile Parameters
    document.getElementById('op-name').innerText = emailField.split('@')[0];
    document.getElementById('op-role').innerText = roleField === 'admin' ? 'SYSTEM ADMIN' : 'CONTRIBUTOR';
    
    // Simulate multiple device node handshakes
    document.getElementById('stat-nodes').innerText = "2"; 

    logSystemTelemetry("NODE_AUTHORIZED_ENTRY", { 
        identity_hash: btoa(emailField), 
        security_clearance: roleField,
        client_handshake: navigator.userAgent.substring(0, 30)
    });
}

// Multi-Level Click Dropdown Accordion Engine
function toggleAccordion(buttonElement) {
    const parentBlock = buttonElement.parentElement;
    const isCurrentlyActive = parentBlock.classList.contains('active');
    
    // Close sibling accordion nodes to optimize visibility viewport layout
    document.querySelectorAll('.accordion-block').forEach(block => {
        block.classList.remove('active');
    });

    if (!isCurrentlyActive) {
        parentBlock.classList.add('active');
        logSystemTelemetry("ACCORDION_SECTION_EXPANDED", { target_node: buttonElement.innerText });
    } else {
        logSystemTelemetry("ACCORDION_SECTION_COLLAPSED", { target_node: buttonElement.innerText });
    }
}

// Session Log Out Controller Cleaners
function handleLogout() {
    logSystemTelemetry("OPERATOR_TERMINATED_SESSION");
    
    setTimeout(() => {
        document.getElementById('app-workspace').classList.add('hidden');
        document.getElementById('auth-gate').classList.remove('hidden');
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-pass').value = '';
    }, 400);
}
