
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';
import { MessageSquare, ThumbsUp, Image as ImageIcon, BarChart2, Grid, List, Eye, Clock } from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface PostListProps {
  posts: Post[];
  boardSlug: string;
}

const PostList: React.FC<PostListProps> = ({ posts: initialPosts, boardSlug }) => {
  const { user } = useAuth();
  const { isAiHubMode } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>('전체');
  
  const boards = storage.getBoards();
  const currentBoard = boards.find(b => b.slug === boardSlug);
  const categories = currentBoard?.categories || [];

  const blockedUsers = user?.blocked_users || [];
  
  const filteredPosts = initialPosts
    .filter(p => !blockedUsers.includes(p.author_id))
    .filter(p => activeCategory === '전체' ? true : p.category === activeCategory);

  return (
    <div className="transition-all">
      {/* Category Tabs - Horizontal Scroll */}
      {categories.length > 0 && (
        <div className="flex items-center space-x-1 p-2 bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveCategory('전체')}
            className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all whitespace-nowrap ${activeCategory === '전체' ? (isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-indigo-600 text-white') : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
          >
            전체
          </button>
          {categories.map(cat => (
             <button 
               key={cat}
               onClick={() => setActiveCategory(cat)}
               className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all whitespace-nowrap ${activeCategory === cat ? (isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-indigo-600 text-white') : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
             >
               {cat}
             </button>
          ))}
        </div>
      )}

      {/* Compact List View */}
      <div className="flex flex-col">
        {filteredPosts.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-xs uppercase tracking-widest font-mono">No data found in this node</div>
        ) : (
          filteredPosts.map((post) => (
            <div key={post.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-all active:bg-gray-100">
              <Link to={`/board/${boardSlug}/${post.id}`} className="block p-3.5">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`text-[15px] leading-tight flex-1 line-clamp-2 ${post.is_hot ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                      {post.title}
                      {post.comment_count > 0 && (
                        <span className={`ml-1.5 text-xs font-black ${isAiHubMode ? 'text-cyan-500' : 'text-indigo-600'}`}>
                          [{post.comment_count}]
                        </span>
                      )}
                    </h3>
                    {post.images && post.images.length > 0 && (
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                        <img src={post.images[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400 font-medium">
                    <span className="flex items-center gap-1">
                      {post.author.active_items?.badge}
                      <span className="font-black" style={{ color: post.author.active_items?.name_color }}>{post.author.username}</span>
                    </span>
                    <span className="flex items-center gap-1 opacity-60"><Clock size={10}/> {new Date(post.created_at).toLocaleDateString().slice(5)}</span>
                    <span className="flex items-center gap-1 opacity-60"><Eye size={10}/> {post.view_count}</span>
                    <span className={`flex items-center gap-1 ${post.upvotes > 10 ? 'text-orange-500 font-bold' : 'opacity-60'}`}>
                      <ThumbsUp size={10}/> {post.upvotes}
                    </span>
                    <div className="flex gap-1 ml-auto">
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
    </div>
  );
};

export default PostList;
