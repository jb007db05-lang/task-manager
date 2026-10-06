import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/services/authTokens';
import type { ChatMessage } from '@/types/chat';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:4000';

/**
 * Socket.IO events
 */
export enum SocketEvents {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',

  // Project rooms
  JOIN_PROJECT = 'project:join',
  LEAVE_PROJECT = 'project:leave',

  // Messages
  MESSAGE_SEND = 'message:send',
  MESSAGE_RECEIVE = 'message:receive',
  MESSAGE_EDIT = 'message:edit',
  MESSAGE_DELETE = 'message:delete',
  MESSAGE_READ = 'message:read',

  // Thread
  THREAD_OPEN = 'thread:open',
  THREAD_CLOSE = 'thread:close',
  THREAD_REPLY = 'thread:reply',

  // Reactions
  REACTION_ADD = 'reaction:add',
  REACTION_REMOVE = 'reaction:remove',

  // Typing
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
  TYPING_UPDATE = 'typing:update',

  // Presence
  PRESENCE_JOIN = 'presence:join',
  PRESENCE_LEAVE = 'presence:leave',
  PRESENCE_UPDATE = 'presence:update',

  // Tasks
  TASK_ASSIGNED = 'task:assigned',
  TASK_BULK_ASSIGNED = 'task:bulk_assigned',

  // Invitations
  INVITATION_RECEIVED = 'invitation:received',
  INVITATION_ACCEPTED = 'invitation:accepted',
  INVITATION_REJECTED = 'invitation:rejected',
}

/**
 * Socket.IO response payload
 */
export interface SocketResponse {
  success: boolean;
  message?: string;
}

/**
 * Socket.IO message payload
 */
export interface MessagePayload {
  projectId: string;
  content: string;
  replyToId?: string;
}

/**
 * Socket.IO message sent confirmation
 */
export interface MessageSentResponse {
  success: boolean;
  message?: ChatMessage;
  error?: string;
}

/**
 * Message received event payload
 */
export interface MessageReceivePayload {
  message: ChatMessage;
}

/**
 * Message edit event payload
 */
export interface MessageEditPayload {
  message: ChatMessage;
}

/**
 * Message delete event payload
 */
export interface MessageDeletePayload {
  messageId: string;
  deletedBy: string;
}

/**
 * Message read event payload
 */
export interface MessageReadPayload {
  userId: string;
  messageIds?: string[];
  timestamp: string;
}

/**
 * Reaction event payload
 */
export interface ReactionPayload {
  projectId: string;
  messageId: string;
  emoji: string;
}

/**
 * Reaction update event payload
 */
export interface ReactionUpdatePayload {
  messageId: string;
  userId: string;
  emoji: string;
  reactions: { userId: string; emoji: string; createdAt: string }[];
}

/**
 * Typing event payload
 */
export interface TypingPayload {
  projectId: string;
}

/**
 * Typing update event payload
 */
export interface TypingUpdatePayload {
  projectId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

/**
 * Project join response
 */
export interface JoinProjectResponse {
  success: boolean;
  projectId?: string;
  unreadCount?: number;
  error?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private currentProjectId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  /**
   * Initialize socket connection
   */
  public connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      // Read on every (re)connect so a refreshed access token is picked up.
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    this.setupEventHandlers();
  }

  /**
   * Disconnect socket
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentProjectId = null;
    }
  }

  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Join a project room
   */
  public async joinProject(projectId: string): Promise<JoinProjectResponse> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      // Leave previous project if any
      if (this.currentProjectId && this.currentProjectId !== projectId) {
        this.leaveProject();
      }

      this.socket.emit(SocketEvents.JOIN_PROJECT, { projectId }, (response: JoinProjectResponse) => {
        if (response.success) {
          this.currentProjectId = projectId;
        }
        resolve(response);
      });
    });
  }

  /**
   * Leave current project room
   */
  public leaveProject(): void {
    if (this.socket?.connected && this.currentProjectId) {
      this.socket.emit(SocketEvents.LEAVE_PROJECT);
      this.currentProjectId = null;
    }
  }

  /**
   * Send a message
   */
  public sendMessage(payload: MessagePayload): void {
    this.socket?.emit(SocketEvents.MESSAGE_SEND, payload);
  }

  /**
   * Edit a message
   */
  public editMessage(payload: { projectId: string; messageId: string; content: string }): void {
    this.socket?.emit(SocketEvents.MESSAGE_EDIT, payload);
  }

  /**
   * Delete a message
   */
  public deleteMessage(payload: { projectId: string; messageId: string }): void {
    this.socket?.emit(SocketEvents.MESSAGE_DELETE, payload);
  }

  /**
   * Mark messages as read
   */
  public markMessagesAsRead(payload: { projectId: string; messageIds?: string[] }): void {
    this.socket?.emit(SocketEvents.MESSAGE_READ, payload);
  }

  /**
   * Add reaction to a message
   */
  public addReaction(payload: ReactionPayload): void {
    this.socket?.emit(SocketEvents.REACTION_ADD, payload);
  }

  /**
   * Remove reaction from a message
   */
  public removeReaction(payload: ReactionPayload): void {
    this.socket?.emit(SocketEvents.REACTION_REMOVE, payload);
  }

  /**
   * Start typing indicator
   */
  public startTyping(projectId: string): void {
    this.socket?.emit(SocketEvents.TYPING_START, { projectId });
  }

  /**
   * Stop typing indicator
   */
  public stopTyping(projectId: string): void {
    this.socket?.emit(SocketEvents.TYPING_STOP, { projectId });
  }

  /**
   * Open thread view
   */
  public openThread(projectId: string, messageId: string): void {
    this.socket?.emit(SocketEvents.THREAD_OPEN, { projectId, messageId });
  }

  /**
   * Close thread view
   */
  public closeThread(): void {
    this.socket?.emit(SocketEvents.THREAD_CLOSE);
  }

  /**
   * Register event listener
   */
  public on<T = unknown>(event: string, callback: (data: T) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback as (...args: unknown[]) => void);
    this.socket?.on(event, callback as (...args: unknown[]) => void);
  }

  /**
   * Remove event listener
   */
  public off<T = unknown>(event: string, callback: (data: T) => void): void {
    this.eventListeners.get(event)?.delete(callback as (...args: unknown[]) => void);
    this.socket?.off(event, callback as (...args: unknown[]) => void);
  }

  /**
   * Remove all listeners for an event
   */
  public removeAllListeners(event: string): void {
    this.eventListeners.delete(event);
    this.socket?.removeAllListeners(event);
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on(SocketEvents.CONNECT, () => {
      console.info('[Socket] Connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.socket.on(SocketEvents.DISCONNECT, (reason: string) => {
      console.info('[Socket] Disconnected:', reason);
      this.currentProjectId = null;
      this.emit('disconnected', { reason });
    });

    this.socket.on(SocketEvents.CONNECT_ERROR, (error: Error) => {
      console.error('[Socket] Connection error:', error);
      this.reconnectAttempts++;
      this.emit('error', { error: error.message });

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('maxReconnectAttemptsReached');
      }
    });

    // Generic error handler
    this.socket.on('error', (data: { message: string }) => {
      console.error('[Socket] Error:', data.message);
      this.emit('error', data);
    });

    // Re-register all application-level listeners from our Map
    this.eventListeners.forEach((callbacks, event) => {
      // Don't duplicate internal handlers that we already set up above
      if (['connect', 'disconnect', 'connect_error', 'error'].includes(event)) return;
      
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Socket] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get current project ID
   */
  public getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }
}

export const socketService = new SocketService();
export default socketService;
