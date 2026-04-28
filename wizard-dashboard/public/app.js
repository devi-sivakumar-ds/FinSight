const dashboardStatus = document.getElementById('dashboard-status');
const appStatus = document.getElementById('app-status');
const sessionInfoEl = document.getElementById('session-info');
const appStateEl = document.getElementById('app-state');
const eventLogEl = document.getElementById('event-log');
const frontReviewButtons = document.querySelectorAll('[data-action="front-review"]');
const postCaptureSummaryButtons = document.querySelectorAll('[data-action="post-capture-summary"]');
const successAvailableNowInput = document.getElementById('success-available-now');
const successRemainingInput = document.getElementById('success-remaining');
const successAvailableByInput = document.getElementById('success-available-by');
const successSummaryBtn = document.getElementById('success-summary-btn');
const ocrSuccessButtons = document.querySelectorAll('[data-action="ocr-success"]');
const ocrPartialButtons = document.querySelectorAll('[data-action="ocr-partial"]');
const ocrFailButtons = document.querySelectorAll('[data-action="ocr-fail"]');
const noteInput = document.getElementById('note-input');
const saveNoteBtn = document.getElementById('save-note-btn');
const logPathEl = document.getElementById('log-path');
const postCaptureScopes = document.querySelectorAll('[data-post-capture-scope]');

let currentSessionId = 'local_dashboard_session';
let activePostCaptureScope = postCaptureScopes[0] || null;

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

function getPostCaptureValues(trigger) {
  const scope = trigger?.closest('[data-post-capture-scope]') || activePostCaptureScope;
  const query = field => scope?.querySelector(`[data-field="${field}"]`) || document.querySelector(`[data-field="${field}"]`);

  const checkNumberInput = query('ocr-check-number');
  const routingNumberInput = query('ocr-routing-number');
  const accountNumberInput = query('ocr-account-number');
  const summaryAmountInput = query('summary-amount');
  const summaryAccountInput = query('summary-account');
  const summaryIssuerInput = query('summary-issuer');
  const summaryDateInput = query('summary-date');

  return {
    checkNumber: checkNumberInput?.value.trim() || '',
    routingNumber: routingNumberInput?.value.trim() || '',
    accountNumber: accountNumberInput?.value.trim() || '',
    amount: summaryAmountInput?.value.trim() || '$1,000',
    account: summaryAccountInput?.value.trim() || 'Checking account ending in 7-7-4-9',
    issuer: summaryIssuerInput?.value.trim() || 'University of California',
    checkDate: summaryDateInput?.value.trim() || 'April 15th',
  };
}

function sendOcrCommand(id, outcome, trigger) {
  const { checkNumber, routingNumber, accountNumber } = getPostCaptureValues(trigger);

  sendCommand(id, 'OCRProcessing', 'ocrOutcome', {
    outcome,
    checkNumber,
    routingNumber,
    accountNumber,
  });
}

function getFrontReviewValues(trigger) {
  const scope = trigger?.closest('[data-front-review-scope]');
  const amountInput = scope?.querySelector('[data-field="front-review-amount"]') || document.getElementById('front-review-amount');
  const issuerInput = scope?.querySelector('[data-field="front-review-issuer"]') || document.getElementById('front-review-issuer');
  const dateInput = scope?.querySelector('[data-field="front-review-date"]') || document.getElementById('front-review-date');

  return {
    amount: amountInput?.value.trim() || 'the entered amount',
    issuer: issuerInput?.value.trim() || 'the entered issuer',
    checkDate: dateInput?.value.trim() || 'the entered date',
  };
}

function sendFrontReviewCommand(trigger) {
  const { amount, issuer, checkDate } = getFrontReviewValues(trigger);

  sendCommand('SPEAK_FRONT_REVIEW', 'CheckCapture', 'text', {
    text: `I've detected the front of your check. The amount is ${amount}, issued by ${issuer} on ${checkDate}. Are these details correct?`,
  });
}

function sendFrontCaptureSuccessCommand(trigger) {
  const { amount, issuer, checkDate } = getFrontReviewValues(trigger);

  sendCommand('CAPTURE_FRONT_SUCCESS', 'CheckCapture', 'text', {
    text: `I've detected the front of your check. The amount is ${amount}, issued by ${issuer} on ${checkDate}. Are these details correct?`,
  });
}

function sendPostCaptureSummaryCommand(trigger) {
  const { amount, account, issuer, checkDate, routingNumber: routing, accountNumber } = getPostCaptureValues(trigger);
  const accountDigitsMatch = account.match(/(\d[\d-\s]*)$/);
  const accountDigits = accountDigitsMatch ? accountDigitsMatch[1].replace(/\D/g, '') : '';
  const accountLabel = account.toLowerCase().includes('savings') ? 'Savings' : 'Checking';

  sendCommand('SPEAK_POST_CAPTURE_SUMMARY', 'Confirmation', 'text', {
    text: `You are depositing ${amount} into your ${account}. The check was issued by ${issuer}, dated ${checkDate}. Routing number is ${routing.split('').join('-')}. And account number is ${accountNumber.split('').join('-')}. To submit to your bank, say "confirm." To cancel, say "cancel."`,
    amountText: amount,
    accountLabel,
    accountDigits,
  });
}

function sendSuccessSummaryCommand() {
  const availableNow = successAvailableNowInput.value.trim() || '$100.00';
  const remaining = successRemainingInput.value.trim() || '$900.00';
  const availableBy = successAvailableByInput.value.trim() || 'April 19th, 2026';
  const { amount, checkDate: date } = getPostCaptureValues();

  sendCommand('SPEAK_SUCCESS_SUMMARY', 'Success', 'text', {
    text: `We have received your check. Your deposit of ${amount} was submitted on ${date}. A total of ${availableNow} is available immediately. The remaining ${remaining} will be available by ${availableBy}.`,
  });
}

function sendConfirmDepositCommand() {
  sendCommand('CONFIRM_DEPOSIT', 'Confirmation');
}

function sendFinalConfirmPromptCommand() {
  const { amount, account } = getPostCaptureValues();
  const accountDigitsMatch = account.match(/(\d[\d-\s]*)$/);
  const accountDigits = accountDigitsMatch ? accountDigitsMatch[1].replace(/\D/g, '') : '';
  const accountLabel = account.toLowerCase().includes('savings') ? 'Savings' : 'Checking';

  sendCommand('SPEAK_FINAL_CONFIRM_PROMPT', 'Confirmation', 'text', {
    amountText: amount,
    accountLabel,
    accountDigits,
  });
}

document.querySelectorAll('button[data-id]').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.id === 'CAPTURE_FRONT_SUCCESS') {
      sendFrontCaptureSuccessCommand(button);
      return;
    }

    if (button.dataset.id === 'SPEAK_FINAL_CONFIRM_PROMPT') {
      sendFinalConfirmPromptCommand();
      return;
    }

    if (button.dataset.id === 'CONFIRM_DEPOSIT') {
      sendConfirmDepositCommand();
      return;
    }

    sendCommand(button.dataset.id, button.dataset.context);
  });
});

ocrSuccessButtons.forEach(button => {
  button.addEventListener('click', () => {
    sendOcrCommand('OCR_SUCCESS', 'success', button);
  });
});

ocrPartialButtons.forEach(button => {
  button.addEventListener('click', () => {
    sendOcrCommand('OCR_PARTIAL', 'partial', button);
  });
});

ocrFailButtons.forEach(button => {
  button.addEventListener('click', () => {
    sendOcrCommand('OCR_FAIL', 'fail', button);
  });
});

postCaptureScopes.forEach(scope => {
  scope.addEventListener('focusin', () => {
    activePostCaptureScope = scope;
  });
  scope.addEventListener('click', () => {
    activePostCaptureScope = scope;
  });
});

frontReviewButtons.forEach(button => {
  button.addEventListener('click', () => sendFrontReviewCommand(button));
});
postCaptureSummaryButtons.forEach(button => {
  button.addEventListener('click', () => sendPostCaptureSummaryCommand(button));
});
successSummaryBtn.addEventListener('click', sendSuccessSummaryCommand);

saveNoteBtn.addEventListener('click', sendNote);
noteInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    sendNote();
  }
});
