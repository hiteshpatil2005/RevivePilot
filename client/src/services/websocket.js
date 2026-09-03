/**
 * websocket.js — Realtime Socket.IO & WebSocket service for RevivePilot.
 *
 * Uses Socket.IO client for robust auto-reconnection, low-latency event
 * streaming, and room broadcasting across all dashboard components.
 */

import { io } from 'socket.io-client';

const DEFAULT_SERVER_URL = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : 'http://localhost:8000';

const SOCKET_URL = import.meta.env.VITE_WS_URL
  ? import.meta.env.VITE_WS_URL.replace(/^ws/, 'http').replace(/\/ws\/?$/, '')
  : DEFAULT_SERVER_URL;

const STATUS = {
  DISCONNECTED:  'DISCONNECTED',
  CONNECTING:    'CONNECTING',
  CONNECTED:     'CONNECTED',
  RECONNECTING:  'RECONNECTING',
  DEMO:          'DEMO',
};

class RealtimeSocketService {
  constructor() {
    this._socket          = null;
    this._status          = STATUS.DISCONNECTED;
    this._subscribers     = new Set();
    this._statusListeners = new Set();
    this._intentionalClose = false;
    this._demoMode        = false;
  }

  get status() { return this._status; }
  get isDemoMode() { return this._demoMode; }

  /**
   * connect() — Establish Socket.IO real-time connection.
   */
  connect() {
    if (this._socket && this._socket.connected) {
      return;
    }

    this._intentionalClose = false;
    this._setStatus(STATUS.CONNECTING);

    const token = localStorage.getItem('revivepilot_token') || sessionStorage.getItem('revivepilot_token');
    const authPayload = token ? { token } : {};

    try {
      this._socket = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: authPayload,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this._socket.on('connect', () => {
        this._setStatus(STATUS.CONNECTED);
        console.info('[Socket.IO] Connected to', SOCKET_URL, 'SID:', this._socket.id);

        // Join merchant room
        const userJson = localStorage.getItem('revivepilot_user');
        if (userJson) {
          try {
            const user = JSON.parse(userJson);
            if (user.merchant_id || user.merchantId) {
              this._socket.emit('join_merchant', { merchant_id: user.merchant_id || user.merchantId });
            }
          } catch (_) {}
        }
      });

      // Listen for unified backend events
      this._socket.on('event', (data) => {
        this._notifySubscribers(data);
      });

      // Also listen for specific event types if emitted directly
      const knownEvents = [
        'payment.created', 'payment.failed', 'payment.captured',
        'recovery.created', 'recovery.updated', 'recovery.success',
        'agent.reasoning', 'policy.evaluated',
      ];
      knownEvents.forEach((ev) => {
        this._socket.on(ev, (data) => {
          this._notifySubscribers({ type: ev, data });
        });
      });

      this._socket.on('disconnect', (reason) => {
        console.info('[Socket.IO] Disconnected:', reason);
        if (this._intentionalClose) {
          this._setStatus(STATUS.DISCONNECTED);
        } else {
          this._setStatus(STATUS.RECONNECTING);
        }
      });

      this._socket.on('connect_error', (err) => {
        console.warn('[Socket.IO] Connection error:', err.message);
        this._setStatus(STATUS.RECONNECTING);
      });
    } catch (err) {
      console.error('[Socket.IO] Initialization failed:', err);
      this._setStatus(STATUS.DISCONNECTED);
    }
  }

  /**
   * disconnect() — Clean, intentional disconnect.
   */
  disconnect() {
    this._intentionalClose = true;
    if (this._socket) {
      this._socket.disconnect();
      this._socket = null;
    }
    this._setStatus(STATUS.DISCONNECTED);
  }

  /**
   * subscribe(handler) — Register an event handler.
   */
  subscribe(handler) {
    this._subscribers.add(handler);
    return () => this._subscribers.delete(handler);
  }

  /**
   * onStatusChange(handler) — Register a connection status listener.
   */
  onStatusChange(handler) {
    this._statusListeners.add(handler);
    handler(this._status);
    return () => this._statusListeners.delete(handler);
  }

  /**
   * send(data) — Send event or message to backend socket.
   */
  send(data) {
    if (this._socket && this._socket.connected) {
      const eventName = data.type || 'message';
      this._socket.emit(eventName, data);
    } else {
      console.warn('[Socket.IO] Cannot send — not connected. Status:', this._status);
    }
  }

  /**
   * dispatchEvent(event) — Inject an event directly into subscribers.
   */
  dispatchEvent(event) {
    this._notifySubscribers(event);
  }

  _setStatus(status) {
    if (this._status === status) return;
    this._status = status;
    this._statusListeners.forEach((listener) => {
      try { listener(status); } catch {}
    });
  }

  _notifySubscribers(event) {
    this._subscribers.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.warn('[Socket.IO] Subscriber handler error:', err);
      }
    });
  }
}

// Singleton instance export
export const wsService = new RealtimeSocketService();
export { STATUS as WS_STATUS };
