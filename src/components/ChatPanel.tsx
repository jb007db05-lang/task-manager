import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  MessageSquare,
  Search,
  Bell,
  BellOff,
  Loader2,
  X,
  Users,
  User,
  ArrowLeft,
  Hash,
} from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import type { Project, ProjectMember } from '@/types/project';
import { type WorkspaceMember, workspaceService } from '@/services/workspaces';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { searchMessages } from '@/services/chat';
import { useDebounce } from '@/hooks/useDebounce';
import ChatMessage from './ChatMessage';
import ChatInput, { type MentionableMember } from './ChatInput';

interface ChatPanelProps {
  project?: Project | null;
  members?: ProjectMember[];
  workspaceMembers?: WorkspaceMember[];
  isOpen: boolean;
  onClose: () => void;
}

function ChatPanel({ project, members = [], workspaceMembers = [], isOpen, onClose }: ChatPanelProps) {
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    hasMore,
    isConnected,
    notificationsEnabled,
    setNotificationsEnabled,
    chatScope,
    setChatScope,
    activeRecipient,
    setActiveRecipient,
    activeWorkspaceId,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    loadMoreMessages,
    markAsRead,
    startTyping,
    stopTyping,
    typingUsers,
    setActiveProject,
  } = useChat();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [searchResults, setSearchResults] = useState<ChatMessageType[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [wsMembers, setWsMembers] = useState<WorkspaceMember[]>(workspaceMembers);
  const [dmSearchQuery, setDmSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.id ?? '';
  const isAdmin = project ? project.currentUserRole === 'ADMIN' : false;

  // Set active project for context
  useEffect(() => {
    if (project) {
      setActiveProject(project);
    }
  }, [project, setActiveProject]);

  // Load workspace members if not already provided
  useEffect(() => {
    if (workspaceMembers.length > 0) {
      setWsMembers(workspaceMembers);
    } else if (activeWorkspaceId) {
      workspaceService.listMembers(activeWorkspaceId).then(setWsMembers).catch(console.error);
    }
  }, [workspaceMembers, activeWorkspaceId]);

  // Ensure default scope is valid
  useEffect(() => {
    if (!project && chatScope === 'project') {
      setChatScope('workspace');
    }
  }, [project, chatScope, setChatScope]);

  const lastScrollHeightRef = useRef<number>(0);
  const isAtBottomRef = useRef<boolean>(true);
  const prevMessagesLength = useRef<number>(messages.length);

  // Mark as read when messages load or change
  useEffect(() => {
    markAsRead();
  }, [messages, markAsRead]);

  // Scroll position maintenance
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const messageCountDiff = messages.length - prevMessagesLength.current;

    if (messageCountDiff > 0 && container.scrollTop < 50 && lastScrollHeightRef.current > 0) {
      const newScrollHeight = container.scrollHeight;
      container.scrollTop = newScrollHeight - lastScrollHeightRef.current;
    } else if (messageCountDiff > 0 && (isAtBottomRef.current || messages[messages.length - 1]?.senderId === currentUserId)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevMessagesLength.current = messages.length;
    lastScrollHeightRef.current = container.scrollHeight;
  }, [messages, currentUserId]);

  // Auto-scroll on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 200);
    }
  }, [isOpen]);

  // Scroll listener for infinite scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
      lastScrollHeightRef.current = scrollHeight;

      if (scrollTop < 100 && hasMore && !isLoading) {
        loadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, loadMoreMessages]);

  // Search messages in project
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !project) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const result = await searchMessages(project.id, query);
        setSearchResults(result.messages);
      } catch (error) {
        console.error('Failed to search messages:', error);
      }
      setIsSearching(false);
    },
    [project]
  );

  useEffect(() => {
    if (chatScope === 'project') {
      handleSearch(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, handleSearch, chatScope]);

  const [replyingTo, setReplyingTo] = useState<ChatMessageType | null>(null);

  const handleSendMessage = useCallback(
    async (content: string, mentions?: string[]) => {
      await sendMessage(content, replyingTo?.id, mentions);
      setReplyingTo(null);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    [sendMessage, replyingTo]
  );

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('!bg-amber-50', 'transition-colors', 'duration-500');
      setTimeout(() => {
        el.classList.remove('!bg-amber-50');
      }, 2000);
    }
  }, []);

  const typingText = useMemo(() => {
    const users = Array.from(typingUsers.values());
    if (users.length === 0) return null;
    if (users.length === 1) return `${users[0].userName} is typing…`;
    if (users.length === 2) return `${users[0].userName} and ${users[1].userName} are typing…`;
    return `${users.length} people are typing…`;
  }, [typingUsers]);

  // Mentionable members list
  const mentionableMembers: MentionableMember[] = useMemo(() => {
    if (chatScope === 'project' && members.length > 0) {
      return members.map((m) => ({
        id: m.userId,
        name: m.user?.name,
        email: m.user?.email || '',
      }));
    }
    return wsMembers.map((m) => ({
      id: m.userId,
      name: m.name,
      email: m.email,
    }));
  }, [chatScope, members, wsMembers]);

  // Teammates for direct messages picker
  const filteredTeammates = useMemo(() => {
    const q = dmSearchQuery.toLowerCase();
    return wsMembers.filter((m) => {
      if (m.userId === currentUserId) return false;
      return (
        m.name?.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q)
      );
    });
  }, [wsMembers, dmSearchQuery, currentUserId]);

  const headerTitle = useMemo(() => {
    if (chatScope === 'project' && project) return project.name;
    if (chatScope === 'workspace') return 'Workspace Lounge';
    if (chatScope === 'direct') {
      return activeRecipient ? activeRecipient.name || activeRecipient.email : 'Direct Messages';
    }
    return 'Chat';
  }, [chatScope, project, activeRecipient]);

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      {/* Top Header */}
      <div className="shrink-0 px-4 h-14 flex items-center justify-between gap-3 border-b border-olive-200 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          {chatScope === 'direct' && activeRecipient && (
            <button
              onClick={() => setActiveRecipient(null)}
              className="icon-btn !w-8 !h-8 text-olive-600 hover:text-olive-950"
              title="Back to teammates"
              type="button"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="min-w-0">
            <h3 className="text-[14.5px] font-semibold text-olive-950 m-0 truncate flex items-center gap-1.5">
              {chatScope === 'workspace' && <Hash className="w-4 h-4 text-brand-600 shrink-0" />}
              {chatScope === 'direct' && <User className="w-4 h-4 text-brand-600 shrink-0" />}
              <span>{headerTitle}</span>
            </h3>
            <p className="m-0 text-[11.5px] text-olive-500 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-brand-500' : 'bg-amber-500'}`} />
              <span>{isConnected ? 'Connected' : 'Reconnecting…'}</span>
              <span>·</span>
              {chatScope === 'project' && (
                <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
              )}
              {chatScope === 'workspace' && (
                <span>Team Common Area</span>
              )}
              {chatScope === 'direct' && activeRecipient && (
                <span className="truncate">{activeRecipient.email}</span>
              )}
              {chatScope === 'direct' && !activeRecipient && (
                <span>1-on-1 Chats</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {chatScope === 'project' && (
            <button
              aria-label="Search messages"
              aria-pressed={showSearch}
              onClick={() => setShowSearch(!showSearch)}
              className={`icon-btn ${showSearch ? '!bg-olive-100 !text-olive-900' : ''}`}
              title="Search messages"
              type="button"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            aria-label={notificationsEnabled ? 'Mute notifications' : 'Unmute notifications'}
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className="icon-btn"
            title={notificationsEnabled ? 'Mute' : 'Unmute'}
            type="button"
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <div className="w-px h-5 bg-olive-200 mx-1" />
          <button aria-label="Close chat" onClick={onClose} className="icon-btn" title="Close" type="button">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* Scope Navigation Tabs */}
      <div className="shrink-0 px-3 py-2 border-b border-olive-100 bg-olive-50/60">
        <div className="flex items-center p-0.5 bg-olive-200/60 rounded-lg text-xs font-medium">
          {project && (
            <button
              type="button"
              onClick={() => setChatScope('project')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all ${
                chatScope === 'project'
                  ? 'bg-white text-olive-950 font-semibold shadow-xs'
                  : 'text-olive-600 hover:text-olive-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="truncate">Project</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setChatScope('workspace')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all ${
              chatScope === 'workspace'
                ? 'bg-white text-olive-950 font-semibold shadow-xs'
                : 'text-olive-600 hover:text-olive-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-brand-600" />
            <span className="truncate">Lounge</span>
          </button>

          <button
            type="button"
            onClick={() => setChatScope('direct')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all ${
              chatScope === 'direct'
                ? 'bg-white text-olive-950 font-semibold shadow-xs'
                : 'text-olive-600 hover:text-olive-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-brand-600" />
            <span className="truncate">Direct DMs</span>
          </button>
        </div>
      </div>

      {showSearch && chatScope === 'project' && (
        <div className="px-4 py-2.5 border-b border-olive-100 bg-white animate-fadeIn">
          <div className="relative">
            <input
              autoFocus
              aria-label="Search in conversation"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation"
              className="input-base !h-8.5 !pl-9"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-400 pointer-events-none" />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-400 animate-spin" />}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {chatScope === 'direct' && !activeRecipient ? (
        /* Teammate Contact Picker for Direct Messages */
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="p-3 border-b border-olive-100 bg-olive-50/40">
            <div className="relative">
              <input
                type="text"
                placeholder="Search teammates by name or email…"
                value={dmSearchQuery}
                onChange={(e) => setDmSearchQuery(e.target.value)}
                className="input-base !h-8.5 !pl-9 !text-xs"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-olive-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-olive-100 p-2">
            <div className="px-2 py-1 text-[11px] font-semibold text-olive-400 uppercase tracking-wider">
              Workspace Team ({filteredTeammates.length})
            </div>

            {filteredTeammates.length === 0 ? (
              <div className="text-center py-12 text-olive-400 text-xs">
                No teammates found matching "{dmSearchQuery}"
              </div>
            ) : (
              filteredTeammates.map((teammate) => (
                <button
                  key={teammate.id || teammate.userId}
                  onClick={() => {
                    setActiveRecipient({
                      id: teammate.userId,
                      name: teammate.name,
                      email: teammate.email,
                    });
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-olive-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-xs font-bold shrink-0">
                      {(teammate.name || teammate.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-olive-950 group-hover:text-brand-700 truncate">
                        {teammate.name || teammate.email}
                      </div>
                      <div className="text-[11.5px] text-olive-500 truncate">{teammate.email}</div>
                    </div>
                  </div>

                  <span className="shrink-0 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-olive-100 text-olive-700">
                    {teammate.role || 'MEMBER'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Conversation Messages Area */
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5 custom-scrollbar bg-white"
        >
          {isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-olive-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-12 h-12 rounded-full bg-olive-100 text-olive-500 flex items-center justify-center mb-3">
                {chatScope === 'workspace' ? (
                  <Hash className="w-6 h-6 text-brand-600" />
                ) : chatScope === 'direct' ? (
                  <User className="w-6 h-6 text-brand-600" />
                ) : (
                  <MessageSquare className="w-6 h-6 text-brand-600" />
                )}
              </div>
              <p className="text-sm font-semibold text-olive-900 m-0">No messages yet</p>
              <p className="text-[12.5px] text-olive-500 mt-1 m-0 max-w-xs">
                {chatScope === 'workspace'
                  ? 'Welcome to the Workspace Lounge! Drop a message to say hello to everyone in the workspace.'
                  : chatScope === 'direct'
                  ? `Start a conversation with ${activeRecipient?.name || activeRecipient?.email}.`
                  : `Say hello to the team working on ${project?.name}.`}
              </p>
            </div>
          ) : (
            <>
              {/* Load more button */}
              {hasMore && (
                <button
                  onClick={loadMoreMessages}
                  disabled={isLoading}
                  className="w-full py-2 text-xs font-medium text-olive-500 hover:text-olive-900"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                  ) : (
                    'Load more messages'
                  )}
                </button>
              )}

              {/* Messages List */}
              {(() => {
                let lastDateLabel = '';

                const getDateLabel = (dateString: string): string => {
                  const date = new Date(dateString);
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

                  if (msgDate.getTime() === today.getTime()) return 'Today';
                  if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
                  return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                };

                const filteredMessages = (showSearch && searchQuery && chatScope === 'project')
                  ? searchResults
                  : messages.filter(m => !m.replyToId);

                return filteredMessages.map((message) => {
                  const dateLabel = getDateLabel(message.createdAt);
                  const showSeparator = dateLabel !== lastDateLabel;
                  lastDateLabel = dateLabel;

                  return (
                    <div key={message.id}>
                      {showSeparator && (
                        <div className="flex items-center gap-3 py-3 px-4">
                          <div className="flex-1 h-px bg-olive-100" />
                          <span className="text-xs font-medium text-olive-400 select-none whitespace-nowrap">{dateLabel}</span>
                          <div className="flex-1 h-px bg-olive-100" />
                        </div>
                      )}
                      <ChatMessage
                        message={message}
                        currentUserId={currentUserId}
                        currentUserEmail={user?.email}
                        currentUserName={user?.name}
                        isAdmin={isAdmin}
                        onEdit={editMessage}
                        onDelete={deleteMessage}
                        onAddReaction={addReaction}
                        onRemoveReaction={removeReaction}
                        onReply={(m) => setReplyingTo(m)}
                        onLoadThread={handleScrollToMessage}
                        allMessages={messages}
                      />
                    </div>
                  );
                });
              })()}

              {showSearch && searchQuery && searchResults.length === 0 && (
                <div className="text-center py-8 text-olive-400">
                  No messages found matching "{searchQuery}"
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      )}

      {/* Footer Area - Input */}
      {(chatScope !== 'direct' || activeRecipient) && (
        <div className="border-t border-olive-200 bg-white">
          {typingText && (
            <div className="px-5 pt-2 text-xs text-olive-500">
              {typingText}
            </div>
          )}

          <div className="px-3 pb-3 pt-2">
            <ChatInput
              onSendMessage={handleSendMessage}
              onTypingStart={startTyping}
              onTypingStop={stopTyping}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              disabled={!isConnected}
              members={mentionableMembers}
              placeholder={
                chatScope === 'workspace'
                  ? 'Message Workspace Lounge... (Use @ to mention teammates)'
                  : chatScope === 'direct'
                  ? `Message ${activeRecipient?.name || activeRecipient?.email}...`
                  : `Message ${project?.name || 'Project'}... (Use @ to mention teammates)`
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPanel;