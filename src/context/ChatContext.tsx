import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { socketService, SocketEvents, type MessageReceivePayload, type MessageEditPayload, type MessageDeletePayload, type TypingUpdatePayload, type ReactionUpdatePayload } from '@/services/socket';
import { 
  getMessages, 
  getWorkspaceMessages,
  getUnreadCount as apiGetUnreadCount, 
  markMessagesAsRead as apiMarkMessagesAsRead,
  editMessage as apiEditMessage,
  sendWorkspaceMessage as apiSendWorkspaceMessage,
  sendMessage as apiSendMessage,
} from '@/services/chat';
import { type ChatMessage, MessageType } from '@/types/chat';
import type { Project } from '@/types/project';

interface TypingIndicator {
  userId: string;
  userName: string;
}

export type ChatScope = 'project' | 'workspace' | 'direct';

export interface ChatRecipient {
  id: string;
  name?: string | null;
  email: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  unreadCount: number;
  typingUsers: Map<string, TypingIndicator>;
  isLoading: boolean;
  hasMore: boolean;
  isConnected: boolean;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  chatScope: ChatScope;
  setChatScope: (scope: ChatScope) => void;
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
  activeRecipient: ChatRecipient | null;
  setActiveRecipient: (recipient: ChatRecipient | null) => void;
  sendMessage: (content: string, replyToId?: string, mentions?: string[]) => Promise<void>;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
  loadMoreMessages: () => Promise<void>;
  markAsRead: () => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  lastMessage: ChatMessage | null;
  clearLastMessage: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { activeWorkspaceId: currentWorkspaceId } = useWorkspace();

  const [chatScope, setChatScope] = useState<ChatScope>('project');
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(currentWorkspaceId || null);
  const [activeRecipient, setActiveRecipient] = useState<ChatRecipient | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingIndicator>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [lastMessage, setLastMessage] = useState<ChatMessage | null>(null);

  const typingTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const oldestMessageIdRef = useRef<string | null>(null);
  const currentUserId = user?.id ?? '';

  // Synchronize workspace ID when context loads or switches
  useEffect(() => {
    if (currentWorkspaceId && currentWorkspaceId !== activeWorkspaceId) {
      setActiveWorkspaceId(currentWorkspaceId);
    }
  }, [currentWorkspaceId, activeWorkspaceId]);

  // Adjust default scope if no project is active
  useEffect(() => {
    if (!activeProject && chatScope === 'project') {
      setChatScope('workspace');
    }
  }, [activeProject, chatScope]);

  // Connect socket on mount when user is present
  useEffect(() => {
    if (!user) {
      socketService.disconnect();
      setIsConnected(false);
      setMessages([]);
      setUnreadCount(0);
      return;
    }

    socketService.connect();

    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);

    socketService.on('connected', handleConnected);
    socketService.on('disconnected', handleDisconnected);

    if (socketService.isConnected()) setIsConnected(true);

    return () => {
      socketService.off('connected', handleConnected);
      socketService.off('disconnected', handleDisconnected);
    };
  }, [user]);

  // Fetch unread count for project
  const fetchUnreadCount = useCallback(async (projectId: string) => {
    try {
      const count = await apiGetUnreadCount(projectId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // Scope initialization and message fetching
  useEffect(() => {
    if (!isConnected) return;

    let isCurrent = true;

    const initializeChatScope = async () => {
      setIsLoading(true);
      oldestMessageIdRef.current = null;

      try {
        if (chatScope === 'project' && activeProject) {
          await socketService.joinProject(activeProject.id);
          const result = await getMessages(activeProject.id, { limit: 50 });
          if (isCurrent) {
            setMessages(result.messages.map(m => ({ ...m, status: 'sent' })));
            setHasMore(result.hasMore);
            if (result.messages.length > 0) oldestMessageIdRef.current = result.messages[0].id;
          }
          await fetchUnreadCount(activeProject.id);
        } else if (chatScope === 'workspace' && activeWorkspaceId) {
          await socketService.joinWorkspace(activeWorkspaceId);
          const result = await getWorkspaceMessages(activeWorkspaceId, { limit: 50 });
          if (isCurrent) {
            setMessages(result.messages.map(m => ({ ...m, status: 'sent' })));
            setHasMore(result.hasMore);
            if (result.messages.length > 0) oldestMessageIdRef.current = result.messages[0].id;
          }
        } else if (chatScope === 'direct' && activeWorkspaceId && activeRecipient) {
          await socketService.joinWorkspace(activeWorkspaceId);
          const result = await getWorkspaceMessages(activeWorkspaceId, {
            recipientId: activeRecipient.id,
            limit: 50
          });
          if (isCurrent) {
            setMessages(result.messages.map(m => ({ ...m, status: 'sent' })));
            setHasMore(result.hasMore);
            if (result.messages.length > 0) oldestMessageIdRef.current = result.messages[0].id;
          }
        } else {
          if (isCurrent) setMessages([]);
        }
      } catch (err) {
        console.error('Failed to load chat messages for scope:', chatScope, err);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void initializeChatScope();

    return () => {
      isCurrent = false;
    };
  }, [chatScope, activeProject?.id, activeWorkspaceId, activeRecipient?.id, isConnected, fetchUnreadCount]);

  // Handle incoming socket events
  useEffect(() => {
    if (!isConnected) return;

    const handleMessageReceive = (payload: MessageReceivePayload) => {
      const { message } = payload;
      
      const isForCurrentScope =
        (chatScope === 'project' && activeProject && message.projectId === activeProject.id) ||
        (chatScope === 'workspace' && activeWorkspaceId && message.workspaceId === activeWorkspaceId && !message.projectId && !message.recipientId) ||
        (chatScope === 'direct' && activeWorkspaceId && message.workspaceId === activeWorkspaceId &&
          ((message.senderId === activeRecipient?.id && (message.recipientId === currentUserId || !message.recipientId)) ||
           (message.senderId === currentUserId && message.recipientId === activeRecipient?.id)));

      if (isForCurrentScope) {
        setMessages((prev) => {
          // If message already exists by ID
          if (prev.some((m) => m.id === message.id)) {
            return prev.map(m => m.id === message.id ? { ...message, status: 'sent' } : m);
          }

          // If this is confirming an optimistic message from current user
          const pendingIdx = prev.findIndex(
            (m) => (m.status === 'sending' || m.id.startsWith('temp-')) &&
                   m.senderId === message.senderId &&
                   m.content === message.content
          );

          if (pendingIdx !== -1) {
            const next = [...prev];
            next[pendingIdx] = { ...message, status: 'sent' };
            return next;
          }

          return [...prev, { ...message, status: 'sent' }];
        });

        if (message.senderId !== currentUserId) {
          setUnreadCount((prev) => prev + 1);
          setLastMessage(message);
          
          if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('New message', {
              body: `${message.sender?.name || message.sender?.email}: ${message.content.slice(0, 50)}`,
              icon: '/favicon.ico'
            });
          }
        }
      }
    };

    const handleMessageSent = (payload: { success: boolean; message?: ChatMessage; error?: string }) => {
      if (payload?.success && payload.message) {
        const confirmed = payload.message;
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) => m.id === confirmed.id ||
                   ((m.status === 'sending' || m.id.startsWith('temp-')) &&
                    m.senderId === confirmed.senderId &&
                    m.content === confirmed.content)
          );
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = { ...confirmed, status: 'sent' };
            return next;
          }
          return prev;
        });
      }
    };

    const handleMessageEdit = (payload: MessageEditPayload) => {
      const { message } = payload;
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...message, status: 'sent' } : m)));
    };

    const handleMessageDelete = (payload: MessageDeletePayload) => {
      const { messageId } = payload;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const handleTypingUpdate = (payload: TypingUpdatePayload) => {
      const { userId, userName, isTyping, projectId } = payload;
      if (chatScope === 'project' && activeProject && projectId !== activeProject.id) return;
      if (userId === currentUserId) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        const existingTimeout = typingTimeoutRefs.current.get(userId);
        if (existingTimeout) clearTimeout(existingTimeout);

        if (isTyping) {
          next.set(userId, { userId, userName });
          const timeout = setTimeout(() => {
            setTypingUsers((p) => {
              const n = new Map(p);
              n.delete(userId);
              return n;
            });
            typingTimeoutRefs.current.delete(userId);
          }, 5000);
          typingTimeoutRefs.current.set(userId, timeout);
        } else {
          next.delete(userId);
        }
        return next;
      });
    };

    const handleReactionUpdate = (payload: ReactionUpdatePayload) => {
      const { messageId, reactions } = payload;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: reactions.map((r) => ({ ...r, messageId })) }
            : m
        )
      );
    };

    socketService.on(SocketEvents.MESSAGE_RECEIVE, handleMessageReceive);
    socketService.on(SocketEvents.MESSAGE_SEND, handleMessageSent);
    socketService.on(SocketEvents.MESSAGE_EDIT, handleMessageEdit);
    socketService.on(SocketEvents.MESSAGE_DELETE, handleMessageDelete);
    socketService.on(SocketEvents.TYPING_UPDATE, handleTypingUpdate);
    socketService.on(SocketEvents.REACTION_ADD, handleReactionUpdate);
    socketService.on(SocketEvents.REACTION_REMOVE, handleReactionUpdate);

    return () => {
      socketService.off(SocketEvents.MESSAGE_RECEIVE, handleMessageReceive);
      socketService.off(SocketEvents.MESSAGE_SEND, handleMessageSent);
      socketService.off(SocketEvents.MESSAGE_EDIT, handleMessageEdit);
      socketService.off(SocketEvents.MESSAGE_DELETE, handleMessageDelete);
      socketService.off(SocketEvents.TYPING_UPDATE, handleTypingUpdate);
      socketService.off(SocketEvents.REACTION_ADD, handleReactionUpdate);
      socketService.off(SocketEvents.REACTION_REMOVE, handleReactionUpdate);
    };
  }, [isConnected, chatScope, activeProject, activeWorkspaceId, activeRecipient, currentUserId, notificationsEnabled]);

  const sendMessage = useCallback(async (content: string, replyToId?: string, mentions?: string[]) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Find replying-to message for instant quote preview
    const parentMsg = replyToId ? messages.find(m => m.id === replyToId) : null;
    const replyToData = parentMsg ? {
      id: parentMsg.id,
      content: parentMsg.content,
      sender: parentMsg.sender,
    } : null;

    // Build optimistic message with pulsating status: 'sending'
    const optimisticMessage: ChatMessage = {
      id: tempId,
      projectId: chatScope === 'project' ? activeProject?.id : undefined,
      workspaceId: activeWorkspaceId || undefined,
      recipientId: chatScope === 'direct' ? activeRecipient?.id : undefined,
      recipient: chatScope === 'direct' && activeRecipient ? {
        id: activeRecipient.id,
        name: activeRecipient.name || null,
        email: activeRecipient.email,
      } : null,
      senderId: currentUserId,
      sender: {
        id: currentUserId,
        name: user?.name || null,
        email: user?.email || '',
      },
      type: MessageType.TEXT,
      content,
      replyToId: replyToId || null,
      replyTo: replyToData,
      readBy: [currentUserId],
      reactions: [],
      mentions: mentions?.map(userId => ({ userId, mentionedBy: currentUserId })) || [],
      isEdited: false,
      isDeleted: false,
      metadata: {},
      replyCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'sending',
    };

    // Instant UI update
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      if (chatScope === 'project' && activeProject) {
        if (socketService.isConnected()) {
          socketService.sendMessage({
            projectId: activeProject.id,
            content,
            replyToId,
            mentions,
            clientMessageId: tempId,
          });
        } else {
          const saved = await apiSendMessage(activeProject.id, { content, replyToId });
          setMessages(prev => prev.map(m => m.id === tempId ? { ...saved, status: 'sent' } : m));
        }
      } else if (chatScope === 'workspace' && activeWorkspaceId) {
        if (socketService.isConnected()) {
          socketService.sendMessage({
            workspaceId: activeWorkspaceId,
            content,
            replyToId,
            mentions,
            clientMessageId: tempId,
          });
        } else {
          const saved = await apiSendWorkspaceMessage(activeWorkspaceId, { content, replyToId, mentions });
          setMessages(prev => prev.map(m => m.id === tempId ? { ...saved, status: 'sent' } : m));
        }
      } else if (chatScope === 'direct' && activeWorkspaceId && activeRecipient) {
        if (socketService.isConnected()) {
          socketService.sendMessage({
            workspaceId: activeWorkspaceId,
            recipientId: activeRecipient.id,
            content,
            replyToId,
            mentions,
            clientMessageId: tempId,
          });
        } else {
          const saved = await apiSendWorkspaceMessage(activeWorkspaceId, {
            recipientId: activeRecipient.id,
            content,
            replyToId,
            mentions
          });
          setMessages(prev => prev.map(m => m.id === tempId ? { ...saved, status: 'sent' } : m));
        }
      }

      // Safety timeout: transition sending -> sent after 1.5s if not already handled by socket emit
      setTimeout(() => {
        setMessages(prev => prev.map(m => (m.id === tempId && m.status === 'sending' ? { ...m, status: 'sent' } : m)));
      }, 1500);

    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
    }
  }, [chatScope, activeProject, activeWorkspaceId, activeRecipient, currentUserId, user, messages]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (chatScope === 'project' && activeProject) {
      try {
        const updatedMessage = await apiEditMessage(activeProject.id, messageId, { content });
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...updatedMessage, status: 'sent' } : m)));
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
    } else {
      socketService.editMessage({ projectId: activeProject?.id || '', messageId, content });
    }
  }, [chatScope, activeProject]);

  const deleteMessage = useCallback((messageId: string) => {
    socketService.deleteMessage({ projectId: activeProject?.id || '', messageId });
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, [activeProject]);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    socketService.addReaction({ projectId: activeProject?.id || '', messageId, emoji });
  }, [activeProject]);

  const removeReaction = useCallback((messageId: string, emoji: string) => {
    socketService.removeReaction({ projectId: activeProject?.id || '', messageId, emoji });
  }, [activeProject]);

  const loadMoreMessages = useCallback(async () => {
    if (isLoading || !hasMore || !oldestMessageIdRef.current) return;
    setIsLoading(true);
    try {
      if (chatScope === 'project' && activeProject) {
        const result = await getMessages(activeProject.id, { limit: 50, before: oldestMessageIdRef.current });
        setMessages((prev) => [...result.messages.map(m => ({ ...m, status: 'sent' as const })), ...prev]);
        setHasMore(result.hasMore);
        if (result.messages.length > 0) oldestMessageIdRef.current = result.messages[0].id;
      } else if (chatScope === 'workspace' && activeWorkspaceId) {
        const result = await getWorkspaceMessages(activeWorkspaceId, { limit: 50, before: oldestMessageIdRef.current });
        setMessages((prev) => [...result.messages.map(m => ({ ...m, status: 'sent' as const })), ...prev]);
        setHasMore(result.hasMore);
        if (result.messages.length > 0) oldestMessageIdRef.current = result.messages[0].id;
      } else if (chatScope === 'direct' && activeWorkspaceId && activeRecipient) {
        const result = await getWorkspaceMessages(activeWorkspaceId, {
          recipientId: activeRecipient.id,
          limit: 50,
          before: oldestMessageIdRef.current
        });
        setMessages((prev) => [...result.messages.map(m => ({ ...m, status: 'sent' as const })), ...prev]);
        setHasMore(result.hasMore);
        if (result.messages.length > 0) oldestMessageIdRef.current = result.messages[0].id;
      }
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [chatScope, activeProject, activeWorkspaceId, activeRecipient, isLoading, hasMore]);

  const markAsRead = useCallback(async () => {
    if (chatScope === 'project' && activeProject && unreadCount > 0) {
      try {
        await apiMarkMessagesAsRead(activeProject.id);
        setUnreadCount(0);
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
      }
    }
  }, [chatScope, activeProject, unreadCount]);

  const startTyping = useCallback(() => {
    if (activeProject) {
      socketService.startTyping(activeProject.id);
    }
  }, [activeProject]);

  const stopTyping = useCallback(() => {
    if (activeProject) {
      socketService.stopTyping(activeProject.id);
    }
  }, [activeProject]);

  const clearLastMessage = useCallback(() => {
    setLastMessage(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        unreadCount,
        typingUsers,
        isLoading,
        hasMore,
        isConnected,
        notificationsEnabled,
        setNotificationsEnabled,
        chatScope,
        setChatScope,
        activeProject,
        setActiveProject,
        activeWorkspaceId,
        setActiveWorkspaceId,
        activeRecipient,
        setActiveRecipient,
        sendMessage,
        editMessage,
        deleteMessage,
        addReaction,
        removeReaction,
        loadMoreMessages,
        markAsRead,
        startTyping,
        stopTyping,
        lastMessage,
        clearLastMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};