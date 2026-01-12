
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';
import { MessageSquare, ThumbsUp, Image as ImageIcon, BarChart2, Grid, List, Eye, Clock } from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserNickname } from './UserEffect';

interface PostListProps {
  posts: Post[];
  boardSlug: string;
}

const PostList: React.FC<PostListProps> = ({ posts: initialPosts, boardSlug }) => {
  const { user } = useAuth();
  const { isAiHubMode } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>('전체');
  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 10;

  const boards = storage.getBoards();
  const currentBoard = boards.find(b => b.slug === boardSlug);
  const categories = currentBoard?.categories || [];

  const blockedUsers = user?.blocked_users || [];

  const filteredPosts = initialPosts
    .filter(p => !blockedUsers.includes(p.author_id))
    .filter(p => activeCategory === '전체' ? true : p.category === activeCategory)
    .sort((a, b) => {
      // Pinned posts first
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return 0; // Keep original order otherwise
    });

  // Pagination Logic
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  // Reset page when category changes
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  return (
    <div className="transition-all">
      {/* Category Tabs - Horizontal Scroll */}
      {categories.length > 0 && (
        <div className="flex items-center space-x-1 p-2 bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleCategoryChange('전체')}
            className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all whitespace-nowrap ${activeCategory === '전체' ? (isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-indigo-600 text-white') : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
          >
            전체
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all whitespace-nowrap ${activeCategory === cat ? (isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-indigo-600 text-white') : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Compact List View */}
      <div className="flex flex-col">
        {paginatedPosts.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-xs uppercase tracking-widest font-mono">No data found in this node</div>
        ) : (
          paginatedPosts.map((post) => (
            <div
              key={post.id}
              className={`
                border-b border-gray-50 dark:border-gray-700/50 
                hover:bg-gray-50/50 dark:hover:bg-gray-700/20 
                transition-all active:bg-gray-100 
                ${post.style_effect === 'glow' ? 'post-glow' : ''}
              `}
            >
              <Link to={`/board/${boardSlug}/${post.id}`} className="block p-3.5">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`text-[15px] leading-tight flex-1 line-clamp-2 ${post.is_spoiler ? 'text-gray-400 dark:text-gray-500 italic' : (post.is_hot ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200')}`}>
                      {post.is_pinned && (
                        <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded mr-1.5 uppercase font-black">📌 고정</span>
                      )}
                      {post.is_spoiler ? (
                        <span className="flex items-center gap-1">
                          <span className="text-red-500 text-[10px] border border-red-200 dark:border-red-800 px-1 rounded">SPOILER</span>
                          {post.title}
                        </span>
                      ) : post.title}
                      {post.comment_count > 0 && (
                        <span className={`ml-1.5 text-xs font-black ${isAiHubMode ? 'text-cyan-500' : 'text-indigo-600'}`}>
                          [{post.comment_count}]
                        </span>
                      )}
                    </h3>
                    {post.images && post.images.length > 0 && !post.is_spoiler && (
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                        <img src={post.images[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400 font-medium">
                    <span className="flex items-center gap-1">
                      <UserNickname profile={post.author} />
                    </span>
                    <span className="flex items-center gap-1 opacity-60"><Clock size={10} /> {new Date(post.created_at).toLocaleDateString().slice(5)}</span>
                    <span className="flex items-center gap-1 opacity-60"><Eye size={10} /> {post.view_count}</span>
                    <span className={`flex items-center gap-1 ${post.upvotes > 10 ? 'text-orange-500 font-bold' : 'opacity-60'}`}>
                      <ThumbsUp size={10} /> {post.upvotes}
                    </span>
                    <div className="flex gap-1 ml-auto flex-wrap">
                      {post.tags && post.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-indigo-500 dark:text-indigo-400 text-[9px] font-bold">#{tag}</span>
                      ))}
                      {post.category && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md text-[9px] uppercase font-bold">{post.category}</span>}
                      {post.ai_agent_type && <span className={`px-1.5 py-0.5 rounded-md text-[9px] uppercase font-black ${isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-indigo-600 text-white'}`}>AI</span>}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 p-4 mt-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ← 이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${currentPage === page ? (isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-indigo-600 text-white') : 'border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
};

export default PostList;
