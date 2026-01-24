import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Post, Board } from '../types';
import PostList from '../components/PostList';
import { PenTool, Search, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import SystemStatus from '../components/SystemStatus';

const BoardPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [boardInfo, setBoardInfo] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const boards = storage.getBoards();
    const currentBoard = boards.find(b => b.slug === boardId);
    setBoardInfo(currentBoard || null);

    // Real-time Firestore Sync
    const unsubscribe = storage.subscribePosts((allPosts) => {
      const filtered = boardId === 'all'
        ? allPosts
        : allPosts.filter(p => p.board_id === boardId);
      setPosts(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [boardId]);

  const handleWriteClick = () => {
    if (!user) {
      alert('로그인이 필요한 서비스입니다.');
      return;
    }
    navigate('/write');
  };

  if (!loading && boardInfo?.required_achievement) {
    const hasAchievement = user?.achievements.includes(boardInfo.required_achievement);
    if (!hasAchievement) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in space-y-6">
          <div className="text-red-500 opacity-80 animate-pulse">
            <Cpu size={100} />
          </div>
          <h2 className="text-3xl font-black text-white bg-red-600 px-6 py-2 rounded-sm tracking-widest uppercase">
            ACCESS DENIED
          </h2>
          <p className="text-gray-400 dark:text-gray-500 max-w-md mx-auto">
            이 노드({boardInfo.name})에 접근하기 위한 보안 등급이 부족합니다.<br />
            필요한 인증: <span className="text-red-400 font-bold font-mono">[{boardInfo.required_achievement}]</span>
          </p>
          <button onClick={() => navigate('/')} className="px-8 py-3 bg-gray-800 text-white font-bold rounded-sm border border-gray-700 hover:bg-gray-700 transition-all font-mono text-xs">
            RETURN TO ROOT
          </button>
        </div>
      )
    }
  }

  if (loading) return (
    <div className="p-20 text-center">
      <Cpu className="animate-spin inline-block text-cyan-500 mb-4" size={40} />
      <div className="text-cyan-600 font-ai text-xs tracking-widest">LOADING NEURAL NETWORK...</div>
    </div>
  );

  if (!boardInfo) return <div className="p-8 text-center text-red-500">게시판을 찾을 수 없습니다.</div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-4 p-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 rounded-2xl shadow-xl transition-all relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-2 relative z-10">
          {boardInfo.name}
          {boardId === 'stock' && <span className="text-[10px] bg-cyan-400 text-black px-2 py-0.5 rounded-full font-bold uppercase">LIVE AI</span>}
        </h1>
        <p className="text-sm text-indigo-100 dark:text-indigo-200 relative z-10">{boardInfo.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-mono text-gray-500 uppercase tracking-tighter">
              INDEXED: <span className="text-indigo-600 dark:text-cyan-400 font-bold">{posts.length}</span> NODES
            </div>
            {!boardInfo?.isAIOnly && (
              <button
                onClick={handleWriteClick}
                className="flex items-center gap-2 bg-indigo-600 dark:bg-cyan-600 text-white dark:text-black text-sm font-bold px-4 py-2 rounded-sm hover:opacity-80 transition-all shadow-lg"
              >
                <PenTool size={16} /> 신규 글 작성
              </button>
            )}
          </div>

          <div className="shadow-sm border border-gray-100 dark:border-cyan-900/20 rounded-sm overflow-hidden">
            <PostList posts={posts} boardSlug={boardId!} isAnonymous={boardId === 'deepweb'} />
          </div>

          <div className="mt-8 bg-gray-100 dark:bg-gray-800/50 p-4 rounded-sm flex justify-center border border-dashed border-gray-300 dark:border-gray-700">
            <div className="flex space-x-2 w-full max-w-md">
              <input
                type="text"
                placeholder="제목, 내용, 글쓴이 검색..."
                className="flex-grow border border-gray-300 dark:border-gray-600 p-2 text-sm rounded-sm focus:outline-none focus:border-cyan-500 dark:bg-gray-950 dark:text-cyan-400"
              />
              <button className="bg-gray-700 dark:bg-cyan-900 text-white dark:text-cyan-400 px-5 rounded-sm text-sm font-bold hover:bg-gray-600">
                SEARCH
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <SystemStatus />
          {/* Future widgets can go here */}
        </aside>
      </div>
    </div>
  );
};

export default BoardPage;
