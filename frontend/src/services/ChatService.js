// src/services/ChatService.js
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const WS_BASE_URL = 'http://localhost:8080/ws-chat';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 2000; // 2 seconds

class ChatService {
  constructor() {
    this.stompClient = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.onMessageReceivedCallbacks = [];
    this.onErrorReceivedCallbacks = [];
    this.onConnectionStatusCallbacks = [];
    this.currentToken = null;
  }

  /**
   * Connect to WebSocket server
   * @param {string} jwtToken - JWT authentication token
   * @param {Function} onMessageReceived - Callback for received messages
   * @param {Function} onConnectionStatus - Callback for connection status changes
   * @param {Function} onErrorReceived - Callback for error messages from server
   */
  connect(jwtToken, onMessageReceived, onConnectionStatus, onErrorReceived) {
    if (this.connected) {
      console.log('Already connected to chat');
      return;
    }

    this.currentToken = jwtToken;

    if (onMessageReceived) {
      this.onMessageReceivedCallbacks.push(onMessageReceived);
    }

    if (onConnectionStatus) {
      this.onConnectionStatusCallbacks.push(onConnectionStatus);
    }

    if (onErrorReceived) {
      this.onErrorReceivedCallbacks.push(onErrorReceived);
    }

    try {
      const socket = new SockJS(WS_BASE_URL);

      this.stompClient = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          Authorization: `Bearer ${jwtToken}`,
        },
        debug: () => {}, // Disable debug logs
        reconnectDelay: 0, // We handle reconnection manually
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          console.log('Connected to WebSocket');
          this.connected = true;
          this.reconnectAttempts = 0;
          this._notifyConnectionStatus('connected');

          // Subscribe to personal message queue
          this._subscribeToMessages();
          this._subscribeToErrors();

          // Process queued messages
          this._processMessageQueue();
        },
        onStompError: (frame) => {
          console.error('❌ STOMP error:', frame.headers['message']);
          console.error('Details:', frame.body);
          this._handleConnectionError();
        },
        onWebSocketClose: (event) => {
          console.log('WebSocket closed:', event);
          this.connected = false;
          this._notifyConnectionStatus('disconnected');
          this._attemptReconnect();
        },
        onWebSocketError: (error) => {
          console.error('WebSocket error:', error);
          this._handleConnectionError();
        },
      });

      this.stompClient.activate();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this._handleConnectionError();
    }
  }

  /**
   * Subscribe to personal message queue
   * @private
   */
  _subscribeToMessages() {
    if (!this.stompClient || !this.connected) {
      console.warn('Cannot subscribe: not connected');
      return;
    }

    const subscription = this.stompClient.subscribe(
      '/user/queue/messages',
      (message) => {
        try {
          const chatMessage = JSON.parse(message.body);

          // Notify all registered callbacks
          this.onMessageReceivedCallbacks.forEach((callback) => {
            callback(chatMessage);
          });
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      }
    );

    this.subscriptions.set('messages', subscription);
  }

  /**
   * Subscribe to personal error queue
   * @private
   */
  _subscribeToErrors() {
    if (!this.stompClient || !this.connected) {
      console.warn('Cannot subscribe to errors: not connected');
      return;
    }

    const subscription = this.stompClient.subscribe(
      '/user/queue/errors',
      (message) => {
        let payload = message?.body;
        try {
          payload = JSON.parse(message.body);
        } catch (error) {
          // Non-JSON payloads are treated as plain text
        }

        this.onErrorReceivedCallbacks.forEach((callback) => {
          callback(payload);
        });
      }
    );

    this.subscriptions.set('errors', subscription);
  }
  /**
   * Send a private message
   * @param {string} tripId - The ride/trip ID
   * @param {string} senderId - Sender's user ID
   * @param {string} recipientId - Recipient's user ID
   * @param {string} content - Message content
   * @returns {Promise<void>}
   */
  async sendMessage(tripId, senderId, recipientId, content) {
    const message = {
      tripId: String(tripId),
      senderId: String(senderId),
      recipientId: String(recipientId),
      content: content.trim(),
    };

    if (!this.connected) {
      this.messageQueue.push(message);
      this._notifyConnectionStatus('reconnecting');
      this._attemptReconnect();
      return Promise.reject(new Error('Not connected to chat server'));
    }

    try {
      this.stompClient.publish({
        destination: '/app/chat.sendPrivateMessage',
        body: JSON.stringify(message),
      });

      return Promise.resolve();
    } catch (error) {
      console.error('Failed to send message:', error);
      this.messageQueue.push(message);
      return Promise.reject(error);
    }
  }

  /**
   * Process queued messages after reconnection
   * @private
   */
  _processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`Processing ${this.messageQueue.length} queued messages`);

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach((message) => {
      this.stompClient.publish({
        destination: '/app/chat.sendPrivateMessage',
        body: JSON.stringify(message),
      });
    });
  }

  /**
   * Attempt to reconnect after connection loss
   * @private
   */
  _attemptReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Max reconnection attempts reached');
      this._notifyConnectionStatus('failed');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY_BASE * this.reconnectAttempts;

    console.log(
      `🔄 Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );

    this._notifyConnectionStatus('reconnecting');

    this.reconnectTimeout = setTimeout(() => {
      if (!this.connected && this.currentToken) {
        console.log('Attempting reconnection...');
        this.connect(this.currentToken);
      }
    }, delay);
  }

  /**
   * Handle connection errors
   * @private
   */
  _handleConnectionError() {
    this.connected = false;
    this._notifyConnectionStatus('disconnected');

    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this._attemptReconnect();
    }
  }

  /**
   * Notify connection status callbacks
   * @private
   * @param {string} status - Connection status: connected, disconnected, reconnecting, failed
   */
  _notifyConnectionStatus(status) {
    this.onConnectionStatusCallbacks.forEach((callback) => {
      callback(status);
    });
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get queued message count
   * @returns {number}
   */
  getQueuedMessageCount() {
    return this.messageQueue.length;
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    console.log('Disconnecting from chat...');

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Clear all subscriptions
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();

    // Deactivate STOMP client
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }

    this.connected = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.currentToken = null;

    this._notifyConnectionStatus('disconnected');

    console.log('Disconnected from chat');
  }

  /**
   * Clear all callbacks (useful for cleanup)
   */
  clearCallbacks() {
    this.onMessageReceivedCallbacks = [];
    this.onErrorReceivedCallbacks = [];
    this.onConnectionStatusCallbacks = [];
  }
}

// Singleton instance
const chatService = new ChatService();

export default chatService;
