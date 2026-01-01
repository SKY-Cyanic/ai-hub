
import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Board, User, Notification } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Menu, User as UserIcon, LogOut, PenTool, Moon, Sun,
  BookOpen, Cpu, Sparkles, Home, ShoppingBag,
  ChevronRight, Bell, Zap, Lock
} from 'lucide-react';
import { storage } from '../services/storage';
import LiveChat from './LiveChat';
import VoiceNeuralLink from './VoiceNeuralLink';
import BalanceGameWidget from './BalanceGameWidget';

const NotificationDropdown: React.FC<{ userId: string, close: () => void }> = ({ userId, close }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsub = storage.subscribeNotifications(userId, setNotifications);
    return () => unsub();
  }, [userId]);

  const handleRead = async (id: string, link: string) => {
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
              onClick={() => handleRead(notif.id, notif.link)}
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
  user, isLoading, logout, login, register,
  isAiHubMode
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', email: '', referralCode: '' });

  const cardClass = isAiHubMode
    ? 'ai-hub-card text-cyan-50 backdrop-blur-md border-cyan-500/30'
    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegisterMode) {
      const res = await register(formData.username, formData.password, undefined, formData.referralCode);
      if (!res.success) alert(res.message);
    } else {
      const res = login(formData.username, formData.password);
      if (!res.success) alert(res.message);
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse text-xs font-ai text-gray-400">SYNCING NEURAL DATA...</div>;

  return (
    <div className={`${cardClass} p-5 rounded-2xl shadow-xl transition-all`}>
      {user ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-inner ${isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-indigo-600 text-white'}`}>
              {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full rounded-2xl object-cover" /> : user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="font-black text-lg truncate dark:text-white flex items-center gap-1" style={{ color: user.active_items?.name_color }}>
                {user.active_items?.badge} {user.username}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">LV. {user.level}</span>
                <span className={`${isAiHubMode ? 'text-cyan-400' : 'text-indigo-500'}`}>{user.points.toLocaleString()} P</span>
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
          <Link to="/messages" className="block text-center text-xs py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-500 hover:bg-gray-100">
            1:1 메시지함
          </Link>
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
              placeholder="사용자 아이디"
              className={`w-full p-3 rounded-xl text-sm outline-none border transition-all ${isAiHubMode ? 'bg-black/50 border-cyan-900 text-cyan-400 focus:border-cyan-400' : 'bg-gray-50 dark:bg-gray-700 dark:text-white focus:border-indigo-500'}`}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
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
            <button type="submit" className={`w-full py-3 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${isAiHubMode ? 'bg-cyan-500 text-black' : 'bg-indigo-600 text-white'}`}>
              {isRegisterMode ? '가입 시작하기' : '보안 접속'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

const Layout: React.FC = () => {
  const { user, login, register, logout, isLoading } = useAuth();
  const { isDarkMode, isAiHubMode, toggleTheme, toggleAiHubMode } = useTheme();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isMobileUserOpen, setIsMobileUserOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setBoards(storage.getBoards());
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
    setIsNotifOpen(false);
  }, [location]);

  const navItems = [
    { label: '홈', icon: <Home size={22} />, path: '/' },
    { label: '게시판', icon: <Menu size={22} />, path: '/board/free' },
    { label: '위키', icon: <BookOpen size={22} />, path: '/wiki' },
    { label: '상점', icon: <ShoppingBag size={22} />, path: '/shop' },
    { label: '내 정보', icon: <UserIcon size={22} />, path: isMobileUserOpen ? '#' : null, onClick: () => setIsMobileUserOpen(true) },
  ];

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-500 ${isDarkMode ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
      {isAiHubMode && <div className="fixed inset-0 pointer-events-none scan-line z-[100] opacity-5"></div>}

      <header className="sticky top-0 z-[110] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isAiHubMode ? 'bg-cyan-500' : 'bg-indigo-600'}`}>
              <Cpu className="text-white" size={20} />
            </div>
            <span className={`text-lg font-black tracking-tighter ${isAiHubMode ? 'font-ai text-cyan-400' : 'text-gray-900 dark:text-white'}`}>
              AI-HUB <span className="text-xs font-normal opacity-50 ml-1">PRO</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 relative">
            <button onClick={toggleAiHubMode} title="AI Hub Mode" className={`p-2 rounded-full transition-all ${isAiHubMode ? 'text-cyan-400 bg-cyan-400/10' : 'text-gray-400 hover:bg-gray-100'}`}>
              <Sparkles size={18} />
            </button>
            <button onClick={toggleTheme} title="Toggle Theme" className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 text-gray-400 hover:text-indigo-600 relative"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
            {isNotifOpen && user && <NotificationDropdown userId={user.id} close={() => setIsNotifOpen(false)} />}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-4 gap-6">
        <aside className="hidden md:block space-y-4">
          <UserSection
            user={user} isLoading={isLoading} logout={logout} login={login} register={register}
            isAiHubMode={isAiHubMode}
          />
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
            <h3 className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[0.2em]">Quick Access</h3>
            <nav className="space-y-1">
              {boards.map(b => {
                const isLocked = b.required_achievement && !user?.achievements.includes(b.required_achievement);
                return (
                  <Link
                    key={b.id}
                    to={isLocked ? '#' : `/board/${b.slug}`}
                    className={`flex items-center justify-between p-2 text-sm font-bold rounded-lg group transition-all ${isLocked ? 'opacity-40 cursor-not-allowed text-gray-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    onClick={(e) => { if (isLocked) { e.preventDefault(); alert('접근 불가: 정보 요원 업적이 필요합니다.'); } }}
                  >
                    <span className="flex items-center gap-2">
                      {isLocked ? <Lock size={12} /> : null}
                      {b.name}
                    </span>
                    {!isLocked && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />}
                  </Link>
                )
              })}
            </nav>
          </div>
          <BalanceGameWidget />
        </aside>

        <div className="md:col-span-3">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 h-16 flex items-center justify-around z-[140] px-2 pb-safe">
        {navItems.map((item, idx) => (
          <button
            key={idx}
            onClick={() => item.onClick ? item.onClick() : navigate(item.path!)}
            className={`flex flex-col items-center justify-center w-14 transition-all active:scale-90 ${location.pathname === item.path ? (isAiHubMode ? 'text-cyan-400' : 'text-indigo-600') : 'text-gray-400'
              }`}
          >
            {item.icon}
            <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Mobile User Modal Fix */}
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
              user={user} isLoading={isLoading} logout={logout} login={login} register={register}
              isAiHubMode={isAiHubMode}
            />
          </div>
        </div>
      )}

      <LiveChat />
      <VoiceNeuralLink />
    </div>
  );
};

export default Layout;
