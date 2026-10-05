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
  if (!userId) return 'bg-gray-400';
  const colors = [
    'bg-olive-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-olive-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500'
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
        <div className="flex items-center gap-2 px-4 py-1.5 bg-olive-100/50  rounded-full border border-olive-200/50 ">
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
        <span className="text-[11px] text-olive-400  italic px-4 py-1 bg-olive-50  rounded-lg">
          Message deleted
        </span>
      </div>
    );
  }

  return (
    <div
      id={`message-${message.id}`}
      className={[
        'group flex gap-4 px-6 py-2 transition-all duration-300 relative w-full hover:bg-olive-50/80',
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      ].join(' ')}
    >
      {/* Avatar */}
      <div
        className={[
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md transform transition-transform group-hover:scale-105',
          'text-white text-sm font-bold select-none ring-2 ring-white',
          getAvatarColor(message.senderId),
        ].join(' ')}
      >
        {getInitials(message.sender)}
      </div>

      {/* Message content */}
      <div className={['flex flex-col max-w-[92%] min-w-0', isOwnMessage ? 'items-end' : 'items-start'].join(' ')}>
        
        {/* The Card Bubble */}
        <div className="relative group/bubble w-full min-w-[200px]">
          {isEditing ? (
            <div className="flex flex-col gap-3 min-w-[300px] w-full bg-white  p-4 rounded-2xl border-2 border-olive-500 shadow-2xl">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className={[
                  'w-full px-4 py-3 text-sm rounded-xl resize-none outline-none',
                  'bg-olive-50  border border-olive-200',
                  'text-olive-950',
                  'focus:ring-2 focus:ring-olive-500/20'
                ].join(' ')}
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
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={handleEditCancel}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-olive-500 hover:text-olive-700   transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold bg-olive-600 text-white rounded-xl hover:bg-olive-700 shadow-lg shadow-olive-500/20 active:scale-95 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              className={[
                'flex flex-col shadow-sm transition-all duration-300 overflow-hidden',
                isOwnMessage
                  ? 'bg-olive-600  text-white rounded-tl-2xl rounded-tr-md rounded-br-2xl rounded-bl-2xl'
                  : 'bg-white  border border-olive-200/60  text-olive-900  rounded-tl-md rounded-tr-2xl rounded-br-2xl rounded-bl-2xl'
              ].join(' ')}
            >
              {/* Card Header (Owner Name) */}
              <div className={['px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.15em] border-b', 
                isOwnMessage ? 'border-white/10 text-white/90' : 'border-olive-100  text-olive-600'
              ].join(' ')}>
                {((name) => name.length > 10 ? name.slice(0, 10) + '…' : name)(message.sender?.name || 'Unknown')}
              </div>

              {/* Card Body */}
              <div className="px-5 py-3.5">
                {/* Reply preview inside bubble */}
                {message.replyTo && (
                  <div
                    className={[
                      'mb-3 p-2 rounded-lg text-xs flex items-center gap-3 transition-colors',
                      isOwnMessage ? 'bg-black/10 hover:bg-black/20 text-white/80' : 'bg-olive-50  hover:bg-olive-100 text-olive-500',
                      'cursor-pointer border-l-2',
                      isOwnMessage ? 'border-white/30' : 'border-olive-500'
                    ].join(' ')}
                    onClick={() => onLoadThread?.(message.replyTo!.id)}
                  >
                    <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{message.replyTo.content}</span>
                  </div>
                )}

                <div className="leading-relaxed text-[0.92rem] whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>
                  {message.content}
                </div>

                {/* Footer Info */}
                <div className={['mt-3 flex items-center justify-between gap-4 text-[11px] uppercase font-bold tracking-wider opacity-60'].join(' ')}>
                  <span>{formatTime(message.createdAt)}</span>
                  {message.isEdited && <span>(edited)</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Horizontal Reactions Bar */}
        {groupedReactions.size > 0 && (
          <div className={['flex flex-wrap gap-1.5 mt-2', isOwnMessage ? 'justify-end' : ''].join(' ')}>
            {Array.from(groupedReactions.entries()).map(([emoji, users]) => {
              const hasReacted = userReactions.includes(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className={[
                    'flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs transition-all active:scale-90',
                    'border',
                    hasReacted
                      ? 'bg-olive-50 border-olive-200 text-olive-700'
                      : 'bg-white border-olive-200 text-olive-600',
                    'hover:border-olive-400'
                  ].join(' ')}
                  title={`Reacted by ${users.length} user${users.length > 1 ? 's' : ''}`}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  <span>{users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Reply count indicator */}
        {message.replyCount > 0 && (
          <button
            onClick={() => onLoadThread?.(message.id)}
            className={[
              'mt-2 text-[0.72rem] font-bold uppercase tracking-widest text-olive-600 hover:text-olive-700   transition-colors',
              'flex items-center gap-1.5',
              isOwnMessage ? 'justify-end' : ''
            ].join(' ')}
          >
            <CornerDownRight className="w-3.5 h-3.5" />
            {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Floating Actions Overlay */}
      {!isEditing && (
        <div
          className={[
            'flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 mt-1',
            isOwnMessage ? 'mr-2' : 'ml-2'
          ].join(' ')}
        >
          <div className="flex bg-white  rounded-xl shadow-xl border border-olive-200/50  p-1">
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
                className="p-2 text-olive-500 hover:text-olive-600   rounded-lg hover:bg-olive-50  transition-colors"
                title="Add reaction"
              >
                <Smile size={16} />
              </button>

              {showEmojiPicker && emojiPickerPos && (
                <>
                  <div className="fixed inset-0 z-[6000]" onClick={() => setShowEmojiPicker(false)} />
                  <div
                    className="fixed p-2.5 bg-white  rounded-2xl shadow-2xl border border-olive-200  z-[6001]"
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
                          className="w-10 h-10 flex items-center justify-center text-xl rounded-xl hover:bg-olive-100  transition-all hover:scale-110 active:scale-90"
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
              className="p-2 text-olive-500 hover:text-olive-600   rounded-lg hover:bg-olive-50  transition-colors"
              title="Reply"
            >
              <CornerDownRight size={16} />
            </button>

            {/* Overflow Actions */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 text-olive-500 hover:text-olive-600   rounded-lg hover:bg-olive-50  transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>

              {showActions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                  <div className="absolute right-0 top-full mt-2 py-1.5 bg-white  rounded-xl shadow-2xl border border-olive-200  z-50 min-w-[140px] overflow-hidden">
                    {canEdit && (
                      <button
                        onClick={handleStartEdit}
                        className="w-full flex items-center gap-3 px-4 py-2 text-[0.82rem] font-bold text-olive-700  hover:bg-olive-50  transition-colors"
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
                        className="w-full flex items-center gap-3 px-4 py-2 text-[0.82rem] font-bold text-red-600  hover:bg-red-50  transition-colors"
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
        <div className="mt-2 ml-4 flex flex-col gap-2 border-l-2 border-olive-100  pl-4">
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