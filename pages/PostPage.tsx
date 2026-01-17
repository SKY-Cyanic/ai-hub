import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { Post, Comment, FactCheckReport } from '../types';
import CommentSection from '../components/CommentSection';
import { ThumbsUp, ThumbsDown, Share2, Eye, Clock, BarChart2, Ban, Trash2, Bookmark, Sparkles, AlertTriangle, ShieldCheck, ZoomIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ImageLightbox from '../components/ImageLightbox';
import { UserNickname } from '../components/UserEffect';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const PostPage: React.FC = () => {
  const { boardId, postId } = useParams<{ boardId: string; postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthorMenu, setShowAuthorMenu] = useState(false);
  const { user, refreshUser } = useAuth();
  const [isScrapped, setIsScrapped] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (postId) {
        const postData = await api.getPost(postId);
        setPost(postData);
        const unsubscribe = storage.subscribeComments(postId, (updatedComments) => {
          setComments(updatedComments);
        });
        setLoading(false);
        return () => unsubscribe();
      }
    };
    fetchData();
  }, [postId]);

  useEffect(() => {
    if (user && post && user.scrapped_posts?.includes(post.id)) setIsScrapped(true);
    else setIsScrapped(false);
  }, [user, post]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!post || !user) return alert('로그인이 필요합니다.');
    if (post.liked_users && post.liked_users.includes(user.id)) return alert('이미 평가한 게시물입니다.');
    const success = await api.votePost(post.id, type, user.id);
    if (success) {
      setPost(prev => prev ? {
        ...prev,
        upvotes: type === 'up' ? prev.upvotes + 1 : prev.upvotes,
        downvotes: type === 'down' ? prev.downvotes + 1 : prev.downvotes,
        liked_users: [...(prev.liked_users || []), user.id]
      } : null);
    }
  };

  const handleReportAiError = async () => {
    if (!user) return alert('로그인이 필요합니다.');
    if (!post) return;
    const reason = prompt('AI가 작성한 글에서 발견된 오류 내용을 적어주세요.\n사실 여부 확인 후 보상이 지급됩니다.');
    if (reason && reason.trim()) {
      setIsReporting(true);
      const report: FactCheckReport = {
        id: `rep-${Date.now()}`,
        post_id: post.id,
        reporter_id: user.id,
        reason: reason,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      const res = await storage.reportAiError(report);
      if (res) alert('성공적으로 제보되었습니다. 시스템 검토를 기다려주세요.');
      else alert('제보에 실패했습니다.');
      setIsReporting(false);
    }
  };

  const handleReportPost = async () => {
    if (!user) return alert('로그인이 필요합니다.');
    if (!post) return;
    const reason = prompt('신고 사유를 입력해주세요:\n(예: 욕설/비방, 스팸/광고, 불법 콘텐츠, 기타)');
    if (reason && reason.trim()) {
      const res = await storage.reportPost(user.id, post.id, reason);
      alert(res.message);
    }
  };

  const processContent = (html: string) => {
    // YouTube embed
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
    let processed = html.replace(youtubeRegex, (match, videoId) => {
      return `<div class="aspect-w-16 aspect-h-9 my-4"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen class="w-full h-full rounded shadow-lg" style="min-height: 300px;"></iframe></div>`;
    });

    // Convert URLs to clickable links (not already in href or src)
    const urlRegex = /(?<!["'=])(https?:\/\/[^\s<>"']+)/g;
    processed = processed.replace(urlRegex, (url) => {
      // Skip if it's a YouTube URL (already processed)
      if (url.includes('youtube.com') || url.includes('youtu.be')) return url;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline break-all">${url}</a>`;
    });

    return processed;
  };

  if (loading) return <div className="p-8 text-center dark:text-gray-300 animate-pulse font-ai text-gray-500 uppercase">Syncing node data...</div>;
  if (!post) return <div className="p-8 text-center text-red-500">데이터가 손상되었거나 존재하지 않습니다.</div>;

  const isLiked = user && post.liked_users && post.liked_users.includes(user.id);
  const isDisliked = user && post.disliked_users && post.disliked_users.includes(user.id);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm shadow-sm p-4 md:p-6 transition-colors">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
        {/* ... Header Content (unchanged) ... */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-sm text-indigo-600 dark:text-indigo-400 font-bold">
            <Link to={`/board/${boardId}`} className="hover:underline">{boardId}</Link>
            {post.category && <span className="text-gray-400">/ {post.category}</span>}
          </div>
          <div className="flex items-center gap-2">
            {user && user.id === post.author_id && (
              <>
                <button
                  onClick={() => navigate('/write', { state: { editPost: post } })}
                  className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold underline decoration-dotted"
                >
                  수정
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('정말로 이 글을 삭제하시겠습니까?')) {
                      await storage.deletePost(post.id);
                      navigate(`/board/${boardId}`);
                    }
                  }}
                  className="text-gray-400 hover:text-red-500 text-xs font-bold underline decoration-dotted"
                >
                  삭제
                </button>
              </>
            )}
            {post.ai_agent_type && (
              <button
                onClick={handleReportAiError}
                disabled={isReporting}
                className="flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-[10px] font-black border border-red-100 dark:border-red-900/50 hover:bg-red-100 transition-all animate-pulse"
              >
                <ShieldCheck size={12} /> REPORT AI ERROR (BUG BOUNTY)
              </button>
            )}
            {/* 게시물 신고 버튼 */}
            {user && user.id !== post.author_id && (
              <button
                onClick={handleReportPost}
                className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-[10px] font-bold border border-gray-200 dark:border-gray-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
              >
                <Ban size={12} /> 신고
              </button>
            )}
          </div>
        </div>
        <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-3">{post.title}</h1>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4 relative">
            <UserNickname profile={post.author} />
            <span><Clock size={12} className="inline mr-1" />{new Date(post.created_at).toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-3">
            <span><Eye size={12} className="inline mr-1" />{post.view_count}</span>
            <span className="text-red-500 font-bold"><ThumbsUp size={12} className="inline mr-1" />{post.upvotes}</span>
            <span className="text-blue-500 font-bold"><ThumbsDown size={12} className="inline mr-1" />{post.downvotes}</span>
          </div>
        </div>
      </div>

      <div className="py-6 min-h-[200px] leading-7">
        {post.is_spoiler && (
          <div className="bg-gray-100 dark:bg-gray-700/50 p-6 rounded-xl text-center mb-6">
            <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
            <h3 className="font-bold text-lg mb-1 dark:text-white">스포일러 경고</h3>
            <p className="text-gray-500 text-sm mb-4">작성자가 스포일러 방지를 설정했습니다.</p>
            <details className="cursor-pointer">
              <summary className="inline-block px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors dark:text-gray-200">
                내용 보기 (클릭)
              </summary>
              <div className="mt-6 text-left animate-fade-in">
                <div dangerouslySetInnerHTML={{ __html: processContent(post.content) }} />
                {/* Images inside spoiler */}
                {post.images && post.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                    {post.images.map((img, idx) => (
                      <button key={idx} onClick={() => setLightboxSrc(img)} className="block overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow group relative">
                        <img src={img} alt={`이미지 ${idx + 1}`} className="w-full h-48 object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                          <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
        {!post.is_spoiler && (
          <>
            <div dangerouslySetInnerHTML={{ __html: processContent(post.content) }} />
            {/* Images for non-spoiler posts */}
            {post.images && post.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                {post.images.map((img, idx) => (
                  <button key={idx} onClick={() => setLightboxSrc(img)} className="block overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow group relative">
                    <img src={img} alt={`이미지 ${idx + 1}`} className="w-full h-48 object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                      <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Poll Display */}
        {post.poll && (
          <div className="mt-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="text-indigo-600 dark:text-indigo-400" size={20} />
              <h3 className="font-black text-lg text-gray-800 dark:text-white">{post.poll.question}</h3>
            </div>
            <div className="space-y-3">
              {post.poll.options.map((option) => {
                const totalVotes = post.poll!.options.reduce((sum, o) => sum + o.votes, 0);
                const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                const hasVoted = user && post.poll!.voted_users?.includes(user.id);
                const canVote = user && !hasVoted;

                return (
                  <button
                    key={option.id}
                    onClick={async () => {
                      if (!canVote) return;
                      // 투표 처리
                      const updatedPoll = {
                        ...post.poll!,
                        options: post.poll!.options.map(o =>
                          o.id === option.id ? { ...o, votes: o.votes + 1 } : o
                        ),
                        voted_users: [...(post.poll!.voted_users || []), user!.id]
                      };
                      await storage.updatePost({ ...post, poll: updatedPoll });
                      setPost(prev => prev ? { ...prev, poll: updatedPoll } : null);
                    }}
                    disabled={!canVote}
                    className={`w-full relative overflow-hidden rounded-xl transition-all ${canVote ? 'hover:shadow-md cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`absolute inset-0 bg-indigo-400/30 dark:bg-indigo-600/30 transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 border border-indigo-100 dark:border-indigo-800 rounded-xl">
                      <span className="font-bold text-gray-800 dark:text-white">{option.text}</span>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {percentage}% ({option.votes}표)
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
              {user && post.poll.voted_users?.includes(user.id)
                ? '✅ 투표 완료'
                : user
                  ? '클릭하여 투표하세요'
                  : '로그인 후 투표 가능'}
              <span className="ml-2">
                (총 {post.poll.options.reduce((sum, o) => sum + o.votes, 0)}명 참여)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div className="flex justify-center space-x-4 my-8">
        <button
          onClick={() => handleVote('up')}
          disabled={!user}
          className={`flex flex-col items-center justify-center w-20 h-20 rounded-full border-2 transition-all active:scale-95 ${isLiked ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-500' : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-red-400 hover:text-red-400'}`}
        >
          <ThumbsUp size={24} className={isLiked ? 'fill-current' : ''} />
          <span className="font-bold text-lg mt-1">{post.upvotes}</span>
        </button>
        <button
          onClick={() => handleVote('down')}
          disabled={!user}
          className={`flex flex-col items-center justify-center w-20 h-20 rounded-full border-2 transition-all active:scale-95 ${isDisliked ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-500' : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-blue-400 hover:text-blue-400'}`}
        >
          <ThumbsDown size={24} className={isDisliked ? 'fill-current' : ''} />
          <span className="font-bold text-lg mt-1">{post.downvotes}</span>
        </button>
      </div>

      <CommentSection comments={comments} postId={post.id} postAuthorId={post.author_id} />
    </div>
  );
};

export default PostPage;
