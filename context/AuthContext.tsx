import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { storage } from '../services/storage';
import { auth } from '../services/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
    user: User | null;
    login: (username: string, password?: string) => { success: boolean, message: string, requires2FA?: boolean };
    verify2FA: (code: string) => boolean;
    register: (username: string, nickname: string, password: string, secondPassword?: string, referralCode?: string, avatarUrl?: string) => Promise<{ success: boolean, message: string }>;
    loginAsGuest: () => void;
    loginWithGoogle: () => Promise<{ success: boolean, message: string }>;
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
            // Firestore에서 최신 데이터 가져오기 (효율성: 캐시 먼저 확인)
            const cachedUser = storage.getUserByRawId(sessionUser.id);
            if (cachedUser) {
                setUser(cachedUser);
                storage.setSession(cachedUser);
            } else {
                // 캐시에 없으면 세션 데이터 사용
                setUser(sessionUser);
            }
        } else {
            setUser(null);
        }
    };

    useEffect(() => {
        refreshUser();
        setIsLoading(false);

        // 게스트 계정 자동 만료 체크
        const sessionUser = storage.getSession();
        if (sessionUser?.is_guest && sessionUser?.guest_expires_at) {
            if (Date.now() > sessionUser.guest_expires_at) {
                storage.deleteUser(sessionUser.id);
                storage.setSession(null);
                setUser(null);
            } else {
                const remainingTime = sessionUser.guest_expires_at - Date.now();
                const timer = setTimeout(() => {
                    storage.deleteUser(sessionUser.id);
                    storage.setSession(null);
                    setUser(null);
                }, remainingTime);
                return () => clearTimeout(timer);
            }
        }

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

        if (targetUser.is_admin && targetUser.second_password) {
            setTempAdminUser(targetUser);
            return { success: false, message: '2차 인증이 필요합니다.', requires2FA: true };
        }

        setUser(targetUser);
        storage.setSession(targetUser);
        storage.processAttendance(targetUser.id);
        return { success: true, message: '로그인 성공' };
    };

    const verify2FA = (code: string) => {
        if (tempAdminUser && code === tempAdminUser.second_password) {
            setUser(tempAdminUser);
            storage.setSession(tempAdminUser);
            storage.processAttendance(tempAdminUser.id);
            setTempAdminUser(null);
            return true;
        }
        return false;
    };

    const register = async (username: string, nickname: string, password: string, secondPassword?: string, referralCode?: string, avatarUrl?: string) => {
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
                points += 100;
                inviter.points += 300;
                inviter.invite_count = (inviter.invite_count || 0) + 1;
                if (inviter.invite_count === 3) inviter.points += 500;
                if (inviter.invite_count === 10) inviter.points += 5000;
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
            username: username,
            nickname: nickname, // 닉네임 추가
            password,
            second_password: isAdmin ? secondPassword : undefined,
            is_admin: isAdmin,
            level: isAdmin ? 9999 : 1,
            email: `${username}@aihub.io`,
            avatar_url: avatarUrl || '',
            exp: 0,
            points: isAdmin ? 999999999 : points,
            credits: 0,
            inventory: [],
            active_items: isAdmin ? { name_color: '#FF0000', name_style: 'bold', badge: '👑' } : { theme: 'standard' },
            blocked_users: [],
            scrapped_posts: [],
            achievements: [],
            attendance_streak: 1,
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

    // Google 로그인
    const loginWithGoogle = async (): Promise<{ success: boolean, message: string }> => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const googleUser = result.user;

            // 이미 연동된 계정이 있는지 확인 (효율성: 로컬 캐시 먼저)
            const users = storage.getUsers();
            let existingUser = users.find(u => u.google_uid === googleUser.uid);

            if (existingUser) {
                // 기존 사용자 로그인
                setUser(existingUser);
                storage.setSession(existingUser);
                storage.processAttendance(existingUser.id);
                return { success: true, message: '로그인 성공!' };
            }

            // 신규 사용자 생성
            const isAdmin = googleUser.email === 'lech.skynic@gmail.com';
            const newUser: User = {
                id: `user-${Date.now()}`,
                username: `google_${googleUser.uid.slice(0, 8)}`,
                nickname: googleUser.displayName || '구글 사용자',
                google_uid: googleUser.uid,
                is_admin: isAdmin,
                level: isAdmin ? 999 : 1,
                email: googleUser.email || '',
                avatar_url: googleUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${googleUser.uid}`,
                exp: 0,
                points: isAdmin ? 1000000 : 500,
                credits: 0,
                inventory: [],
                active_items: isAdmin ? { name_color: '#FF0000', name_style: 'bold', badge: '👑' } : { theme: 'standard' },
                blocked_users: [],
                scrapped_posts: [],
                achievements: [],
                attendance_streak: 1,
                last_attendance_date: new Date().toISOString().split('T')[0],
                quests: { last_updated: new Date().toISOString().split('T')[0], daily_login: true, post_count: 0, comment_count: 0, balance_voted: false },
                referral_code: storage.generateReferralCode(),
                invite_count: 0,
                transactions: []
            };

            await storage.saveUser(newUser);
            setUser(newUser);
            storage.setSession(newUser);
            return { success: true, message: '구글 계정으로 가입되었습니다!' };
        } catch (error: any) {
            console.error('Google login error:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                return { success: false, message: '로그인이 취소되었습니다.' };
            }
            return { success: false, message: `로그인 실패: ${error.message}` };
        }
    };

    const loginAsGuest = async () => {
        const adjectives = ['익명의', '그림자', '은밀한', '디지털', '사이버', '비밀', '숨겨진', '팬텀', '유령', '미스터리'];
        const nouns = ['요원', '해커', '탐정', '닌자', '스파이', '전사', '수호자', '개발자', '여행자', '관찰자'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const guestNickname = `${adj} ${noun}`;
        const guestUsername = `guest_${Date.now()}`;

        const guestUser: User = {
            id: `guest-${Date.now()}`,
            username: guestUsername,
            nickname: guestNickname,
            is_guest: true,
            guest_expires_at: Date.now() + 30 * 60 * 1000, // 30분 후 만료
            level: 1,
            exp: 0,
            points: 100,
            credits: 0,
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`,
            inventory: [],
            active_items: { theme: 'standard' },
            blocked_users: [],
            scrapped_posts: [],
            achievements: [],
            attendance_streak: 0,
            last_attendance_date: '',
            quests: { last_updated: '', daily_login: false, post_count: 0, comment_count: 0, balance_voted: false },
            referral_code: '',
            invite_count: 0,
            transactions: []
        };

        await storage.saveUser(guestUser);
        setUser(guestUser);
        storage.setSession(guestUser);
    };

    const logout = async () => {
        const currentUser = storage.getSession();

        // 게스트 계정이면 삭제
        if (currentUser?.is_guest) {
            await storage.deleteUser(currentUser.id);
        }

        // Firebase 로그아웃
        try {
            await signOut(auth);
        } catch (e) { }

        setUser(null);
        storage.setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, verify2FA, register, loginAsGuest, loginWithGoogle, logout, isLoading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
