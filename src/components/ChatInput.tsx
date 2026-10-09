import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import type { ChatMessage } from '@/types/chat';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_MESSAGE_LENGTH = 4000;

function ChatInput({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  replyingTo,
  onCancelReply,
  disabled = false,
  placeholder = 'Type a message...'
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      if (Date.now() - lastTypingTimeRef.current >= 2000) {
        setIsTyping(false);
        onTypingStop();
      }
    }, 2000);
  }, [isTyping, onTypingStart, onTypingStop]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_MESSAGE_LENGTH) {
        setContent(value);
        handleTyping();
      }
    },
    [handleTyping]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
    setContent('');

    // Clear typing state
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    onTypingStop();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, disabled, onSendMessage, onTypingStop]);

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
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
    <div className="rounded-xl border border-olive-300 bg-white shadow-xs focus-within:border-brand-500 focus-within:shadow-[var(--focus-ring)] transition-shadow">
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
        <span className="pl-1 text-[11px] text-olive-400">
          <span className="kbd">Enter</span> to send, <span className="kbd">Shift</span> + <span className="kbd">Enter</span> for a new line
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
