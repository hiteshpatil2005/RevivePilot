import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_WS_URL
  ? import.meta.env.VITE_WS_URL.replace(/^ws/, 'http').replace(/\/ws\/?$/, '')
  : 'http://localhost:8000';

class CustomerSocketService {
  constructor() {
    this.socket = null;
    this.subscribers = new Set();
    this.eventListeners = new Map();
    this.status = 'DISCONNECTED';
  }

  connect(token = null) {
    const authToken = token || localStorage.getItem('revivepilot_customer_token');
    if (!authToken) {
      console.info('[CustomerSocket] Awaiting customer JWT token to establish authenticated connection');
      return;
    }

    if (this.socket && this.socket.connected) {
      return;
    }

    this.status = 'CONNECTING';

    try {
      this.socket = io(SERVER_URL, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        auth: { token: authToken },
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        this.status = 'CONNECTED';
        console.info('[CustomerSocket] Authenticated Socket.IO connected. SID:', this.socket.id);

        // Re-attach custom event listeners
        this.eventListeners.forEach((handlers, event) => {
          handlers.forEach((h) => {
            this.socket.on(event, h);
          });
        });
      });

      // Listen for unified backend events
      this.socket.on('event', (envelope) => {
        this._notify(envelope);
      });

      // Listen for named event types
      const eventTypes = [
        'payment.created',
        'payment.failed',
        'payment.captured',
        'recovery.case.created',
        'recovery.analysis.started',
        'recovery.root_cause_identified',
        'recovery.strategy_selected',
        'recovery.action.completed',
        'payment.recovered',
        'customer.balance.updated',
      ];
      eventTypes.forEach((ev) => {
        this.socket.on(ev, (envelope) => {
          this._notify({ type: ev, event_type: ev, data: envelope, ...envelope });
        });
      });

      this.socket.on('disconnect', (reason) => {
        this.status = 'DISCONNECTED';
        console.info('[CustomerSocket] Disconnected:', reason);
      });

      this.socket.on('connect_error', (err) => {
        this.status = 'ERROR';
        console.warn('[CustomerSocket] Connection error:', err.message);
      });
    } catch (err) {
      console.error('[CustomerSocket] Failed to initialize socket:', err);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.status = 'DISCONNECTED';
  }

  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(handler);

    if (this.socket) {
      this.socket.on(event, handler);
    }

    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(handler);
    }
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  _notify(event) {
    this.subscribers.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.warn('[CustomerSocket] Subscriber error:', err);
      }
    });
  }
}

export const customerSocket = new CustomerSocketService();
