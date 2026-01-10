
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { Post, BalanceGame } from '../types';
import PostList from '../components/PostList';
import { Flame, ChevronRight, TrendingUp, Sparkles, Cpu, Vote, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import TrendingWidget from '../components/TrendingWidget';

const HomePage: React.FC = () => {
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [balance, setBalance] = useState<BalanceGame | null>(null);
  const [previousBalance, setPreviousBalance] = useState<BalanceGame | null>(null);
  const { isAiHubMode } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    api.getPosts(undefined, 1).then(posts => {
      setHotPosts(posts.filter(p => p.is_hot).slice(0, 10));
      setNewPosts(posts.slice(0, 15));
    });
    setBalance(storage.getBalanceGame());
    setPreviousBalance(storage.getPreviousBalanceGame());
  }, []);

  const handleBalanceVote = async (opt: 'a' | 'b') => {
    if (!user) return alert('로그인이 필요합니다.');
    const success = await storage.voteBalance(user.id, opt);
    if (success) {
      alert('투표 완료! 5포인트와 10경험치를 획득했습니다.');
      setBalance(storage.getBalanceGame());
    } else {
      alert('이미 참여하셨습니다.');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Hero Section */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 md:p-10 text-white shadow-2xl transition-all duration-700 border border-white/10"
        style={{
          backgroundImage: `url('/ai_hub_hero_banner_1767869792651.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent"></div>
        <div className="relative z-10">
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 ${isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-white/20 backdrop-blur-md'
            }`}>
            <Zap size={10} fill="currentColor" /> Neural Core Active
          </div>
          <h1 className="text-2xl md:text-4xl font-black mb-3 leading-tight tracking-tight">
            차세대 지식 공유 노드<br />
            AI-HUB에 접속 중입니다
          </h1>
          <div className="flex flex-wrap gap-2 mt-6">
            <Link to="/board/free" className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg ${isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-white text-indigo-700 hover:bg-indigo-50'
              }`}>
              메인 광장 입장
            </Link>
            <Link to="/shop" className="bg-black/20 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-black/30 transition-all active:scale-95">
              아이템 마켓
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm font-black flex items-center gap-1.5 dark:text-white uppercase tracking-wider">
                <Flame className="text-orange-500" size={16} fill="currentColor" />
                실시간 핫이슈
              </h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <PostList posts={hotPosts} boardSlug="best" />
            </div>
          </section>

          {/* 전체 노드 타임라인 - Moved here right after hot issues */}
          <section className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm font-black flex items-center gap-1.5 dark:text-white uppercase tracking-wider">
                <TrendingUp className="text-green-500" size={16} />
                전체 노드 타임라인
              </h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <PostList posts={newPosts} boardSlug="all" />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {/* Attendance Tracking (Top Priority) */}
          {user && (
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-gray-900 dark:to-black p-5 rounded-3xl text-white shadow-xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 dark:bg-orange-500/20 rounded-2xl flex items-center justify-center">
                  <Flame size={20} className="text-yellow-300 dark:text-orange-500" fill="currentColor" />
                </div>
                <div>
                  <div className="text-[10px] text-indigo-100 dark:text-gray-500 uppercase font-black">Current Streak</div>
                  <div className="text-xl font-black">{user.attendance_streak} DAYS</div>
                </div>
              </div>
            </div>
          )}

          {/* System Status / Notice */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-indigo-600 dark:text-cyan-400 uppercase flex items-center gap-2">
                <Sparkles size={14} /> System Status
              </h3>
              <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">Running</span>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <h4 className="font-bold text-xs dark:text-white mb-1">📢 v1.5 BETA 업데이트</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  - 게스트 로그인 (보안 접속없이 댓글 가능)<br />
                  - 메시지 UI 리뉴얼 완료<br />
                  - 일일 출석 리셋 문제 해결
                </p>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <h4 className="font-bold text-xs text-indigo-700 dark:text-indigo-300 mb-1">🎁 일일 무료 지원금</h4>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 leading-relaxed">
                  상점에서 매일 연구 자금을 지원받으세요!
                </p>
              </div>
            </div>
          </div>

          {/* Balance Game Widget */}
          {balance && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-indigo-600 dark:text-cyan-400 uppercase flex items-center gap-2">
                  <Vote size={14} /> Daily Protocol
                </h3>
                {user?.quests.balance_voted && <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">COMPLETED</span>}
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-white mb-4 leading-tight">{balance.question}</p>
              <div className="space-y-2">
                <button
                  onClick={() => handleBalanceVote('a')}
                  className="w-full py-3 rounded-2xl bg-indigo-50 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-gray-600 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-all border border-indigo-100 dark:border-gray-600"
                >
                  {balance.option_a}
                </button>
                <div className="text-center text-[10px] text-gray-400 font-black">VS</div>
                <button
                  onClick={() => handleBalanceVote('b')}
                  className="w-full py-3 rounded-2xl bg-purple-50 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-gray-600 text-xs font-bold text-purple-700 dark:text-purple-300 transition-all border border-purple-100 dark:border-gray-600"
                >
                  {balance.option_b}
                </button>
              </div>
              <p className="text-[9px] text-gray-400 text-center mt-3 uppercase tracking-tighter">참여 시 5P 지급 (1일 1회)</p>

              {/* Yesterday's Results */}
              {previousBalance && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-[10px] text-gray-400 uppercase font-black mb-2">어제의 결과</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 font-medium">{previousBalance.question}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-full h-3 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${previousBalance.votes_a}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 w-8">{previousBalance.votes_a}%</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{previousBalance.option_a}</span>
                      <span>{previousBalance.option_b}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-purple-100 dark:bg-purple-900/30 rounded-full h-3 overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${previousBalance.votes_b}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 w-8">{previousBalance.votes_b}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trending Widget */}
          <TrendingWidget />

          {/* Attendance Tracking (Quick View) */}

        </aside>
      </div>
    </div>
  );
};

export default HomePage;
