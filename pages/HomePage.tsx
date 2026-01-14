
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
import LeaderboardWidget from '../components/LeaderboardWidget';
import LuckyDrawWidget from '../components/LuckyDrawWidget';

const HomePage: React.FC = () => {
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [balance, setBalance] = useState<BalanceGame | null>(null);
  const [previousBalance, setPreviousBalance] = useState<BalanceGame | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { isAiHubMode } = useTheme();
  const { user } = useAuth();

  const slides = [
    {
      title: "🤖 AI 친구가 왔어요!\n나만의 AI 친구와 대화하세요",
      subtitle: "New Feature • Groq Qwen3-32B",
      image: "/ai_friend_banner.png",
      badge: "🔥 NEW",
      link: "/persona",
      btnText: "AI 친구 만나기"
    },
    {
      title: "✨ 바이브 코딩으로\n나만의 웹사이트 만들기",
      subtitle: "AI Code Generator • Beta",
      image: "/vibe_code_banner.png",
      badge: "BETA",
      link: "/webdev",
      btnText: "WEB DEV 갤러리"
    },
    {
      title: "차세대 지식 공유 노드\nAI-HUB에 접속 중입니다",
      subtitle: "Neural Core Active",
      image: "/ai_hub_hero_banner_1767869792651.png",
      badge: "SYSTEM ONLINE",
      link: "/board/free",
      btnText: "메인 광장 입장"
    },
    {
      title: "지식의 한계를 넘어서는\nNEXUS WIKI v2.0",
      subtitle: "Knowledge Synthesis",
      image: "/nexus_wiki_v2_banner.png",
      badge: "NEW UPDATE",
      link: "/wiki",
      btnText: "위키 지식베이스"
    },
    {
      title: "활동 포인트를 모아\n유니크 레어 템을 획득하세요",
      subtitle: "Credit Economy",
      image: "/ai_hub_shop_banner.png",
      badge: "AWARD SYSTEM",
      link: "/shop",
      btnText: "아이템 마켓"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

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
      {/* Hero Slider Section (Phase 2.4) */}
      <div className="relative overflow-hidden rounded-3xl h-[280px] md:h-[350px] shadow-2xl border border-white/10 group">
        {slides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              }`}
            style={{
              backgroundImage: `url('${slide.image}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
            <div className="relative z-10 p-6 md:p-12 h-full flex flex-col justify-center">
              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-white/20 backdrop-blur-md text-white'
                }`}>
                <Zap size={10} fill="currentColor" /> {slide.badge}
              </div>
              <h1 className="text-2xl md:text-5xl font-black mb-4 leading-tight tracking-tighter text-white whitespace-pre-line">
                {slide.title}
              </h1>
              <p className="text-gray-300 text-sm font-medium mb-8 opacity-80">{slide.subtitle}</p>
              <div className="flex flex-wrap gap-2">
                <Link to={slide.link} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all active:scale-95 shadow-xl ${isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-white text-indigo-700 hover:bg-indigo-50'
                  }`}>
                  {slide.btnText}
                </Link>
                <Link to="/tools" className="bg-black/40 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl text-xs font-black text-white hover:bg-black/50 transition-all active:scale-95">
                  SYSTEM TOOLS
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Slider Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1 rounded-full transition-all ${idx === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/30'
                }`}
            />
          ))}
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
          {/* Daily Features (Phase 2.2, 2.3) */}
          <LuckyDrawWidget />
          <LeaderboardWidget />

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
