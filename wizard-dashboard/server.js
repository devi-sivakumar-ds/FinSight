const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 7007;
const PUBLIC_DIR = path.join(__dirname, 'public');
const LOG_DIR = path.join(__dirname, 'logs');

let appSocket = null;
const dashboardSockets = new Set();
let lastAppState = null;
let lastSessionInfo = null;
const eventLog = [];
let currentSessionId = 'pending_session';

fs.mkdirSync(LOG_DIR, { recursive: true });

function getSessionId() {
  return lastSessionInfo?.sessionId || lastAppState?.sessionId || currentSessionId;
}

function getSessionLogPath(sessionId = getSessionId()) {
  return path.join(LOG_DIR, `${sessionId}.json`);
}

function readSessionLog(sessionId = getSessionId()) {
  const filePath = getSessionLogPath(sessionId);
  if (!fs.existsSync(filePath)) {
    return {
      sessionId,
      createdAt: new Date().toISOString(),
      session: null,
      latestAppState: null,
      events: [],
    };
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error('[wizard-dashboard] failed to read session log:', filePath, error);
    return {
      sessionId,
      createdAt: new Date().toISOString(),
      session: null,
      latestAppState: null,
      events: [],
    };
  }
}

function writeSessionLog(data, sessionId = getSessionId()) {
  fs.writeFileSync(getSessionLogPath(sessionId), JSON.stringify(data, null, 2));
}

function appendSessionEvent(entry, sessionId = getSessionId()) {
  const sessionLog = readSessionLog(sessionId);
  sessionLog.sessionId = sessionId;
  sessionLog.latestAppState = lastAppState;
  sessionLog.events.push(entry);
  writeSessionLog(sessionLog, sessionId);
}

function updateSessionInfo(session, sessionId = session.sessionId || getSessionId()) {
  const sessionLog = readSessionLog(sessionId);
  sessionLog.sessionId = sessionId;
  sessionLog.session = session;
  sessionLog.latestAppState = lastAppState;
  writeSessionLog(sessionLog, sessionId);
}

function updateLatestAppState(state, sessionId = state.sessionId || getSessionId()) {
  const sessionLog = readSessionLog(sessionId);
  sessionLog.sessionId = sessionId;
  sessionLog.latestAppState = state;
  writeSessionLog(sessionLog, sessionId);
}

function broadcastToDashboards(payload) {
  const raw = JSON.stringify(payload);
  for (const socket of dashboardSockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(raw);
    }
  }
}

function pushEvent(event) {
  eventLog.unshift(event);
  if (eventLog.length > 100) eventLog.pop();
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server error');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    return serveFile(res, path.join(PUBLIC_DIR, 'index.html'), 'text/html');
  }
  if (req.url === '/app.js') {
    return serveFile(res, path.join(PUBLIC_DIR, 'app.js'), 'application/javascript');
  }
  if (req.url === '/styles.css') {
    return serveFile(res, path.join(PUBLIC_DIR, 'styles.css'), 'text/css');
  }
  if (req.url === '/bootstrap') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      appConnected: !!appSocket,
      state: lastAppState,
      session: lastSessionInfo,
      events: eventLog,
      sessionLogPath: getSessionLogPath(),
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', socket => {
  socket.on('message', raw => {
    let message;

    try {
      message = JSON.parse(String(raw));
    } catch (error) {
      console.error('[wizard-dashboard] invalid message:', raw);
      return;
    }

    if (message.type === 'register_dashboard') {
      dashboardSockets.add(socket);
      socket.send(JSON.stringify({
        type: 'dashboard_bootstrap',
        appConnected: !!appSocket,
        state: lastAppState,
        session: lastSessionInfo,
        events: eventLog,
        sessionLogPath: getSessionLogPath(),
      }));
      return;
    }

    if (message.type === 'operator_command') {
      const sessionId = message.command.sessionId || getSessionId();
      const event = {
        timestamp: new Date().toISOString(),
        sessionId,
        summary: `Sent ${message.command.id}`,
      };
      pushEvent(event);
      appendSessionEvent({
        ...event,
        type: 'operator_command_sent',
        commandId: message.command.id,
        context: message.command.context,
        payload: message.command.payload,
        appState: lastAppState,
      }, sessionId);
      if (appSocket && appSocket.readyState === WebSocket.OPEN) {
        appSocket.send(JSON.stringify(message));
      }
      broadcastToDashboards({
        type: 'dashboard_event_log',
        events: eventLog,
        sessionLogPath: getSessionLogPath(sessionId),
      });
      return;
    }

    if (message.type === 'operator_note') {
      const sessionId = message.sessionId || getSessionId();
      const event = {
        timestamp: new Date().toISOString(),
        sessionId,
        summary: `Note: ${message.note}`,
      };
      pushEvent(event);
      appendSessionEvent({
        ...event,
        type: 'operator_note',
        note: message.note,
        appState: lastAppState,
      }, sessionId);
      broadcastToDashboards({
        type: 'dashboard_event_log',
        events: eventLog,
        sessionLogPath: getSessionLogPath(sessionId),
      });
      return;
    }

    if (message.type === 'app_state') {
      appSocket = socket;
      lastAppState = message.state;
      currentSessionId = message.state.sessionId || currentSessionId;
      updateLatestAppState(message.state, currentSessionId);
      appendSessionEvent({
        timestamp: message.state.updatedAt || new Date().toISOString(),
        sessionId: currentSessionId,
        type: 'app_state_updated',
        summary: `App state: ${message.state.currentScreenTitle || message.state.currentContext}`,
        appState: message.state,
      }, currentSessionId);
      broadcastToDashboards({
        type: 'dashboard_state',
        appConnected: true,
        state: lastAppState,
        sessionLogPath: getSessionLogPath(currentSessionId),
      });
      return;
    }

    if (message.type === 'session_info') {
      appSocket = socket;
      lastSessionInfo = message.session;
      currentSessionId = message.session.sessionId || currentSessionId;
      updateSessionInfo(message.session, currentSessionId);
      appendSessionEvent({
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
        type: 'session_started',
        summary: 'Session info received',
        session: message.session,
        appState: lastAppState,
      }, currentSessionId);
      broadcastToDashboards({
        type: 'dashboard_session',
        session: lastSessionInfo,
        sessionLogPath: getSessionLogPath(currentSessionId),
      });
      return;
    }

    if (message.type === 'log_event') {
      const sessionId = message.event.sessionId || getSessionId();
      const event = {
        timestamp: message.event.timestamp,
        sessionId,
        summary: message.event.commandId
          ? `${message.event.type}: ${message.event.commandId}`
          : message.event.type,
      };
      pushEvent(event);
      appendSessionEvent({
        ...message.event,
        sessionId,
        appState: lastAppState,
      }, sessionId);
      broadcastToDashboards({
        type: 'dashboard_event_log',
        events: eventLog,
        sessionLogPath: getSessionLogPath(sessionId),
      });
      return;
    }

    if (message.type === 'pong') {
      return;
    }
  });

  socket.on('close', () => {
    dashboardSockets.delete(socket);
    if (socket === appSocket) {
      const sessionId = getSessionId();
      appSocket = null;
      appendSessionEvent({
        timestamp: new Date().toISOString(),
        sessionId,
        type: 'session_ended',
        summary: 'App disconnected',
        appState: lastAppState,
      }, sessionId);
      broadcastToDashboards({
        type: 'dashboard_state',
        appConnected: false,
        state: lastAppState,
        sessionLogPath: getSessionLogPath(sessionId),
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`[wizard-dashboard] running at http://localhost:${PORT}`);
});
