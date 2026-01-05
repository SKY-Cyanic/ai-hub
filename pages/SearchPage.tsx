
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storage } from '../services/storage';
import { Post } from '../types';
import { Search, Filter, X, Tag, User, Calendar, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const SearchPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAiHubMode } = useTheme();

    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [filterBoard, setFilterBoard] = useState('all');
    const [filterTag, setFilterTag] = useState('');
    const [filterAuthor, setFilterAuthor] = useState('');

    const boards = storage.getBoards();

    const handleSearch = () => {
        if (!query.trim() && !filterTag && !filterAuthor) return;
        setLoading(true);

        storage.subscribePosts((allPosts) => {
            let filtered = allPosts;

            // Text search in title and content
            if (query.trim()) {
                const q = query.toLowerCase();
                filtered = filtered.filter(p =>
                    p.title.toLowerCase().includes(q) ||
                    p.content.toLowerCase().includes(q)
                );
            }

            // Board filter
            if (filterBoard !== 'all') {
                filtered = filtered.filter(p => p.board_id === filterBoard);
            }

            // Tag filter
            if (filterTag) {
                filtered = filtered.filter(p => p.tags?.includes(filterTag));
            }

            // Author filter
            if (filterAuthor) {
                filtered = filtered.filter(p =>
                    p.author.username.toLowerCase().includes(filterAuthor.toLowerCase())
                );
            }

            setResults(filtered);
            setLoading(false);
        });
    };

    useEffect(() => {
        if (searchParams.get('q')) {
            handleSearch();
        }
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Search Header */}
            <div className={`rounded-2xl p-6 ${isAiHubMode ? 'bg-gradient-to-r from-slate-900 to-cyan-900' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} text-white shadow-lg`}>
                <h1 className="text-2xl font-black flex items-center gap-2 mb-4"><Search /> 고급 검색</h1>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="검색어를 입력하세요..."
                        className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/50 backdrop-blur-sm"
                    />
                    <button
                        onClick={handleSearch}
                        className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        검색
                    </button>
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="mt-3 text-sm text-white/70 flex items-center gap-1 hover:text-white"
                >
                    <Filter size={14} /> 필터 {showFilters ? '숨기기' : '보기'} <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mt-4 p-4 bg-white/10 rounded-xl border border-white/20 grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-white/70 mb-1 block">게시판</label>
                            <select
                                value={filterBoard}
                                onChange={e => setFilterBoard(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white text-sm"
                            >
                                <option value="all" className="text-gray-800">전체</option>
                                {boards.map(b => (
                                    <option key={b.id} value={b.slug} className="text-gray-800">{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-white/70 mb-1 block flex items-center gap-1"><Tag size={12} /> 태그</label>
                            <input
                                type="text"
                                value={filterTag}
                                onChange={e => setFilterTag(e.target.value)}
                                placeholder="#태그"
                                className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-white/70 mb-1 block flex items-center gap-1"><User size={12} /> 작성자</label>
                            <input
                                type="text"
                                value={filterAuthor}
                                onChange={e => setFilterAuthor(e.target.value)}
                                placeholder="@username"
                                className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 text-sm"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Results */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4">
                    검색 결과 <span className="text-indigo-600">({results.length}건)</span>
                </h3>
                {loading ? (
                    <div className="text-center py-10 text-gray-400 animate-pulse">검색 중...</div>
                ) : results.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">검색 결과가 없습니다.</div>
                ) : (
                    <div className="space-y-2">
                        {results.map(post => (
                            <Link
                                key={post.id}
                                to={`/board/${post.board_id}/${post.id}`}
                                className="block p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                            >
                                <p className="font-medium text-gray-800 dark:text-gray-200">{post.title}</p>
                                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{post.content.replace(/<br\/>/g, ' ').slice(0, 100)}...</p>
                                <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                                    <span>{post.author.username}</span>
                                    <span>·</span>
                                    <span>{post.board_id}</span>
                                    {post.tags && post.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="text-indigo-500">#{tag}</span>
                                    ))}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
