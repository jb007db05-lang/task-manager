import { useState, useEffect, FormEvent } from 'react';
import { Send } from 'lucide-react';
import { getComments, addComment, type Comment } from '@/services/comments';
import { formatDate } from '@/utils/date';
import UserAvatar from './UserAvatar';

interface CommentSectionProps {
  taskId: string;
}

function CommentSection({ taskId }: CommentSectionProps): JSX.Element {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadComments = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getComments(taskId);
        if (isMounted) setComments(data);
      } catch {
        if (isMounted) setError('Unable to load comments.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadComments();
    return () => { isMounted = false; };
  }, [taskId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      const newComment = await addComment(taskId, content.trim());
      setComments((prev) => [...prev, newComment]);
      setContent('');
    } catch {
      setError('Unable to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayDate = (dateString: string) => formatDate(dateString, 'short');

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 min-h-[120px]">
        {loading ? (
          <div className="grid gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton !rounded-full w-6 h-6" />
                <div className="flex-1 grid gap-1.5"><div className="skeleton h-3 w-24" /><div className="skeleton h-10" /></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>
        ) : comments.length === 0 ? (
          <p className="text-[13px] text-olive-500 m-0 py-2">No comments yet. Ask a question or share an update.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5 animate-in">
              <UserAvatar name={comment.user.name} email={comment.user.email} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-olive-900">{comment.user.name || comment.user.email}</span>
                  <span className="text-[11px] text-olive-400">{displayDate(comment.createdAt)}</span>
                </div>
                <p className="m-0 mt-0.5 text-[13px] text-olive-700 leading-relaxed break-words whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="rounded-lg border border-olive-300 bg-white shadow-xs focus-within:border-brand-500 focus-within:shadow-[var(--focus-ring)] transition-shadow">
          <textarea
            aria-label="Write a comment"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSubmit(e);
            }}
            placeholder="Write a comment…"
            className="block w-full px-3 pt-2.5 pb-1 bg-transparent text-[13px] focus:outline-none resize-none max-h-32 border-0 !shadow-none"
            rows={2}
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[11px] text-olive-400 pl-1"><span className="kbd">Ctrl</span> + <span className="kbd">Enter</span> to send</span>
            <button type="submit" disabled={!content.trim() || submitting} className="btn btn-sm btn-primary !h-7">
              <Send size={13} />
              {submitting ? 'Sending…' : 'Comment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CommentSection;