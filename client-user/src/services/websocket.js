const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

class CustomerWebSocketService {
  constructor() {
    this._ws = null;
    this._subscribers = new Set();
    this._reconnectTimer = null;
    this._reconnectAttempts = 0;
    this._intentionalClose = false;
  }

  connect() {
    this._intentionalClose = false;
    if (this._ws && (this._ws.readyState === WebSocket.OPEN || this._ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this._ws = new WebSocket(WS_URL);

      this._ws.onopen = () => {
        console.info('[CustomerWS] Connected to RevivePilot real-time stream:', WS_URL);
        this._reconnectAttempts = 0;
      };

      this._ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._subscribers.forEach((cb) => cb(data));
        } catch (e) {
          console.warn('[CustomerWS] Failed to parse message:', e);
        }
      };

      this._ws.onerror = (err) => {
        if (this._intentionalClose) return;
        console.warn('[CustomerWS] Connection issue, will reconnect.');
      };

      this._ws.onclose = () => {
        this._ws = null;
        if (!this._intentionalClose) {
          this._scheduleReconnect();
        }
      };
    } catch (err) {
      console.warn('[CustomerWS] Init error:', err);
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (this._reconnectAttempts >= 8) return;

    const delay = Math.min(1000 * Math.pow(1.5, this._reconnectAttempts), 10000);
    this._reconnectAttempts++;
    this._reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  disconnect() {
    this._intentionalClose = true;
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (this._ws) {
      const ws = this._ws;
      this._ws = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.close(1000, 'Client unmount');
        } catch (_) {}
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => {
          try {
            ws.close(1000, 'Client unmount');
          } catch (_) {}
        };
      }
    }
  }
}

export const customerWsService = new CustomerWebSocketService();
