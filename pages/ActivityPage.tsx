
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { Post, Comment } from '../types';
import { Link } from 'react-router-dom';
import { BarChart2, FileText, MessageSquare, ThumbsUp, TrendingUp, Clock, Award, Coins } from 'lucide-react';

const ActivityPage: React.FC = () => {
    const { user } = useAuth();
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [userComments, setUserComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setLoading(true);

        // Fetch user's posts and comments (simplified, ideally from a dedicated API)
        storage.subscribePosts((allPosts) => {
            setUserPosts(allPosts.filter(p => p.author_id === user.id));
        });

        storage.subscribeComments('', (allComments) => {
            setUserComments(allComments.filter(c => c.author_id === user.id));
        });

        setLoading(false);
    }, [user]);

    if (!user) {
        return <div className="text-center py-20 text-gray-500">로그인이 필요합니다.</div>;
    }

    const totalLikes = userPosts.reduce((sum, p) => sum + (p.upvotes || 0), 0);
    const totalViews = userPosts.reduce((sum, p) => sum + (p.view_count || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl p-6 shadow-lg">
                <h1 className="text-2xl font-black flex items-center gap-2"><BarChart2 /> 내 활동</h1>
                <p className="text-indigo-200 text-sm mt-1">내가 작성한 글, 댓글, 받은 반응 등을 한눈에 확인하세요.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"><FileText size={20} /></div>
                        <div>
                            <p className="text-2xl font-black text-gray-800 dark:text-white">{userPosts.length}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">작성한 글</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"><MessageSquare size={20} /></div>
                        <div>
                            <p className="text-2xl font-black text-gray-800 dark:text-white">{userComments.length}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">작성한 댓글</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"><ThumbsUp size={20} /></div>
                        <div>
                            <p className="text-2xl font-black text-gray-800 dark:text-white">{totalLikes}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">받은 좋아요</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400"><TrendingUp size={20} /></div>
                        <div>
                            <p className="text-2xl font-black text-gray-800 dark:text-white">{totalViews}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">총 조회수</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction History - CR */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><Coins size={18} /> CR 변동 내역</h3>
                {(!user.transactions || user.transactions.length === 0) ? (
                    <p className="text-gray-400 text-sm">CR 변동 내역이 없습니다.</p>
                ) : (
                    <div className="space-y-3">
                        {user.transactions.slice().reverse().slice(0, 10).map(tx => (
                            <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${tx.amount > 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                                        }`}>
                                        {tx.amount > 0 ? '+' : ''}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{tx.description}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                    }`}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} CR
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Posts */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><Clock size={18} /> 내가 쓴 최근 글</h3>
                {userPosts.length === 0 ? (
                    <p className="text-gray-400 text-sm">아직 작성한 글이 없습니다.</p>
                ) : (
                    <div className="space-y-2">
                        {userPosts.slice(0, 10).map(post => (
                            <Link key={post.id} to={`/board/${post.board_id}/${post.id}`} className="block p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{post.title}</p>
                                <p className="text-xs text-gray-400 mt-1">좋아요 {post.upvotes} · 댓글 {post.comment_count} · {new Date(post.created_at).toLocaleDateString()}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Achievements */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><Award size={18} /> 획득 업적</h3>
                {user.achievements.length === 0 ? (
                    <p className="text-gray-400 text-sm">아직 획득한 업적이 없습니다.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {user.achievements.map(ach => (
                            <span key={ach} className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-bold">{ach}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityPage;
