import api from '@/services/api';
import type { ChatMessage, MessageListResult, MessageType } from '@/types/chat';

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

export interface SendMessageInput {
  content: string;
  replyToId?: string;
  type?: MessageType;
  metadata?: MessageMetadata;
}

export interface EditMessageInput {
  content: string;
}

export interface PaginationParams {
  limit?: number;
  before?: string;
  after?: string;
}

interface MessagesResponse {
  message: string;
  data: MessageListResult;
}

interface MessageResponse {
  message: string;
  data: { message: ChatMessage };
}

interface UnreadCountResponse {
  message: string;
  data: { count: number };
}

interface DeleteResponse {
  message: string;
  data: { id: string };
}

/**
 * Get messages for a project
 */
export const getMessages = async (
  projectId: string,
  params?: PaginationParams
): Promise<MessageListResult> => {
  const response = await api.get<MessagesResponse>(`/projects/${projectId}/chat/messages`, {
    params,
  });
  return response.data.data;
};

/**
 * Send a message
 */
export const sendMessage = async (
  projectId: string,
  payload: SendMessageInput
): Promise<ChatMessage> => {
  const response = await api.post<MessageResponse>(
    `/projects/${projectId}/chat/messages`,
    payload
  );
  return response.data.data.message;
};

export interface SendWorkspaceMessageInput {
  content: string;
  recipientId?: string;
  replyToId?: string;
  type?: MessageType;
  metadata?: MessageMetadata;
  mentions?: string[];
}

export interface WorkspacePaginationParams extends PaginationParams {
  recipientId?: string;
}

/**
 * Get messages for a workspace (common lounge or direct messages)
 */
export const getWorkspaceMessages = async (
  workspaceId: string,
  params?: WorkspacePaginationParams
): Promise<MessageListResult> => {
  const response = await api.get<MessagesResponse>(`/workspaces/${workspaceId}/chat/messages`, {
    params,
  });
  return response.data.data;
};

/**
 * Send a message at the workspace level (common lounge or direct message)
 */
export const sendWorkspaceMessage = async (
  workspaceId: string,
  payload: SendWorkspaceMessageInput
): Promise<ChatMessage> => {
  const response = await api.post<{ message: string; data: ChatMessage }>(
    `/workspaces/${workspaceId}/chat/messages`,
    payload
  );
  return response.data.data;
};

/**
 * Edit a message
 */
export const editMessage = async (
  projectId: string,
  messageId: string,
  payload: EditMessageInput
): Promise<ChatMessage> => {
  const response = await api.put<MessageResponse>(
    `/projects/${projectId}/chat/messages/${messageId}`,
    payload
  );
  return response.data.data.message;
};

/**
 * Delete a message
 */
export const deleteMessage = async (
  projectId: string,
  messageId: string
): Promise<string> => {
  const response = await api.delete<DeleteResponse>(
    `/projects/${projectId}/chat/messages/${messageId}`
  );
  return response.data.data.id;
};

/**
 * Get thread replies for a message
 */
export const getThreadReplies = async (
  projectId: string,
  messageId: string,
  params?: PaginationParams
): Promise<MessageListResult> => {
  const response = await api.get<MessagesResponse>(
    `/projects/${projectId}/chat/messages/${messageId}/replies`,
    { params }
  );
  return response.data.data;
};

/**
 * Add reaction to a message
 */
export const addReaction = async (
  projectId: string,
  messageId: string,
  emoji: string
): Promise<ChatMessage> => {
  const response = await api.post<MessageResponse>(
    `/projects/${projectId}/chat/messages/${messageId}/reactions`,
    { emoji }
  );
  return response.data.data.message;
};

/**
 * Remove reaction from a message
 */
export const removeReaction = async (
  projectId: string,
  messageId: string,
  emoji: string
): Promise<ChatMessage> => {
  const response = await api.delete<MessageResponse>(
    `/projects/${projectId}/chat/messages/${messageId}/reactions`,
    { params: { emoji } }
  );
  return response.data.data.message;
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  projectId: string,
  messageIds?: string[]
): Promise<void> => {
  await api.post(`/projects/${projectId}/chat/messages/read`, { messageIds });
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (projectId: string): Promise<number> => {
  const response = await api.get<UnreadCountResponse>(
    `/projects/${projectId}/chat/messages/unread-count`
  );
  return response.data.data.count;
};

/**
 * Search messages
 */
export const searchMessages = async (
  projectId: string,
  query: string,
  limit?: number
): Promise<MessageListResult> => {
  const response = await api.get<MessagesResponse>(`/projects/${projectId}/chat/search`, {
    params: { q: query, limit },
  });
  return response.data.data;
};
