/**
 * Tesla Fleet API Integration - Dashboard Client
 * 
 * This module provides a client for connecting to the telemetry server
 * and receiving real-time vehicle data.
 */

class TelemetryClient {
  constructor(serverUrl, token, onData, onError, onConnect, onDisconnect) {
    this.serverUrl = serverUrl;
    this.token = token;
    this.onData = onData || (() => {});
    this.onError = onError || console.error;
    this.onConnect = onConnect || (() => {});
    this.onDisconnect = onDisconnect || (() => {});
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
  }

  /**
   * Connect to the telemetry server
   */
  connect() {
    try {
      // Close existing connection if any
      if (this.ws) {
        this.ws.close();
      }

      // Create WebSocket connection with token
      const url = `${this.serverUrl}/dashboard?token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(url);

      // Set up WebSocket event handlers
      this.ws.onopen = this._handleOpen.bind(this);
      this.ws.onmessage = this._handleMessage.bind(this);
      this.ws.onerror = this._handleError.bind(this);
      this.ws.onclose = this._handleClose.bind(this);
    } catch (error) {
      this.onError('Failed to connect to telemetry server', error);
    }
  }

  /**
   * Disconnect from the telemetry server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Handle WebSocket connection open
   */
  _handleOpen(event) {
    console.log('Connected to telemetry server');
    this.reconnectAttempts = 0;
    this.onConnect();
  }

  /**
   * Handle incoming WebSocket messages
   */
  _handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      this.onData(data);
    } catch (error) {
      this.onError('Error parsing telemetry data', error);
    }
  }

  /**
   * Handle WebSocket errors
   */
  _handleError(error) {
    this.onError('Telemetry connection error', error);
  }

  /**
   * Handle WebSocket connection close
   */
  _handleClose(event) {
    this.onDisconnect(event);

    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000 && event.code !== 1001) {
      this._attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect to the server
   */
  _attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Reconnecting to telemetry server in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      this.onError('Max reconnection attempts reached');
    }
  }
}

// For browser usage
if (typeof window !== 'undefined') {
  window.TelemetryClient = TelemetryClient;
}

// For Node.js usage
if (typeof module !== 'undefined') {
  module.exports = TelemetryClient;
} 