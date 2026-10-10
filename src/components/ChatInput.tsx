import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Send, X, AtSign } from 'lucide-react';
import type { ChatMessage } from '@/types/chat';

export interface MentionableMember {
  id: string;
  name?: string | null;
  email: string;
}

interface ChatInputProps {
  onSendMessage: (content: string, mentions?: string[]) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  disabled?: boolean;
  placeholder?: string;
  members?: MentionableMember[];
}

const MAX_MESSAGE_LENGTH = 4000;

function ChatInput({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  replyingTo,
  onCancelReply,
  disabled = false,
  placeholder = 'Type a message... (Use @ to mention teammates)',
  members = [],
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState<Set<string>>(new Set());

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingTimeRef = useRef<number>(0);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [content]);

  // Focus when replying to changes
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    const now = Date.now();
    lastTypingTimeRef.current = now;

    if (!isTyping) {
      setIsTyping(true);
      onTypingStart();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (Date.now() - lastTypingTimeRef.current >= 2000) {
        setIsTyping(false);
        onTypingStop();
      }
    }, 2000);
  }, [isTyping, onTypingStart, onTypingStop]);

  // Filter members based on mentionQuery
  const filteredMembers = useMemo(() => {
    if (!showMentionPopup) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .filter((m) => {
        const nameMatch = m.name?.toLowerCase().includes(q);
        const emailMatch = m.email.toLowerCase().includes(q);
        return nameMatch || emailMatch;
      })
      .slice(0, 6);
  }, [showMentionPopup, mentionQuery, members]);

  // Check mention trigger in textarea
  const checkMentionTrigger = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos);
    const match = /(?:^|\s)@([a-zA-Z0-9._]*)$/.exec(textBeforeCursor);

    if (match) {
      setMentionQuery(match[1]);
      setShowMentionPopup(true);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionPopup(false);
    }
  }, []);

  // Insert selected mention
  const insertMention = useCallback(
    (member: MentionableMember) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.slice(0, cursorPos);
      const textAfterCursor = content.slice(cursorPos);

      const match = /(?:^|\s)@([a-zA-Z0-9._]*)$/.exec(textBeforeCursor);
      if (!match) return;

      const triggerIndex = textBeforeCursor.lastIndexOf('@');
      const prefix = textBeforeCursor.slice(0, triggerIndex);
      const mentionText = `@${member.name || member.email} `;
      const newContent = prefix + mentionText + textAfterCursor;

      setContent(newContent);
      setMentionedUserIds((prev) => new Set(prev).add(member.id));
      setShowMentionPopup(false);

      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = prefix.length + mentionText.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [content]
  );

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_MESSAGE_LENGTH) {
        setContent(value);
        handleTyping();
        checkMentionTrigger(value, e.target.selectionStart);
      }
    },
    [handleTyping, checkMentionTrigger]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed, Array.from(mentionedUserIds));
    setContent('');
    setMentionedUserIds(new Set());
    setShowMentionPopup(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    onTypingStop();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, disabled, onSendMessage, onTypingStop, mentionedUserIds]);

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showMentionPopup && filteredMembers.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedMentionIndex((prev) => (prev + 1) % filteredMembers.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          insertMention(filteredMembers[selectedMentionIndex]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowMentionPopup(false);
          return;
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [showMentionPopup, filteredMembers, selectedMentionIndex, insertMention, handleSubmit]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const characterCount = content.length;
  const isNearLimit = characterCount > MAX_MESSAGE_LENGTH * 0.9;
  const isAtLimit = characterCount >= MAX_MESSAGE_LENGTH;
  const canSend = Boolean(content.trim()) && !disabled && !isAtLimit;

  return (
    <div className="relative rounded-xl border border-olive-300 bg-white shadow-xs focus-within:border-brand-500 focus-within:shadow-[var(--focus-ring)] transition-shadow">
      {/* Mention autocomplete popup */}
      {showMentionPopup && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 max-h-56 overflow-y-auto bg-white rounded-xl shadow-xl border border-olive-200 z-50 py-1 divide-y divide-olive-50 animate-fadeIn">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-olive-400 uppercase tracking-wider flex items-center gap-1.5">
            <AtSign className="w-3 h-3 text-brand-600" />
            <span>Mention teammate</span>
          </div>
          {filteredMembers.map((member, index) => {
            const isSelected = index === selectedMentionIndex;
            return (
              <button
                key={member.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(member);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  isSelected ? 'bg-brand-50 text-brand-900' : 'hover:bg-olive-50 text-olive-800'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {(member.name || member.email).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium truncate">{member.name || member.email}</div>
                  {member.name && <div className="text-[10.5px] text-olive-400 truncate">{member.email}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {replyingTo && (
        <div className="flex items-center gap-2 mx-2 mt-2 pl-3 pr-1 py-1.5 rounded-lg bg-olive-50 border-l-2 border-brand-500 animate-fadeIn">
          <div className="flex-1 min-w-0 text-xs">
            <span className="text-olive-500">Replying to </span>
            <span className="font-medium text-olive-800">{replyingTo.sender?.name || replyingTo.sender?.email}</span>
            <div className="text-olive-500 truncate">{replyingTo.content}</div>
          </div>
          <button aria-label="Cancel reply" onClick={onCancelReply} className="icon-btn !w-6 !h-6" type="button">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <textarea
        aria-label="Message"
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Reconnecting…' : placeholder}
        disabled={disabled}
        rows={1}
        className="block w-full px-3.5 pt-3 pb-1 bg-transparent resize-none text-[13.5px] leading-relaxed text-olive-950 placeholder:text-olive-400 focus:outline-none disabled:cursor-not-allowed border-0 !shadow-none"
        style={{ minHeight: '44px', maxHeight: '150px' }}
      />

      <div className="flex items-center justify-between gap-3 px-2.5 pb-2">
        <span className="pl-1 text-[11px] text-olive-400 flex items-center gap-1">
          <span className="kbd">@</span> to mention · <span className="kbd">Enter</span> to send
        </span>
        <div className="flex items-center gap-2">
          {content.length > 0 && (
            <span className={`text-[11px] tabular-nums ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-olive-400'}`}>
              {characterCount}/{MAX_MESSAGE_LENGTH}
            </span>
          )}
          <button
            aria-label="Send message"
            onClick={handleSubmit}
            disabled={!canSend}
            className="btn btn-sm btn-primary !h-7 !px-2.5"
            type="button"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;

