import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Board, User, Notification, Post, WikiPage, ShopItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Menu, User as UserIcon, LogOut, PenTool, Moon, Sun,
  BookOpen, Cpu, Sparkles, Home, ShoppingBag, Gamepad2,
  ChevronRight, Bell, Zap, Lock, Search, BarChart2, RefreshCw, X, Code2
} from 'lucide-react';
import { storage } from '../services/storage';
import LiveChat from './LiveChat';
import VoiceNeuralLink from './VoiceNeuralLink';
import { UserNickname, UserAvatar } from './UserEffect';
import AdBanner from './AdBanner';

// 모바일 사이드바 컴포넌트
const MobileSidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  boards: Board[];
  user: User | null;
}> = ({ isOpen, onClose, boards, user }) => {
  const location = useLocation();
  const [isBoardOpen, setIsBoardOpen] = useState(false);
  if (!isOpen) return null;

  const quickAccessItems = [
    { path: '/', icon: <Home size={18} />, label: '홈' },
    { path: '/wiki', icon: <BookOpen size={18} />, label: '위키' },
  ];

  const toolItems = [
    { path: '/tools/encoder', icon: <Lock size={18} />, label: '변환기' },
    { path: '/tools/image-studio', icon: <PenTool size={18} />, label: '이미지 스튜디오' },
    { path: '/tools/ai-analysis', icon: <Zap size={18} />, label: 'AI 모델 분석기' },
    { path: '/tools/mock-invest', icon: <BarChart2 size={18} />, label: '모의투자' },
    { path: '/tools/vibe-code', icon: <Cpu size={18} />, label: '바이브 코딩' },
    { path: '/webdev', icon: <Code2 size={18} />, label: 'WEB DEV' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="w-[75%] max-w-[280px] h-full bg-[#0f1419] shadow-2xl overflow-y-auto animate-slide-in-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Quick Access Section */}
        <div className="p-4">
          <h3 className="text-[10px] font-black text-gray-500 mb-3 uppercase tracking-[0.2em]">Quick Access</h3>
          <nav className="space-y-0.5">
            {quickAccessItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={isActive ? 'text-cyan-400' : 'text-gray-500'}>{item.icon}</span>
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* 게시판 아코디언 */}
            <button
              onClick={() => setIsBoardOpen(!isBoardOpen)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${location.pathname.startsWith('/board') ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <span className="flex items-center gap-3">
                <Menu size={18} className={location.pathname.startsWith('/board') ? 'text-cyan-400' : 'text-gray-500'} />
                게시판
              </span>
              <ChevronRight size={14} className={`transition-transform ${isBoardOpen ? 'rotate-90' : ''}`} />
            </button>
            {isBoardOpen && (
              <div className="ml-4 space-y-0.5 border-l border-gray-700 pl-3">
                {boards.map(board => {
                  const isLocked = board.required_achievement && !user?.achievements.includes(board.required_achievement);
                  const isActive = location.pathname === `/board/${board.slug}`;
                  return (
                    <Link
                      key={board.id}
                      to={isLocked ? '#' : `/board/${board.slug}`}
                      onClick={(e) => {
                        if (isLocked) { e.preventDefault(); alert('접근 불가: 정보 요원 업적이 필요합니다.'); }
                        else onClose();
                      }}
                      className={`flex items-center gap-2 px-2 py-2 text-xs font-medium rounded-lg transition-all ${isLocked ? 'opacity-40 text-gray-600' : isActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      {isLocked && <Lock size={12} />}
                      <span>{board.emoji || '📝'}</span>
                      {board.name}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* 나머지 퀵 액세스 */}
            <Link to="/game" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${location.pathname === '/game' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <Gamepad2 size={18} className={location.pathname === '/game' ? 'text-cyan-400' : 'text-gray-500'} /> 게임
            </Link>
            <Link to="/persona" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${location.pathname === '/persona' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <Sparkles size={18} className={location.pathname === '/persona' ? 'text-cyan-400' : 'text-gray-500'} /> AI 친구
            </Link>
            <Link to="/shop" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${location.pathname === '/shop' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <ShoppingBag size={18} className={location.pathname === '/shop' ? 'text-cyan-400' : 'text-gray-500'} /> 상점
            </Link>
          </nav>
        </div>

        {/* Tools Section */}
        <div className="p-4 pt-0">
          <h3 className="text-[10px] font-black text-gray-500 mb-3 uppercase tracking-[0.2em]">Tools</h3>
          <nav className="space-y-0.5">
            {toolItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className={isActive ? 'text-cyan-400' : 'text-gray-500'}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            <Link to="/tools" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-all">
              <ChevronRight size={18} className="text-indigo-400" /> 전체 도구 보기
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
};

const NotificationDropdown: React.FC<{ userId: string, close: () => void }> = ({ userId, close }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsub = storage.subscribeNotifications(userId, setNotifications);
    return () => unsub();
  }, [userId]);

  const handleRead = async (id: string) => {
    await storage.markNotificationAsRead(id);
    close();
  };

  const handleReadAll = async () => {
    await storage.markAllNotificationsAsRead(userId);
  };

  return (
    <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-[150] overflow-hidden animate-fade-in">
      <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <span className="text-xs font-bold text-gray-900 dark:text-white">알림 센터</span>
        <button onClick={handleReadAll} className="text-[10px] text-indigo-500 hover:underline">모두 읽음</button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">새로운 알림이 없습니다.</div>
        ) : (
          notifications.map(notif => (
            <Link
              to={notif.link}
              key={notif.id}
              onClick={() => handleRead(notif.id)}
              className={`block p-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${notif.is_read ? 'opacity-60' : 'bg-indigo-50/30 dark:bg-indigo-900/10'}`}
            >
              <div className="flex gap-3">
                <div className="mt-1 min-w-[30px]">
                  {notif.type === 'comment' && <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">💬</div>}
                  {notif.type === 'message' && <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">✉️</div>}
                  {notif.type === 'achievement' && <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-xs">🏆</div>}
                  {notif.type === 'system' && <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs">🔔</div>}
                </div>
                <div>
                  <p className="text-xs text-gray-800 dark:text-gray-200 leading-snug">{notif.message}</p>
                  <span className="text-[10px] text-gray-400 block mt-1">{new Date(notif.created_at).toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

const UserSection: React.FC<any> = ({
  user, isLoading, logout, login, register, loginAsGuest, loginWithGoogle,
  isAiHubMode
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({ username: '', nickname: '', password: '', email: '', referralCode: '' });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [avatarOptions, setAvatarOptions] = useState<string[]>([]);

  // 아바타 옵션 생성
  useEffect(() => {
    if (isRegisterMode && avatarOptions.length === 0) {
      const seeds = Array.from({ length: 8 }, () => Date.now().toString() + Math.random().toString(36).slice(2));
      setAvatarOptions(seeds);
      setSelectedAvatar(seeds[0]);
    }
  }, [isRegisterMode, avatarOptions.length]);

  // 아바타 재생성
  const regenerateAvatars = () => {
    const seeds = Array.from({ length: 8 }, () => Date.now().toString() + Math.random().toString(36).slice(2));
    setAvatarOptions(seeds);
    setSelectedAvatar(seeds[0]);
  };

  const cardClass = isAiHubMode
    ? 'ai-hub-card text-cyan-50 backdrop-blur-md border-cyan-500/30'
    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegisterMode) {
      if (!formData.username || !formData.nickname || !formData.password) return alert('아이디, 닉네임, 비밀번호를 모두 입력해주세요.');
      const avatarUrl = selectedAvatar ? `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatar}` : '';
      const res = await register(formData.username, formData.nickname, formData.password, undefined, formData.referralCode, avatarUrl);
      if (res.success) {
        alert('회원가입이 완료되었습니다! 자동 로그인합니다.');
        window.location.reload();
      } else {
        alert(res.message);
      }
    } else {
      const res = login(formData.username, formData.password);
      if (!res.success) {
        alert(res.message);
      }
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse text-xs font-ai text-gray-400">SYNCING NEURAL DATA...</div>;

  return (
    <div className={`${cardClass} p-5 rounded-2xl shadow-xl transition-all`}>
      {user ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <UserAvatar profile={user as any} size="lg" />
            <div className="flex-1 overflow-hidden text-flexible-container">
              <div className="text-auto-resize">
                <UserNickname profile={user as any} className="text-lg" />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex-shrink-0">LV. {user.level}</span>
                <span className={`${isAiHubMode ? 'text-cyan-400' : 'text-indigo-500'} truncate`}>{user.points.toLocaleString()} CR</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                코드: <span className="font-mono select-all bg-gray-100 dark:bg-gray-900 px-1 rounded">{user.referral_code}</span>
                {user.invite_count > 0 && <span className="ml-2 text-indigo-400">({user.invite_count}명 초대)</span>}
              </div>
            </div>
          </div>

          {user.quests && (
            <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg text-xs space-y-1 border border-gray-100 dark:border-gray-700">
              <div className="font-bold text-[10px] text-gray-400 uppercase flex justify-between">
                <span>Daily Protocol</span>
                <span>{Math.round(((user.quests.daily_login ? 1 : 0) + (user.quests.post_count > 0 ? 1 : 0) + (user.quests.comment_count >= 3 ? 1 : 0)) / 3 * 100)}%</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <div className={`w-2 h-2 rounded-full ${user.quests.daily_login ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Login</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <div className={`w-2 h-2 rounded-full ${user.quests.comment_count >= 50 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Agent Training ({user.quests.comment_count}/50)</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Link to="/write" className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-transform active:scale-95 ${isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-indigo-600 text-white'}`}>
              <PenTool size={14} /> 글쓰기
            </Link>
            <button onClick={logout} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-700 dark:text-gray-300 active:scale-95">
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link to="/activity" className="block text-center py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">
              📊 내 활동
            </Link>
            <Link to="/messages" className="block text-center py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">
              ✉️ 메시지
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
            <button
              onClick={() => setIsRegisterMode(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isRegisterMode ? 'bg-white dark:bg-gray-800 shadow-sm dark:text-white' : 'text-gray-500'}`}
            >
              로그인
            </button>
            <button
              onClick={() => setIsRegisterMode(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isRegisterMode ? 'bg-white dark:bg-gray-800 shadow-sm dark:text-white' : 'text-gray-500'}`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-2">
            <input
              type="text"
              placeholder="사용자 아이디 (로그인용)"
              className={`w-full p-3 rounded-xl text-sm outline-none border transition-all ${isAiHubMode ? 'bg-black/50 border-cyan-900 text-cyan-400 focus:border-cyan-400' : 'bg-gray-50 dark:bg-gray-700 dark:text-white focus:border-indigo-500'}`}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            {isRegisterMode && (
              <input
                type="text"
                placeholder="닉네임 (다른 사람에게 보여질 이름)"
                className={`w-full p-3 rounded-xl text-sm outline-none border transition-all ${isAiHubMode ? 'bg-black/50 border-cyan-900 text-cyan-400 focus:border-cyan-400' : 'bg-gray-50 dark:bg-gray-700 dark:text-white focus:border-indigo-500'}`}
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                required
              />
            )}
            <input
              type="password"
              placeholder="비밀번호"
              className={`w-full p-3 rounded-xl text-sm outline-none border transition-all ${isAiHubMode ? 'bg-black/50 border-cyan-900 text-cyan-400 focus:border-cyan-400' : 'bg-gray-50 dark:bg-gray-700 dark:text-white focus:border-indigo-500'}`}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            {isRegisterMode && (
              <input
                type="text"
                placeholder="추천인 코드 (선택)"
                className={`w-full p-3 rounded-xl text-sm outline-none border transition-all ${isAiHubMode ? 'bg-black/50 border-cyan-900 text-cyan-400 focus:border-cyan-400' : 'bg-gray-50 dark:bg-gray-700 dark:text-white focus:border-indigo-500'}`}
                value={formData.referralCode}
                onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
              />
            )}
            {isRegisterMode && avatarOptions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">아바타 선택</span>
                  <button type="button" onClick={regenerateAvatars} className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
                    <RefreshCw size={12} /> 다시 뽑기
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {avatarOptions.map((seed) => (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => setSelectedAvatar(seed)}
                      className={`p-1 rounded-lg border-2 transition-all ${selectedAvatar === seed ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                    >
                      <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`} alt="Avatar" className="w-full aspect-square rounded" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button type="submit" className={`w-full py-3 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-indigo-600 text-white'}`}>
              {isRegisterMode ? '가입 시작하기' : '보안 접속'}
            </button>
          </form>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <button
              onClick={async () => {
                setIsGoogleLoading(true);
                const res = await loginWithGoogle();
                setIsGoogleLoading(false);
                if (res.success) window.location.reload();
                else if (res.message !== '로그인이 취소되었습니다.') alert(res.message);
              }}
              disabled={isGoogleLoading}
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isGoogleLoading ? '연결 중...' : 'Google로 계속하기'}
            </button>
            <button
              onClick={async () => {
                await loginAsGuest();
                window.location.reload();
              }}
              className="w-full text-xs text-gray-400 hover:text-indigo-500 underline"
            >
              로그인 없이 익명 요원으로 접속 (Guest)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SearchModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<{ posts: Post[], wiki: WikiPage[], shop: ShopItem[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setKeyword('');
      setResults(null);
      return;
    }
  }, [isOpen]);

  const handleSearch = async (val: string) => {
    setKeyword(val);
    if (val.trim().length < 2) {
      setResults(null);
      return;
    }
    setIsSearching(true);
    const res = await storage.integratedSearch(val);
    setResults(res);
    setIsSearching(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-start justify-center p-4 sm:p-20 overflow-y-auto animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-zoom-in" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <Search className="text-gray-400" size={20} />
          <input
            autoFocus
            type="text"
            placeholder="검색어를 입력하세요 (게시판, 위키, 상점 통합)"
            className="flex-1 bg-transparent outline-none text-lg text-gray-900 dark:text-gray-100 font-medium"
            value={keyword}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {isSearching && (
            <div className="py-20 text-center animate-pulse text-gray-400 text-sm font-bold uppercase tracking-widest">
              Searching Nexus...
            </div>
          )}

          {!isSearching && results && (
            <>
              {results.posts.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Board Results ({results.posts.length})</h4>
                  <div className="space-y-1">
                    {results.posts.map(post => (
                      <Link key={post.id} to={`/post/${post.id}`} onClick={onClose} className="block p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group transition-all">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">{post.title}</p>
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{post.content}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results.wiki.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Wiki Results ({results.wiki.length})</h4>
                  <div className="space-y-1">
                    {results.wiki.map(wiki => (
                      <Link key={wiki.slug} to={`/wiki/${wiki.slug}`} onClick={onClose} className="block p-3 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-900/20 group transition-all">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 line-clamp-1">{wiki.title}</p>
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{wiki.content}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results.shop.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Shop Results ({results.shop.length})</h4>
                  <div className="space-y-1">
                    {results.shop.map(item => (
                      <Link key={item.id} to="/shop" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-900/20 group transition-all">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-pink-600 dark:group-hover:text-pink-400">{item.name}</p>
                          <p className="text-[10px] text-gray-400">{item.description}</p>
                        </div>
                        <span className="ml-auto text-[10px] font-bold text-pink-500">{item.price} CR</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results.posts.length === 0 && results.wiki.length === 0 && results.shop.length === 0 && (
                <div className="py-20 text-center text-gray-400 text-sm">
                  검색 결과가 없습니다.
                </div>
              )}
            </>
          )}

          {!isSearching && !results && keyword.length < 2 && (
            <div className="py-10 text-center">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">Trending Tags</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['#AI', '#GPT-4o', '#넥서스', '#위키', '#모의투자', '#나침반'].map(tag => (
                  <button key={tag} onClick={() => handleSearch(tag.replace('#', ''))} className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 hover:bg-indigo-600 hover:text-white transition-all">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Layout: React.FC = () => {
  const { user, login, register, loginAsGuest, loginWithGoogle, logout, isLoading } = useAuth();
  const { isDarkMode, isAiHubMode, toggleTheme, toggleAiHubMode } = useTheme();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isMobileUserOpen, setIsMobileUserOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBoardExpanded, setIsBoardExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [megaphone, setMegaphone] = useState<{ text: string; author: string } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setBoards(storage.getBoards());
  }, []);

  useEffect(() => {
    const unsub = storage.subscribeMegaphone(setMegaphone);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = storage.subscribeNotifications(user.id, (notifs) => {
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    setIsMobileUserOpen(false);
    setIsMobileMenuOpen(false);
    setIsNotifOpen(false);
  }, [location]);

  const navItems = [
    { label: '홈', icon: <Home size={22} />, path: '/' },
    { label: '게시판', icon: <Menu size={22} />, path: '/board/free' },
    { label: '게임', icon: <Gamepad2 size={22} />, path: '/game' },
    { label: '위키', icon: <BookOpen size={22} />, path: '/wiki' },
    { label: '내 정보', icon: <UserIcon size={22} />, path: isMobileUserOpen ? '#' : null, onClick: () => setIsMobileUserOpen(true) },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-500 flex ${isDarkMode ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
      {isAiHubMode && <div className="fixed inset-0 pointer-events-none scan-line z-[100] opacity-5"></div>}

      {/* PC Left Sidebar Navigation - Fixed */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 transition-all">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
          <Link to="/" className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isAiHubMode ? 'bg-cyan-500' : 'bg-indigo-600'}`}>
              <Cpu className="text-white" size={20} />
            </div>
            <span className={`text-lg font-black tracking-tighter ${isAiHubMode ? 'font-ai text-cyan-400' : 'text-gray-900 dark:text-white'}`}>
              AI-HUB <span className="text-xs font-normal opacity-50 ml-1">PRO</span>
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <UserSection
            user={user} isLoading={isLoading} logout={logout} login={login} register={register} loginAsGuest={loginAsGuest} loginWithGoogle={loginWithGoogle}
            isAiHubMode={isAiHubMode}
          />

          <div>
            <h3 className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em] px-2">Quick Access</h3>
            <nav className="space-y-1">
              <Link to="/" className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === '/' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <Home size={18} /> 홈
              </Link>
              <Link to="/wiki" className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname.startsWith('/wiki') ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <BookOpen size={18} /> 위키
              </Link>
              {/* 게시판 아코디언 */}
              <div>
                <button
                  onClick={() => setIsBoardExpanded(!isBoardExpanded)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname.startsWith('/board') ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <span className="flex items-center gap-3"><Menu size={18} /> 게시판</span>
                  <ChevronRight size={16} className={`transition-transform ${isBoardExpanded ? 'rotate-90' : ''}`} />
                </button>
                {isBoardExpanded && (
                  <nav className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                    {boards.map(board => (
                      <Link key={board.id} to={`/board/${board.id}`} className={`flex items-center gap-2 px-2 py-1.5 text-xs font-medium rounded-md transition-all hover-slide ${location.pathname === `/board/${board.id}` ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        <span className="flex-shrink-0">{board.emoji || '📝'}</span>
                        <span className="truncate">{board.name}</span>
                      </Link>
                    ))}
                  </nav>
                )}
              </div>
              <Link to="/game" className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === '/game' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <Gamepad2 size={18} /> 게임
              </Link>
              <Link to="/persona" className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === '/persona' ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <Sparkles size={18} /> AI 친구
              </Link>
              <Link to="/shop" className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname.startsWith('/shop') ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <ShoppingBag size={18} /> 상점
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em] px-2">Tools</h3>
            <nav className="space-y-1">
              <Link to="/tools/encoder" className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === '/tools/encoder' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <Lock size={18} /> 변환기
              </Link>
              <Link to="/tools/image-studio" className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === '/tools/image-studio' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <PenTool size={18} /> 이미지 스튜디오
              </Link>
              <Link to="/tools/ai-analysis" className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === '/tools/ai-analysis' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <Zap size={18} /> AI 모델 분석기
              </Link>
              <Link to="/tools/mock-invest" className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === '/tools/mock-invest' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <BarChart2 size={18} /> 모의투자
              </Link>
              <Link to="/tools/vibe-code" className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === '/tools/vibe-code' ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <Cpu size={18} /> 바이브 코딩
              </Link>
              <Link to="/webdev" className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === '/webdev' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <Code2 size={18} /> WEB DEV
              </Link>
              <Link to="/tools" className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all ${location.pathname === '/tools' && !location.search ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-indigo-500 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <ChevronRight size={18} /> 전체 도구 보기
              </Link>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 text-center">
          AI-HUB PRO v0.9.5 Beta
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-500">
              <Menu size={24} />
            </button>
            {/* 모바일 로고 */}
            <Link to="/" className="md:hidden flex items-center gap-2 whitespace-nowrap">
              <div className={`p-1.5 rounded-lg flex-shrink-0 ${isAiHubMode ? 'bg-cyan-500' : 'bg-indigo-600'}`}>
                <Cpu className="text-white" size={16} />
              </div>
              <span className={`text-sm font-black tracking-tight ${isAiHubMode ? 'text-cyan-400' : 'text-gray-900 dark:text-white'}`}>
                AI-HUB
              </span>
            </Link>
            <h1 className="text-lg font-bold dark:text-white hidden md:block">
              {location.pathname === '/' ? '대시보드' :
                location.pathname.startsWith('/board') ? '커뮤니티' :
                  location.pathname.startsWith('/wiki') ? '위키 지식베이스' :
                    location.pathname.startsWith('/tools') ?
                      (() => {
                        const params = new URLSearchParams(location.search);
                        const category = params.get('cat');
                        switch (category) {
                          case 'anonymous': return '익명 도구';
                          case 'crypto': return '암호화 도구';
                          case 'image': return '이미지 도구';
                          case 'dev': return '개발 도구';
                          case 'ai': return 'AI 도구';
                          default: return '도구 대시보드';
                        }
                      })() :
                      'AI-HUB'}
            </h1>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* CR 표시 제거 (UI 깨짐 방지) */}

            <button onClick={() => setIsSearchOpen(true)} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Search size={20} />
            </button>
            <button onClick={toggleAiHubMode} className={`p-2 rounded-full transition-all ${isAiHubMode ? 'text-cyan-400 bg-cyan-400/10' : 'text-gray-400 hover:bg-gray-100'}`}>
              <Sparkles size={20} />
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 text-gray-400 hover:text-indigo-600 relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
            {isNotifOpen && user && <NotificationDropdown userId={user.id} close={() => setIsNotifOpen(false)} />}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-x-hidden">
          {megaphone && (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-amber-400/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="bg-amber-500 text-white p-2 rounded-lg relative z-10"><Zap size={16} className="animate-pulse" /></div>
              <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block">Global Announcement</span>
                  <span className="text-[9px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200 px-1 rounded font-bold">BY {megaphone.author}</span>
                </div>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{megaphone.text}</p>
              </div>
              <button
                onClick={() => navigate('/shop')}
                className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 relative z-10 transition-transform hover:scale-110"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <Outlet />

          {/* 콘텐츠 하단 푸터 광고 */}
          <div className="mt-8 mb-4">
            <AdBanner slot="footer" />
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 h-16 flex items-center justify-around z-[140] px-2 pb-safe">
        {navItems.map((item, idx) => {
          const isActive = location.pathname === item.path || (item.path && location.pathname.startsWith(item.path) && item.path !== '/');
          return (
            <button
              key={idx}
              onClick={() => item.onClick ? item.onClick() : navigate(item.path!)}
              className={`flex flex-col items-center justify-center w-14 transition-all active:scale-90 ${isActive ? (isAiHubMode ? 'text-cyan-400' : 'text-indigo-600') : 'text-gray-400'}`}
            >
              {item.icon}
              <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {isMobileUserOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setIsMobileUserOpen(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-4 shadow-2xl transform transition-transform duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-white">사용자 메뉴</h3>
              <button onClick={() => setIsMobileUserOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <ChevronRight className="rotate-90" />
              </button>
            </div>
            <UserSection
              user={user} isLoading={isLoading} logout={logout} login={login} register={register} loginAsGuest={loginAsGuest} loginWithGoogle={loginWithGoogle}
              isAiHubMode={isAiHubMode}
            />
          </div>
        </div>
      )}

      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        boards={boards}
        user={user}
      />

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <LiveChat />
      <VoiceNeuralLink />
    </div>
  );
};

export default Layout;
