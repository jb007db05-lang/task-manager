/**
 * Chat Message Types
 * Extensible for TEXT, SYSTEM, and AI messages
 */
export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  AI = 'AI',
}

/**
 * Individual reaction on a message
 */
export interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: string;
}

/**
 * Message metadata for extensibility
 */
export interface MessageMetadata {
  action?: string;
  entityId?: string;
  entityType?: string;
  aiContext?: {
    model?: string;
    requestId?: string;
    promptTokens?: number;
    completionTokens?: number;
  };
  editHistory?: {
    content: string;
    editedAt: string;
  }[];
  [key: string]: unknown;
}

/**
 * Chat message sender
 */
export interface MessageSender {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Parent message reference (for replies)
 */
export interface ReplyToMessage {
  id: string;
  content: string;
  sender: MessageSender | null;
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  projectId?: string | null;
  workspaceId?: string | null;
  recipientId?: string | null;
  recipient?: MessageSender | null;
  senderId: string | null;
  sender: MessageSender | null;
  type: MessageType;
  content: string;
  replyToId: string | null;
  replyTo: ReplyToMessage | null;
  readBy: string[];
  reactions: MessageReaction[];
  mentions?: { userId: string; mentionedBy: string }[];
  isEdited: boolean;
  isDeleted: boolean;
  metadata: MessageMetadata;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  status?: 'sending' | 'sent' | 'failed';
}

/**
 * Paginated messages result
 */
export interface MessageListResult {
  messages: ChatMessage[];
  hasMore: boolean;
}

/**
 * Typing indicator
 */
export interface TypingUser {
  userId: string;
  userName: string;
  isTyping: boolean;
}

/**
 * Presence update
 */
export interface PresenceUpdate {
  userId: string;
  timestamp: string;
}
