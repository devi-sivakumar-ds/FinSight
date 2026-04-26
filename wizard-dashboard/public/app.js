const dashboardStatus = document.getElementById('dashboard-status');
const appStatus = document.getElementById('app-status');
const sessionInfoEl = document.getElementById('session-info');
const appStateEl = document.getElementById('app-state');
const eventLogEl = document.getElementById('event-log');
const ocrCheckNumberInput = document.getElementById('ocr-check-number');
const ocrRoutingNumberInput = document.getElementById('ocr-routing-number');
const ocrAccountNumberInput = document.getElementById('ocr-account-number');
const summaryAmountInput = document.getElementById('summary-amount');
const summaryAccountInput = document.getElementById('summary-account');
const summaryIssuerInput = document.getElementById('summary-issuer');
const summaryDateInput = document.getElementById('summary-date');
const postCaptureSummaryBtn = document.getElementById('post-capture-summary-btn');
const frontReviewAmountInput = document.getElementById('front-review-amount');
const frontReviewIssuerInput = document.getElementById('front-review-issuer');
const frontReviewDateInput = document.getElementById('front-review-date');
const frontReviewBtn = document.getElementById('front-review-btn');
const successAvailableNowInput = document.getElementById('success-available-now');
const successRemainingInput = document.getElementById('success-remaining');
const successAvailableByInput = document.getElementById('success-available-by');
const successSummaryBtn = document.getElementById('success-summary-btn');
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

function sendOcrCommand(id, outcome) {
  sendCommand(id, 'OCRProcessing', 'ocrOutcome', {
    outcome,
    checkNumber: ocrCheckNumberInput.value.trim(),
    routingNumber: ocrRoutingNumberInput.value.trim(),
    accountNumber: ocrAccountNumberInput.value.trim(),
  });
}

function sendFrontReviewCommand() {
  const amount = frontReviewAmountInput.value.trim() || 'the entered amount';
  const issuer = frontReviewIssuerInput.value.trim() || 'the entered issuer';
  const checkDate = frontReviewDateInput.value.trim() || 'the entered date';

  sendCommand('SPEAK_FRONT_REVIEW', 'CheckCapture', 'text', {
    text: `I've detected the front of your check. The amount is ${amount}, issued by ${issuer} on ${checkDate}. Are these details correct?`,
  });
}

function sendPostCaptureSummaryCommand() {
  const amount = summaryAmountInput.value.trim() || '$1,000';
  const account = summaryAccountInput.value.trim() || 'Checking account ending in 7-7-4-9';
  const issuer = summaryIssuerInput.value.trim() || 'University of California';
  const checkDate = summaryDateInput.value.trim() || 'April 15th';
  const routing = ocrRoutingNumberInput.value.trim() || '021000021';
  const accountNumber = ocrAccountNumberInput.value.trim() || '123456789';

  sendCommand('SPEAK_POST_CAPTURE_SUMMARY', 'Confirmation', 'text', {
    text: `You are depositing ${amount} into your ${account}. The check was issued by ${issuer}, dated ${checkDate}. Routing number is ${routing.split('').join('-')}. And account number is ${accountNumber.split('').join('-')}. To submit to your bank, say "confirm." To cancel, say "cancel."`,
  });
}

function sendSuccessSummaryCommand() {
  const availableNow = successAvailableNowInput.value.trim() || '$100.00';
  const remaining = successRemainingInput.value.trim() || '$900.00';
  const availableBy = successAvailableByInput.value.trim() || 'April 19th, 2026';
  const amount = summaryAmountInput.value.trim() || '$1,000.00';
  const date = summaryDateInput.value.trim() || 'April 15th, 2026';

  sendCommand('SPEAK_SUCCESS_SUMMARY', 'Success', 'text', {
    text: `We have received your check. Your deposit of ${amount} was submitted on ${date}. A total of ${availableNow} is available immediately. The remaining ${remaining} will be available by ${availableBy}.`,
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

frontReviewBtn.addEventListener('click', sendFrontReviewCommand);
postCaptureSummaryBtn.addEventListener('click', sendPostCaptureSummaryCommand);
successSummaryBtn.addEventListener('click', sendSuccessSummaryCommand);

saveNoteBtn.addEventListener('click', sendNote);
noteInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    sendNote();
  }
});
