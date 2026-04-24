// ============================================================================
// Wizard Client
// App-side WebSocket client for pure Wizard of Oz mode.
// Connects the phone app to the laptop-local dashboard/server over adb reverse.
// ============================================================================

import {
  WizardAppState,
  WizardLogEvent,
  WizardMessageFromApp,
  WizardMessageFromDashboard,
  WizardOperatorCommand,
  WizardSessionInfo,
} from '@/types/wizard';

const WIZARD_SOCKET_URL = 'ws://127.0.0.1:7007';
const RECONNECT_DELAY_MS = 2500;

function createSessionId(): string {
  return `woz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

class WizardClient {
  private socket: WebSocket | null = null;
  private socketUrl = WIZARD_SOCKET_URL;
  private manuallyStopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private outboundQueue: string[] = [];
  private commandListeners = new Set<(command: WizardOperatorCommand) => void>();
  private connectionListeners = new Set<(connected: boolean) => void>();
  private sessionInfo: WizardSessionInfo = {
    sessionId: createSessionId(),
    studyMode: 'pure_woz',
    connectedAt: new Date().toISOString(),
  };

  public start(): void {
    this.manuallyStopped = false;

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    console.log('[WizardClient] Connecting to', this.socketUrl);
    this.socket = new WebSocket(this.socketUrl);

    this.socket.onopen = () => {
      console.log('[WizardClient] Connected');
      this.notifyConnection(true);
      this.flushQueue();
      this.sendSessionInfo();
    };

    this.socket.onmessage = event => {
      this.handleIncomingMessage(String(event.data));
    };

    this.socket.onerror = error => {
      console.error('[WizardClient] Socket error:', error);
    };

    this.socket.onclose = () => {
      console.log('[WizardClient] Disconnected');
      this.notifyConnection(false);
      this.socket = null;

      if (!this.manuallyStopped) {
        this.scheduleReconnect();
      }
    };
  }

  public stop(): void {
    this.manuallyStopped = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public getSessionInfo(): WizardSessionInfo {
    return this.sessionInfo;
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public addCommandListener(cb: (command: WizardOperatorCommand) => void): () => void {
    this.commandListeners.add(cb);
    return () => this.commandListeners.delete(cb);
  }

  public addConnectionListener(cb: (connected: boolean) => void): () => void {
    this.connectionListeners.add(cb);
    return () => this.connectionListeners.delete(cb);
  }

  public sendAppState(state: WizardAppState): void {
    this.sendMessage({
      type: 'app_state',
      state,
    });
  }

  public sendSessionInfo(partial?: Partial<WizardSessionInfo>): void {
    if (partial) {
      this.sessionInfo = { ...this.sessionInfo, ...partial };
    }

    this.sendMessage({
      type: 'session_info',
      session: this.sessionInfo,
    });
  }

  public sendLogEvent(event: WizardLogEvent): void {
    this.sendMessage({
      type: 'log_event',
      event,
    });
  }

  private sendMessage(message: WizardMessageFromApp): void {
    const raw = JSON.stringify(message);

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(raw);
      return;
    }

    this.outboundQueue.push(raw);
  }

  private flushQueue(): void {
    if (this.socket?.readyState !== WebSocket.OPEN || this.outboundQueue.length === 0) {
      return;
    }

    const queued = [...this.outboundQueue];
    this.outboundQueue = [];
    queued.forEach(raw => this.socket?.send(raw));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.start();
    }, RECONNECT_DELAY_MS);
  }

  private handleIncomingMessage(raw: string): void {
    let message: WizardMessageFromDashboard;

    try {
      message = JSON.parse(raw) as WizardMessageFromDashboard;
    } catch (error) {
      console.error('[WizardClient] Failed to parse dashboard message:', raw);
      return;
    }

    if (message.type === 'ping') {
      this.sendMessage({
        type: 'pong',
        timestamp: message.timestamp,
      });
      return;
    }

    if (message.type === 'operator_command') {
      console.log('[WizardClient] Received operator command:', message.command.id);
      this.commandListeners.forEach(listener => listener(message.command));
    }
  }

  private notifyConnection(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }
}

export default new WizardClient();
