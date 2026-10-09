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
} from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import type { Project, ProjectMember } from '@/types/project';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import {
  searchMessages,
} from '@/services/chat';
import { useDebounce } from '@/hooks/useDebounce';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface ChatPanelProps {
  project: Project;
  members: ProjectMember[];
  isOpen: boolean;
  onClose: () => void;
}

function ChatPanel({ project, members, isOpen, onClose }: ChatPanelProps) {
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    hasMore,
    isConnected,
    notificationsEnabled,
    setNotificationsEnabled,
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.id ?? '';
  const isAdmin = project.currentUserRole === 'ADMIN';

  // Set active project for context
  useEffect(() => {
    setActiveProject(project);
    return () => setActiveProject(null);
  }, [project, setActiveProject]);

  const lastScrollHeightRef = useRef<number>(0);
  const isAtBottomRef = useRef<boolean>(true);
  const prevMessagesLength = useRef<number>(messages.length);

  // Mark as read when messages load or change
  useEffect(() => {
    markAsRead();
  }, [messages, markAsRead]);

  // Handle scroll position maintenance and smart scroll-to-bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const messageCountDiff = messages.length - prevMessagesLength.current;

    // If messages were added at the TOP (infinite scroll)
    if (messageCountDiff > 0 && container.scrollTop < 50 && lastScrollHeightRef.current > 0) {
      const newScrollHeight = container.scrollHeight;
      container.scrollTop = newScrollHeight - lastScrollHeightRef.current;
    }
    // If a NEW message was added at the BOTTOM
    else if (messageCountDiff > 0 && (isAtBottomRef.current || messages[messages.length - 1].senderId === currentUserId)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevMessagesLength.current = messages.length;
    lastScrollHeightRef.current = container.scrollHeight;
  }, [messages, currentUserId]);

  // Handle auto-scroll on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 200);
    }
  }, [isOpen]);

  // Scroll listener for infinite scroll and tracking bottom status
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;

      // Check if we are at the bottom (with some threshold)
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;

      // Update last known scroll height for next render
      lastScrollHeightRef.current = scrollHeight;

      // Trigger load more when near top
      if (scrollTop < 100 && hasMore && !isLoading) {
        loadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, loadMoreMessages]);

  // Search messages
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
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
    [project.id]
  );

  // Debounced search
  useEffect(() => {
    handleSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery, handleSearch]);

  const [replyingTo, setReplyingTo] = useState<ChatMessageType | null>(null);

  const handleSendMessage = useCallback(
    async (content: string) => {
      sendMessage(content, replyingTo?.id);
      setReplyingTo(null);
      // Auto-scroll when explicitly sending a new message
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

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      <div className="shrink-0 px-5 h-14 flex items-center justify-between gap-3 border-b border-olive-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-olive-950 m-0 truncate">{project.name}</h3>
            <p className="m-0 text-xs text-olive-500 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-brand-500' : 'bg-amber-500'}`} />
              {isConnected ? 'Connected' : 'Reconnecting…'} · {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
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

      {showSearch && (
        <div className="px-5 py-3 border-b border-olive-100 animate-fadeIn">
          <div className="relative">
            <input
              autoFocus
              aria-label="Search in conversation"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation"
              className="input-base !h-9 !pl-9"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-400 pointer-events-none" />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-400 animate-spin" />}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5 custom-scrollbar"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-olive-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-10 h-10 rounded-full bg-olive-100 text-olive-400 flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-olive-900 m-0">No messages yet</p>
            <p className="text-[13px] text-olive-500 mt-1 m-0">Say hello to the team working on {project.name}.</p>
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

              const filteredMessages = (showSearch && searchQuery)
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
              <div className="text-center py-8 text-olive-400 ">
                No messages found matching "{searchQuery}"
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Footer Area */}
      <div className="border-t border-olive-200 bg-white">
        {/* Typing indicator */}
        {typingText && (
          <div className="px-5 pt-2 text-xs text-olive-500">
            {typingText}
          </div>
        )}

        {/* Connection status (Floating overlay) */}
        {/* Input */}
        <div className="px-4 pb-4 pt-3">
          <ChatInput
            onSendMessage={handleSendMessage}
            onTypingStart={startTyping}
            onTypingStop={stopTyping}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            disabled={!isConnected}
          />
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;