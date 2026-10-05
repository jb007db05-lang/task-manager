import { useState, useEffect, FormEvent } from 'react';
import { Send, MessageSquare } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-olive-50/30  rounded-xl overflow-hidden border border-olive-200 ">
      <div className="p-4 border-b border-olive-200  flex items-center gap-2 bg-white ">
        <MessageSquare size={16} className="text-olive-400" />
        <h3 className="text-sm font-bold text-olive-700  uppercase tracking-wider">Comments</h3>
        <span className="px-2 py-0.5 rounded-full bg-olive-100  text-[0.7rem] font-bold text-olive-500">
          {comments.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-olive-500"></div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600   ">
            {error}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-olive-400 py-8">
            <MessageSquare size={32} className="opacity-10 mb-2" />
            <p className="text-xs font-medium">No comments yet. Start the conversation!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2">
              <UserAvatar 
                name={comment.user.name} 
                email={comment.user.email} 
                size="sm" 
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-olive-700 ">
                    {comment.user.name || comment.user.email}
                  </span>
                  <span className="text-[11px] text-olive-400 font-medium">
                    {displayDate(comment.createdAt)}
                  </span>
                </div>
                <div className="text-sm text-olive-600  leading-relaxed break-words bg-white  p-3 rounded-xl border border-olive-100  shadow-sm">
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white  border-t border-olive-200 ">
        <div className="relative group">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            className="w-full pl-4 pr-12 py-3 bg-olive-50  border border-olive-200  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all resize-none max-h-32"
            rows={2}
          />
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="absolute right-2 bottom-2 p-2 bg-olive-600 text-white rounded-lg hover:bg-olive-500 disabled:opacity-40 disabled:hover:bg-olive-600 transition-all shadow-lg shadow-olive-500/20"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

export default CommentSection;