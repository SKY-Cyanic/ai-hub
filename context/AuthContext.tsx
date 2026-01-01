
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { storage } from '../services/storage';

interface AuthContextType {
  user: User | null;
  login: (username: string, password?: string) => { success: boolean, message: string, requires2FA?: boolean };
  verify2FA: (code: string) => boolean;
  register: (username: string, password: string, secondPassword?: string, referralCode?: string) => Promise<{ success: boolean, message: string }>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tempAdminUser, setTempAdminUser] = useState<User | null>(null);

  const refreshUser = () => {
    const sessionUser = storage.getSession();
    if (sessionUser) {
      const latestUser = storage.getUser(sessionUser.username);
      if (!latestUser) {
        logout();
        return;
      }
      setUser(latestUser);
      localStorage.setItem('ai_hub_session_v4', JSON.stringify(latestUser));
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser();
    setIsLoading(false);
    const handleSync = (event: MessageEvent) => {
      if (event.data.type === 'SESSION_UPDATE' || event.data.type === 'USER_UPDATE') {
        refreshUser();
      }
    };
    storage.channel.onmessage = handleSync;
    return () => { storage.channel.onmessage = null; };
  }, []);

  const login = (username: string, password?: string) => {
    const targetUser = storage.getUser(username);
    if (!targetUser) return { success: false, message: '존재하지 않는 사용자입니다.' };
    if (targetUser.password && targetUser.password !== password) return { success: false, message: '비밀번호 불일치' };

    if (targetUser.is_admin) {
      setTempAdminUser(targetUser);
      return { success: true, message: '2차 인증 필요', requires2FA: true };
    }

    // Process Attendance
    storage.processAttendance(targetUser.id);

    setUser(targetUser);
    storage.setSession(targetUser);
    return { success: true, message: '로그인 성공' };
  };

  const verify2FA = (code: string) => {
    if (tempAdminUser && tempAdminUser.second_password === code) {
      setUser(tempAdminUser);
      storage.setSession(tempAdminUser);
      storage.processAttendance(tempAdminUser.id);
      setTempAdminUser(null);
      return true;
    }
    return false;
  };

  const register = async (username: string, password: string, secondPassword?: string, referralCode?: string) => {
    const existing = storage.getUser(username);
    if (existing) return { success: false, message: '아이디 중복' };

    const isAdmin = username.toLowerCase() === 'admin';

    // Referral Logic
    let points = 500;
    let invitedBy = undefined;

    if (referralCode) {
      const inviter = storage.getUserByReferralCode(referralCode);
      if (inviter) {
        invitedBy = inviter.id;
        points += 100; // Inviteee Bonus

        // Inviter Bonus
        inviter.points += 300;
        inviter.invite_count = (inviter.invite_count || 0) + 1;
        if (inviter.invite_count === 3) inviter.points += 500;
        if (inviter.invite_count === 10) inviter.points += 2000;

        await storage.saveUser(inviter);
        await storage.sendNotification({
          user_id: inviter.id,
          type: 'system',
          message: `누군가 당신의 코드로 가입했습니다! (+300P)`,
          link: '/mypage'
        });
      }
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      username: username, password,
      second_password: isAdmin ? secondPassword : undefined,
      is_admin: isAdmin,
      level: isAdmin ? 9999 : 1,
      email: `${username}@aihub.io`, avatar_url: '',
      exp: 0,
      points: isAdmin ? 999999999 : points,
      inventory: [],
      active_items: isAdmin ? { name_color: '#FF0000', name_style: 'bold', badge: '👑' } : { theme: 'standard' },
      blocked_users: [], scrapped_posts: [], achievements: [], attendance_streak: 1,
      last_attendance_date: new Date().toISOString().split('T')[0],
      quests: { last_updated: new Date().toISOString().split('T')[0], daily_login: true, post_count: 0, comment_count: 0, balance_voted: false },
      referral_code: storage.generateReferralCode(),
      invited_by: invitedBy,
      invite_count: 0,
      transactions: []
    };

    await storage.saveUser(newUser);
    setUser(newUser);
    storage.setSession(newUser);
    return { success: true, message: '환영합니다!' };
  };

  const logout = () => { setUser(null); storage.setSession(null); setTempAdminUser(null); };

  return (
    <AuthContext.Provider value={{ user, login, verify2FA, register, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth error');
  return context;
};
