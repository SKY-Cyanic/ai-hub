import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, increment, addDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import {
    Code2, Heart, MessageCircle, Play, Eye, Trash2, Share2,
    Loader2, Maximize2, Minimize2, ChevronLeft, Send
} from 'lucide-react';

interface WebDevPost {
    id: string;
    title: string;
    code: string;
    language: string;
    authorId: string;
    authorName: string;
    createdAt: any;
    views: number;
    likes: number;
    likedBy?: string[];
}

interface Comment {
    id: string;
    postId: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: any;
}

const WebDevPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<WebDevPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<WebDevPost | null>(null);
    const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    // 게시물 로드
    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'vibe_code_gallery'), orderBy('createdAt', 'desc'), limit(50));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as WebDevPost));
            setPosts(data);
        } catch (e) {
            console.error('Load posts error:', e);
        } finally {
            setLoading(false);
        }
    };

    // 댓글 로드
    const loadComments = async (postId: string) => {
        setLoadingComments(true);
        try {
            const q = query(collection(db, 'vibe_code_comments'), orderBy('createdAt', 'asc'));
            const snap = await getDocs(q);
            const data = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as Comment))
                .filter(c => c.postId === postId);
            setComments(data);
        } catch (e) {
            console.error('Load comments error:', e);
        } finally {
            setLoadingComments(false);
        }
    };

    // 게시물 선택
    const handleSelectPost = async (post: WebDevPost) => {
        setSelectedPost(post);
        // 조회수 증가
        try {
            await updateDoc(doc(db, 'vibe_code_gallery', post.id), { views: increment(1) });
        } catch (e) { }
        loadComments(post.id);
    };

    // 좋아요
    const handleLike = async (post: WebDevPost) => {
        if (!user) return alert('로그인이 필요합니다.');

        const likedBy = post.likedBy || [];
        if (likedBy.includes(user.id)) return alert('이미 좋아요를 눌렀습니다.');

        try {
            await updateDoc(doc(db, 'vibe_code_gallery', post.id), {
                likes: increment(1),
                likedBy: [...likedBy, user.id]
            });

            // 로컬 업데이트
            setPosts(prev => prev.map(p =>
                p.id === post.id ? { ...p, likes: p.likes + 1, likedBy: [...likedBy, user.id] } : p
            ));
            if (selectedPost?.id === post.id) {
                setSelectedPost({ ...post, likes: post.likes + 1, likedBy: [...likedBy, user.id] });
            }
        } catch (e) {
            console.error('Like error:', e);
        }
    };

    // 댓글 추가
    const handleAddComment = async () => {
        if (!user || !selectedPost || !newComment.trim()) return;

        try {
            await addDoc(collection(db, 'vibe_code_comments'), {
                postId: selectedPost.id,
                authorId: user.id,
                authorName: user.nickname || user.email?.split('@')[0] || '익명',
                content: newComment.trim(),
                createdAt: Timestamp.now()
            });
            setNewComment('');
            loadComments(selectedPost.id);
        } catch (e) {
            console.error('Add comment error:', e);
        }
    };

    // 삭제
    const handleDelete = async (post: WebDevPost) => {
        if (!user || user.id !== post.authorId) return;
        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, 'vibe_code_gallery', post.id));
            setPosts(prev => prev.filter(p => p.id !== post.id));
            setSelectedPost(null);
        } catch (e) {
            console.error('Delete error:', e);
        }
    };

    // 미리보기 HTML 생성
    const getPreviewHtml = (code: string) => {
        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea, #764ba2); min-height: 100vh; color: white; }
  button { padding: 12px 24px; border: none; border-radius: 12px; background: white; color: #667eea; font-weight: bold; cursor: pointer; margin: 5px; transition: transform 0.2s; }
  button:hover { transform: scale(1.05); }
  input, textarea { padding: 12px; border: 2px solid rgba(255,255,255,0.3); border-radius: 12px; background: rgba(255,255,255,0.1); color: white; margin: 5px; outline: none; }
</style></head><body>${code}</body></html>`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    // 상세 보기
    if (selectedPost) {
        return (
            <div className="max-w-4xl mx-auto space-y-4">
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                    <button onClick={() => setSelectedPost(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <ChevronLeft size={18} /> 목록으로
                    </button>
                    {user?.id === selectedPost.authorId && (
                        <button onClick={() => handleDelete(selectedPost)} className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1">
                            <Trash2 size={14} /> 삭제
                        </button>
                    )}
                </div>

                {/* 제목 */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border dark:border-gray-800">
                    <h1 className="text-xl font-black mb-2">{selectedPost.title}</h1>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>by {selectedPost.authorName}</span>
                        <span className="flex items-center gap-1"><Eye size={12} /> {selectedPost.views}</span>
                        <span className="flex items-center gap-1"><Heart size={12} /> {selectedPost.likes}</span>
                    </div>
                </div>

                {/* 미리보기 */}
                <div className={`bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 ${isPreviewExpanded ? 'fixed inset-4 z-50' : ''}`}>
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                            <Play size={14} className="text-green-400" />
                            <span className="text-xs font-bold text-gray-400">미리보기</span>
                        </div>
                        <button onClick={() => setIsPreviewExpanded(!isPreviewExpanded)} className="text-gray-500 hover:text-white">
                            {isPreviewExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                    </div>
                    <iframe
                        srcDoc={getPreviewHtml(selectedPost.code)}
                        title="Preview"
                        className={`w-full ${isPreviewExpanded ? 'h-[calc(100%-40px)]' : 'h-72'}`}
                        sandbox="allow-scripts"
                    />
                </div>

                {/* 코드 보기 */}
                <div className="bg-[#1d1f21] rounded-2xl overflow-hidden border border-gray-800">
                    <div className="px-4 py-2 bg-[#2d2f31] border-b border-gray-700 flex items-center gap-2">
                        <Code2 size={14} className="text-gray-500" />
                        <span className="text-xs font-mono text-gray-400">code.{selectedPost.language}</span>
                    </div>
                    <pre className="p-4 text-xs text-green-400 font-mono overflow-x-auto max-h-60">{selectedPost.code}</pre>
                </div>

                {/* 좋아요/공유 */}
                <div className="flex gap-3">
                    <button
                        onClick={() => handleLike(selectedPost)}
                        className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${selectedPost.likedBy?.includes(user?.id || '')
                                ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-pink-50'
                            }`}
                    >
                        <Heart size={18} fill={selectedPost.likedBy?.includes(user?.id || '') ? 'currentColor' : 'none'} />
                        좋아요 {selectedPost.likes}
                    </button>
                    <button
                        onClick={() => { navigator.clipboard.writeText(selectedPost.code); alert('코드가 복사되었습니다!'); }}
                        className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all"
                    >
                        <Share2 size={18} /> 코드 복사
                    </button>
                </div>

                {/* 댓글 */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border dark:border-gray-800">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <MessageCircle size={16} /> 댓글 {comments.length}
                    </h3>

                    {/* 댓글 입력 */}
                    {user ? (
                        <div className="flex gap-2 mb-4">
                            <input
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                placeholder="댓글을 입력하세요..."
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                            />
                            <button onClick={handleAddComment} disabled={!newComment.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl disabled:opacity-50">
                                <Send size={16} />
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mb-4">댓글을 작성하려면 로그인하세요.</p>
                    )}

                    {/* 댓글 목록 */}
                    <div className="space-y-3">
                        {loadingComments ? (
                            <Loader2 className="animate-spin text-gray-400 mx-auto" size={20} />
                        ) : comments.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">아직 댓글이 없습니다.</p>
                        ) : (
                            comments.map(c => (
                                <div key={c.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold">{c.authorName}</span>
                                        <span className="text-[10px] text-gray-400">
                                            {c.createdAt?.toDate?.()?.toLocaleDateString?.() || ''}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{c.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 목록 보기
    return (
        <div className="space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                        <Code2 className="text-white" size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black">WEB DEV</h1>
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-yellow-400 text-yellow-900 rounded">BETA</span>
                        </div>
                        <p className="text-xs text-gray-500">바이브 코딩으로 만든 작품들</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/tools/vibe-code')}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all"
                >
                    + 새 작품 만들기
                </button>
            </div>

            {/* 게시물 그리드 */}
            {posts.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <Code2 className="mx-auto mb-4 opacity-30" size={48} />
                    <p>아직 게시물이 없습니다.</p>
                    <p className="text-sm mt-2">바이브 코딩에서 첫 작품을 만들어보세요!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {posts.map(post => (
                        <div
                            key={post.id}
                            onClick={() => handleSelectPost(post)}
                            className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border dark:border-gray-800 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                        >
                            {/* 미리보기 썸네일 */}
                            <div className="h-40 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
                                <iframe
                                    srcDoc={getPreviewHtml(post.code)}
                                    className="w-full h-full pointer-events-none scale-75 origin-top-left"
                                    style={{ width: '133%', height: '133%' }}
                                    sandbox="allow-scripts"
                                    title={post.title}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                    <Play className="text-white opacity-0 group-hover:opacity-100 transition-all" size={32} />
                                </div>
                            </div>

                            {/* 정보 */}
                            <div className="p-4">
                                <h3 className="font-bold text-sm mb-2 truncate">{post.title}</h3>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{post.authorName}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1"><Eye size={12} /> {post.views || 0}</span>
                                        <span className="flex items-center gap-1"><Heart size={12} /> {post.likes || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WebDevPage;
