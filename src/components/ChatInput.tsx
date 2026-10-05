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

  return (
    <div className="bg-white  border-t border-olive-200/50 ">
      {/* Reply preview */}
      {replyingTo && (
        <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-2.5 bg-olive-50/50  border border-olive-100  rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] uppercase font-bold text-olive-600  tracking-wider">
                Replying to
              </span>
              <span className="text-xs font-bold text-olive-700  truncate">
                {replyingTo.sender?.name || replyingTo.sender?.email}
              </span>
            </div>
            <div className="text-[11px] text-olive-500  truncate italic">
              "{replyingTo.content}"
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1.5 text-olive-400 hover:text-red-500  transition-colors bg-white  rounded-full shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-3 p-4">
        <div className="flex-1 relative group">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={[
              'w-full px-5 py-3 pr-20 rounded-2xl resize-none shadow-sm transition-all duration-300',
              'bg-olive-50  border border-olive-200',
              'text-olive-950  text-sm leading-relaxed',
              'placeholder:text-olive-400',
              'focus:outline-none focus:ring-4 focus:ring-olive-500/10 focus:border-olive-500/50 focus:bg-white',
              'disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-olive-300'
            ].join(' ')}
            style={{ minHeight: '48px', maxHeight: '150px' }}
          />

          {/* Character count */}
          <div
            className={[
              'absolute right-4 bottom-3 text-[11px] font-bold tracking-tighter',
              isAtLimit
                ? 'text-red-500'
                : isNearLimit
                  ? 'text-amber-500'
                  : 'text-olive-400',
              content.length === 0 ? 'opacity-0 scale-90' : 'opacity-100 scale-100',
              'transition-all duration-200'
            ].join(' ')}
          >
            {characterCount}
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || disabled || isAtLimit}
          className={[
            'flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center',
            'transition-all duration-300 transform active:scale-90',
            content.trim() && !disabled && !isAtLimit
              ? 'bg-olive-600 text-white shadow-xl shadow-olive-500/25 hover:shadow-olive-500/40 hover:-translate-y-0.5'
              : 'bg-olive-100  text-olive-400  cursor-not-allowed'
          ].join(' ')}
        >
          <Send className={['w-5 h-5 transition-transform duration-300', content.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''].join(' ')} />
        </button>
      </div>
    </div>
  );
}

export default ChatInput;