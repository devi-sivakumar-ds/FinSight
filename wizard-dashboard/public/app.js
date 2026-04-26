const dashboardStatus = document.getElementById('dashboard-status');
const appStatus = document.getElementById('app-status');
const sessionInfoEl = document.getElementById('session-info');
const appStateEl = document.getElementById('app-state');
const eventLogEl = document.getElementById('event-log');
const amountInput = document.getElementById('amount-input');
const setAmountButtons = [
  document.getElementById('set-amount-btn'),
  document.getElementById('set-amount-confirm-btn'),
].filter(Boolean);
const ocrCheckNumberInput = document.getElementById('ocr-check-number');
const ocrRoutingNumberInput = document.getElementById('ocr-routing-number');
const ocrAccountNumberInput = document.getElementById('ocr-account-number');
const ocrSuccessBtn = document.getElementById('ocr-success-btn');
const ocrPartialBtn = document.getElementById('ocr-partial-btn');
const ocrFailBtn = document.getElementById('ocr-fail-btn');
const noteInput = document.getElementById('note-input');
const saveNoteBtn = document.getElementById('save-note-btn');
const logPathEl = document.getElementById('log-path');

let currentSessionId = 'local_dashboard_session';

function renderLogPath(sessionLogPath) {
  logPathEl.textContent = sessionLogPath
    ? `Session log file: ${sessionLogPath}`
    : 'Session log file: waiting for app session';
}

const socket = new WebSocket(`ws://${window.location.host}`);

function renderKV(target, data) {
  if (!data) {
    target.innerHTML = '<div class="kv-row"><span>None</span></div>';
    return;
  }

  target.innerHTML = Object.entries(data)
    .map(([key, value]) => {
      const shown = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `<div class="kv-row"><span class="key">${key}</span><span class="value">${shown}</span></div>`;
    })
    .join('');
}

function renderLog(events) {
  eventLogEl.innerHTML = '';
  (events || []).forEach(event => {
    const li = document.createElement('li');
    li.textContent = `${event.timestamp} - ${event.summary}`;
    eventLogEl.appendChild(li);
  });
}

function sendCommand(id, context, payloadType = 'none', payload = null) {
  socket.send(JSON.stringify({
    type: 'operator_command',
    command: {
      id,
      context,
      payloadType,
      payload,
      issuedAt: new Date().toISOString(),
      sessionId: currentSessionId,
    },
  }));
}

function sendNote() {
  const note = noteInput.value.trim();
  if (!note) return;

  socket.send(JSON.stringify({
    type: 'operator_note',
    sessionId: currentSessionId,
    note,
    timestamp: new Date().toISOString(),
  }));
  noteInput.value = '';
}

socket.addEventListener('open', () => {
  dashboardStatus.textContent = 'Dashboard connected';
  dashboardStatus.classList.remove('muted');
  socket.send(JSON.stringify({ type: 'register_dashboard' }));
});

socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);

  if (message.type === 'dashboard_bootstrap') {
    appStatus.textContent = message.appConnected ? 'App connected' : 'App disconnected';
    appStatus.classList.toggle('muted', !message.appConnected);
    currentSessionId = message.session?.sessionId || message.state?.sessionId || currentSessionId;
    renderKV(sessionInfoEl, message.session);
    renderKV(appStateEl, message.state);
    renderLog(message.events);
    renderLogPath(message.sessionLogPath);
  }

  if (message.type === 'dashboard_state') {
    appStatus.textContent = message.appConnected ? 'App connected' : 'App disconnected';
    appStatus.classList.toggle('muted', !message.appConnected);
    currentSessionId = message.state?.sessionId || currentSessionId;
    renderKV(appStateEl, message.state);
    renderLogPath(message.sessionLogPath);
  }

  if (message.type === 'dashboard_session') {
    currentSessionId = message.session?.sessionId || currentSessionId;
    renderKV(sessionInfoEl, message.session);
    renderLogPath(message.sessionLogPath);
  }

  if (message.type === 'dashboard_event_log') {
    renderLog(message.events);
    renderLogPath(message.sessionLogPath);
  }
});

document.querySelectorAll('button[data-id]').forEach(button => {
  button.addEventListener('click', () => {
    sendCommand(button.dataset.id, button.dataset.context);
  });
});

setAmountButtons.forEach(button => {
  button.addEventListener('click', () => {
    const amount = Number(amountInput.value);
    sendCommand('SET_AMOUNT', 'AmountInput', 'amount', { amount });
  });
});

function sendOcrCommand(id, outcome) {
  sendCommand(id, 'OCRProcessing', 'ocrOutcome', {
    outcome,
    checkNumber: ocrCheckNumberInput.value.trim(),
    routingNumber: ocrRoutingNumberInput.value.trim(),
    accountNumber: ocrAccountNumberInput.value.trim(),
  });
}

ocrSuccessBtn.addEventListener('click', () => {
  sendOcrCommand('OCR_SUCCESS', 'success');
});

ocrPartialBtn.addEventListener('click', () => {
  sendOcrCommand('OCR_PARTIAL', 'partial');
});

ocrFailBtn.addEventListener('click', () => {
  sendCommand('OCR_FAIL', 'OCRProcessing', 'ocrOutcome', { outcome: 'fail' });
});

saveNoteBtn.addEventListener('click', sendNote);
noteInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    sendNote();
  }
});
