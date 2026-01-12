
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storage } from '../services/storage';
import { Post } from '../types';
import { TrendingUp, Flame, Eye, MessageSquare } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const TrendingWidget: React.FC = () => {
    const { isAiHubMode } = useTheme();
    const [hotPosts, setHotPosts] = useState<Post[]>([]);

    useEffect(() => {
        const unsubscribe = storage.subscribePosts((allPosts) => {
            // Calculate score and get top 5
            const scored = allPosts.map(p => ({
                ...p,
                score: (p.view_count || 0) + (p.upvotes || 0) * 2 + (p.comment_count || 0) * 3
            }));
            scored.sort((a, b) => b.score - a.score);
            setHotPosts(scored.slice(0, 5));
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2 text-sm">
                <Flame className={isAiHubMode ? 'text-cyan-400' : 'text-orange-500'} size={18} />
                Neural Trends
            </h3>

            {/* Trending Keywords (Phase 2.1) */}
            <div className="flex flex-wrap gap-1.5 mb-6">
                {['#GPT-4o', '#AI영상', '#코딩비서', '#특이점', '#신형모델'].map((tag, idx) => (
                    <Link
                        key={tag}
                        to={`/search?q=${tag.replace('#', '')}`}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${idx === 0
                                ? (isAiHubMode ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/30' : 'bg-indigo-100 text-indigo-700')
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                            }`}
                    >
                        {tag}
                    </Link>
                ))}
            </div>

            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Top Access Nodes</h4>
            <div className="space-y-2">
                {hotPosts.length === 0 ? (
                    <p className="text-gray-400 text-xs">아직 인기글이 없습니다.</p>
                ) : (
                    hotPosts.map((post, idx) => (
                        <Link
                            key={post.id}
                            to={`/board/${post.board_id}/${post.id}`}
                            className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors group"
                        >
                            <span className={`text-lg font-black w-6 text-center ${idx < 3 ? (isAiHubMode ? 'text-cyan-400' : 'text-orange-500') : 'text-gray-300'}`}>
                                {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-indigo-600">{post.title}</p>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                    <span className="flex items-center gap-0.5"><Eye size={10} /> {post.view_count}</span>
                                    <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {post.comment_count}</span>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default TrendingWidget;
