import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Edit2,
  Trash2,
  Smile,
  CornerDownRight,
  MoreHorizontal,
  Check,
  X,
} from 'lucide-react';
import type { ChatMessage, MessageSender, MessageReaction } from '@/types/chat';
import { MessageType } from '@/types/chat';
import { formatDate } from '@/utils/date';
import { useConfirm } from '@/context/ConfirmationContext';

interface ChatMessageProps {
  message: ChatMessage;
  currentUserId: string;
  currentUserEmail?: string;
  isAdmin: boolean;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onLoadThread?: (messageId: string) => void;
  allMessages?: ChatMessage[];
  depth?: number;
}

// Common emoji reactions
const QUICK_REACTIONS = ['👍', '👎', '❤️', '😄', '😮', '🎉', '👀', '🚀'];

// Format date for display
const formatTime = (dateString: string): string => formatDate(dateString, 'time');

// Get user initials for avatar
const getInitials = (user: MessageSender | null): string => {
  if (!user) return '?';
  if (user.name) {
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return user.email.slice(0, 2).toUpperCase();
};

// Get avatar color based on user ID
const getAvatarColor = (userId: string | null): string => {
  if (!userId) return 'bg-olive-200 text-olive-700';
  const colors = [
    'bg-brand-100 text-brand-800',
    'bg-olive-200 text-olive-800',
    'bg-amber-100 text-amber-800',
    'bg-blue-100 text-blue-800',
    'bg-orange-100 text-orange-700',
    'bg-red-100 text-red-800'
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Group reactions by emoji
const groupReactions = (reactions: MessageReaction[]): Map<string, string[]> => {
  const grouped = new Map<string, string[]>();
  reactions.forEach((reaction) => {
    const users = grouped.get(reaction.emoji) || [];
    users.push(reaction.userId);
    grouped.set(reaction.emoji, users);
  });
  return grouped;
};

function ChatMessageComponent({
  message,
  currentUserId,
  currentUserEmail,
  isAdmin,
  onEdit,
  onDelete,
  onAddReaction,
  onRemoveReaction,
  onReply,
  onLoadThread,
  allMessages = [],
  depth = 0,
}: ChatMessageProps) {
  const confirm = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [emojiPickerPos, setEmojiPickerPos] = useState<{ top: number; left: number } | null>(null);

  const replies = useMemo(() => {
    return allMessages.filter((m) => m.replyToId === message.id);
  }, [allMessages, message.id]);

  const sortedReplies = useMemo(() => {
    return [...replies].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [replies]);
  const isOwnMessage = 
    message.senderId === currentUserId || 
    (currentUserEmail && message.sender?.email?.toLowerCase() === currentUserEmail.toLowerCase());
  const isSystemMessage = message.type === MessageType.SYSTEM;
  const isDeleted = message.isDeleted;

  // Can edit?
  const canEdit = isOwnMessage && !isDeleted && !isSystemMessage;
  const canDelete = !isDeleted && !isSystemMessage && (isOwnMessage || isAdmin);

  // Group reactions
  const groupedReactions = useMemo(() => groupReactions(message.reactions), [message.reactions]);
  const userReactions = useMemo(
    () => message.reactions.filter((r) => r.userId === currentUserId).map((r) => r.emoji),
    [message.reactions, currentUserId]
  );

  // Sync editContent when message content changes OR when editing is toggled
  const handleStartEdit = useCallback(() => {
    setEditContent(message.content);
    setIsEditing(true);
    setShowActions(false);
  }, [message.content]);

  // Handle edit submit
  const handleEditSubmit = useCallback(() => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit(message.id, trimmed);
    }
    setIsEditing(false);
  }, [editContent, message.content, message.id, onEdit]);

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditContent(message.content);
  }, [message.content]);

  // Handle reaction click
  const handleReactionClick = useCallback(
    (emoji: string) => {
      if (userReactions.includes(emoji)) {
        onRemoveReaction(message.id, emoji);
      } else {
        onAddReaction(message.id, emoji);
      }
      setShowEmojiPicker(false);
    },
    [userReactions, message.id, onAddReaction, onRemoveReaction]
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    const isConfirmed = await confirm({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action is irreversible.',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (isConfirmed) {
      onDelete(message.id);
    }
  }, [message.id, onDelete, confirm]);

  // Render system message
  if (isSystemMessage) {
    return (
      <div className="flex items-center justify-center py-2 my-1">
        <div className="flex items-center gap-2 px-3 py-1 bg-olive-100 rounded-full">
          <span className="text-[11px] font-medium text-olive-500 ">
            {message.content}
          </span>
          <span className="text-[11px] text-olive-400 ">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  // Render deleted message
  if (isDeleted) {
    return (
      <div className="flex items-center justify-center py-2 my-1 opacity-50">
        <span className="text-xs text-olive-400 italic px-3 py-1">
          Message deleted
        </span>
      </div>
    );
  }

  return (
    <div
      id={`message-${message.id}`}
      className="group relative px-3 py-2 rounded-lg hover:bg-olive-50 transition-colors"
    >
      <div className="flex gap-3">
        <div
          className={[
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            'text-[11px] font-semibold select-none',
            getAvatarColor(message.senderId),
          ].join(' ')}
        >
          {getInitials(message.sender)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-semibold text-olive-950 truncate">
              {message.sender?.name || 'Unknown'}
              {isOwnMessage && <span className="ml-1 font-normal text-olive-400">(you)</span>}
            </span>
            <span className="text-[11px] text-olive-400 shrink-0">{formatTime(message.createdAt)}</span>
            {message.isEdited && <span className="text-[11px] text-olive-400">· edited</span>}
          </div>

          {isEditing ? (
            <div className="mt-1.5 rounded-lg border border-brand-500 shadow-[var(--focus-ring)] bg-white">
              <textarea
                aria-label="Edit message"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="block w-full px-3 py-2 text-[13px] resize-none outline-none bg-transparent text-olive-950"
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEditSubmit();
                  }
                  if (e.key === 'Escape') {
                    handleEditCancel();
                  }
                }}
              />
              <div className="flex items-center gap-2 justify-end px-2 pb-2">
                <span className="mr-auto pl-1 text-[11px] text-olive-400">Enter to save · Esc to cancel</span>
                <button onClick={handleEditCancel} className="btn btn-sm btn-ghost !h-7" type="button">
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button onClick={handleEditSubmit} className="btn btn-sm btn-primary !h-7" type="button">
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.replyTo && (
                <button
                  type="button"
                  className="mt-1 mb-1 max-w-full flex items-center gap-2 pl-2 pr-3 py-1 rounded-md border-l-2 border-olive-300 bg-olive-100/70 hover:bg-olive-100 text-xs text-olive-500 text-left transition-colors"
                  onClick={() => onLoadThread?.(message.replyTo!.id)}
                >
                  <CornerDownRight className="w-3 h-3 shrink-0" />
                  <span className="truncate">{message.replyTo.content}</span>
                </button>
              )}
              <div className="text-[13.5px] leading-relaxed text-olive-800 whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>
                {message.content}
              </div>
            </>
          )}

          {groupedReactions.size > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {Array.from(groupedReactions.entries()).map(([emoji, users]) => {
                const hasReacted = userReactions.includes(emoji);
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReactionClick(emoji)}
                    className={[
                      'flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-medium border transition-colors',
                      hasReacted
                        ? 'bg-brand-50 border-brand-200 text-brand-800'
                        : 'bg-white border-olive-200 text-olive-600 hover:border-olive-300'
                    ].join(' ')}
                    title={`Reacted by ${users.length} user${users.length > 1 ? 's' : ''}`}
                    type="button"
                  >
                    <span className="text-sm leading-none">{emoji}</span>
                    <span className="tabular-nums">{users.length}</span>
                  </button>
                );
              })}
            </div>
          )}

          {message.replyCount > 0 && (
            <button
              onClick={() => onLoadThread?.(message.id)}
              className="mt-1 text-xs font-medium text-brand-700 hover:text-brand-800 flex items-center gap-1 transition-colors"
              type="button"
            >
              <CornerDownRight className="w-3 h-3" />
              {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {/* Floating Actions Overlay */}
      {!isEditing && (
        <div
          className="absolute right-3 -top-3 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
        >
          <div className="flex bg-white rounded-lg shadow-md ring-1 ring-olive-950/[0.06] p-0.5">
            {/* Emoji toggle icon */}
            <div className="relative">
              <button
                ref={emojiButtonRef}
                onClick={() => {
                  if (!showEmojiPicker && emojiButtonRef.current) {
                    const rect = emojiButtonRef.current.getBoundingClientRect();
                    setEmojiPickerPos({
                      top: rect.top - 8,
                      left: Math.max(8, rect.left - 120),
                    });
                  }
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className="icon-btn !w-7 !h-7"
                title="Add reaction"
              >
                <Smile size={16} />
              </button>

              {showEmojiPicker && emojiPickerPos && (
                <>
                  <div className="fixed inset-0 z-[6000]" onClick={() => setShowEmojiPicker(false)} />
                  <div
                    className="fixed p-1.5 bg-white rounded-xl shadow-lg ring-1 ring-olive-950/[0.07] z-[6001]"
                    style={{
                      top: `${emojiPickerPos.top}px`,
                      left: `${emojiPickerPos.left}px`,
                      transform: 'translateY(-100%)'
                    }}
                  >
                    <div className="grid grid-cols-4 gap-1.5 min-w-[180px]">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReactionClick(emoji)}
                          className="w-9 h-9 flex items-center justify-center text-lg rounded-lg hover:bg-olive-100 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => onReply(message)}
              className="icon-btn !w-7 !h-7"
              title="Reply"
            >
              <CornerDownRight size={16} />
            </button>

            {/* Overflow Actions */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="icon-btn !w-7 !h-7"
              >
                <MoreHorizontal size={16} />
              </button>

              {showActions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                  <div className="absolute right-0 top-full mt-1.5 p-1 bg-white rounded-xl shadow-lg ring-1 ring-olive-950/[0.07] z-50 min-w-[140px]">
                    {canEdit && (
                      <button
                        onClick={handleStartEdit}
                        className="w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] text-olive-700 hover:bg-olive-100 transition-colors"
                      >
                        <Edit2 size={14} />
                        Edit Message
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          handleDelete();
                          setShowActions(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Render replies recursively */}
      {sortedReplies.length > 0 && depth < 5 && (
        <div className="mt-1 ml-[22px] flex flex-col border-l-2 border-olive-100 pl-3">
          {sortedReplies.map((reply) => (
            <ChatMessageComponent
              key={reply.id}
              message={reply}
              currentUserId={currentUserId}
              currentUserEmail={currentUserEmail}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
              onReply={onReply}
              onLoadThread={onLoadThread}
              allMessages={allMessages}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ChatMessageComponent;