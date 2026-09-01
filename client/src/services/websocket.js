/**
 * websocket.js — Centralized WebSocket service for RevivePilot.
 *
 * Architecture:
 *   WebSocket (native browser API)
 *     ↓
 *   WebSocketService (this file)
 *     ↓
 *   RealtimeContext.jsx  (single provider)
 *     ↓
 *   Application components (via useRealtime hook)
 *
 * Environment:
 *   VITE_WS_URL — WebSocket server URL (e.g. ws://localhost:8000/ws)
 *
 * Usage:
 *   import { wsService } from './websocket';
 *   wsService.connect();
 *   const unsub = wsService.subscribe(handler);
 *   wsService.send({ type: 'PING' });
 *   unsub(); // unsubscribe
 *   wsService.disconnect();
 *
 * Part 4 integration:
 *   Set VITE_WS_URL in .env.local → wsService will connect automatically.
 */

const DEFAULT_WS_HOST = typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000/ws` : 'ws://localhost:8000/ws';
const WS_URL = import.meta.env.VITE_WS_URL || DEFAULT_WS_HOST;

const STATUS = {
  DISCONNECTED:  'DISCONNECTED',
  CONNECTING:    'CONNECTING',
  CONNECTED:     'CONNECTED',
  RECONNECTING:  'RECONNECTING',
  DEMO:          'DEMO',          // fallback mode
};

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 1000; // doubles each attempt (exponential backoff)

class WebSocketService {
  constructor() {
    this._ws            = null;
    this._status        = STATUS.DISCONNECTED;
    this._subscribers   = new Set();         // handlers: (event) => void
    this._statusListeners = new Set();       // handlers: (status) => void
    this._reconnectAttempts = 0;
    this._reconnectTimer = null;
    this._intentionalClose = false;
    this._demoMode = false;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get status() { return this._status; }
  get isDemoMode() { return this._demoMode; }

  /**
   * connect() — Establish WebSocket connection with JWT token.
   */
  connect() {
    if (this._ws && (this._ws.readyState === WebSocket.OPEN || this._ws.readyState === WebSocket.CONNECTING)) {
      return; // already connected / connecting
    }

    this._intentionalClose = false;
    this._setStatus(STATUS.CONNECTING);

    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;

      this._ws = new WebSocket(url);
      this._ws.onopen    = this._onOpen.bind(this);
      this._ws.onmessage = this._onMessage.bind(this);
      this._ws.onerror   = this._onError.bind(this);
      this._ws.onclose   = this._onClose.bind(this);
    } catch (err) {
      console.warn('[WS] Failed to create WebSocket:', err);
      this._scheduleReconnect();
    }
  }

  /**
   * disconnect() — Clean, intentional disconnect. No reconnection.
   */
  disconnect() {
    this._intentionalClose = true;
    this._clearReconnectTimer();
    if (this._ws) {
      const ws = this._ws;
      this._ws = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try {
          ws.close(1000, 'Client disconnect');
        } catch (_) {}
      }
    }
    this._setStatus(STATUS.DISCONNECTED);
  }

  /**
   * subscribe(handler) — Register an event handler.
   * @param {Function} handler — called with parsed event object
   * @returns {Function} unsubscribe function
   */
  subscribe(handler) {
    this._subscribers.add(handler);
    return () => this._subscribers.delete(handler);
  }

  /**
   * onStatusChange(handler) — Register a connection status listener.
   * @param {Function} handler — called with STATUS string
   * @returns {Function} unsubscribe function
   */
  onStatusChange(handler) {
    this._statusListeners.add(handler);
    // Immediately emit current status
    handler(this._status);
    return () => this._statusListeners.delete(handler);
  }

  /**
   * send(data) — Send a message to the backend.
   * @param {Object} data — will be JSON-serialized
   */
  send(data) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(data));
    } else {
      console.warn('[WS] Cannot send — not connected. Status:', this._status);
    }
  }

  /**
   * dispatchEvent(event) — Inject an event directly (used by demo mode).
   * Flows through the same handler pipeline as real WS messages.
   * @param {Object} event
   */
  dispatchEvent(event) {
    this._notifySubscribers(event);
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _onOpen() {
    this._reconnectAttempts = 0;
    this._setStatus(STATUS.CONNECTED);
    console.info('[WS] Connected to', WS_URL);
  }

  _onMessage(msgEvent) {
    try {
      const event = JSON.parse(msgEvent.data);
      this._notifySubscribers(event);
    } catch (err) {
      console.warn('[WS] Failed to parse message:', msgEvent.data, err);
    }
  }

  _onError(err) {
    if (this._intentionalClose) return;
    console.warn('[WS] Connection error:', err);
    // onClose will fire after this
  }

  _onClose(closeEvent) {
    this._ws = null;
    if (this._intentionalClose) {
      this._setStatus(STATUS.DISCONNECTED);
      return;
    }
    console.info('[WS] Connection closed. Code:', closeEvent.code, '— scheduling reconnect.');
    this._scheduleReconnect();
  }

  _scheduleReconnect() {
    if (this._reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[WS] Max reconnect attempts reached. Giving up.');
      this._setStatus(STATUS.DISCONNECTED);
      return;
    }

    this._setStatus(STATUS.RECONNECTING);
    const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, this._reconnectAttempts);
    this._reconnectAttempts++;

    console.info(`[WS] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    this._reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  _clearReconnectTimer() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  _setStatus(status) {
    if (this._status === status) return;
    this._status = status;
    this._statusListeners.forEach(listener => {
      try { listener(status); } catch {}
    });
  }

  _notifySubscribers(event) {
    this._subscribers.forEach(handler => {
      try { handler(event); } catch (err) {
        console.warn('[WS] Subscriber error:', err);
      }
    });
  }
}

// Singleton instance — one WebSocket connection for the entire app
export const wsService = new WebSocketService();
export { STATUS as WS_STATUS };
