/**
 * AI 사용량 관리 서비스
 * - 일일 무료 사용량 추적
 * - 크레딧(CR) 소비 로직
 * - 무제한 이용권 체크
 */

import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

// 일일 무료 사용 한도
const FREE_DAILY_LIMIT = 20; // 하루 20회 무료
const CR_PER_MESSAGE = 10; // 무료 소진 후 메시지당 10CR

// 로컬 스토리지 키 (비로그인 사용자용)
const LOCAL_USAGE_KEY = 'ai_daily_usage';

export interface UsageInfo {
    dailyUsed: number;
    dailyLimit: number;
    hasUnlimitedPass: boolean;
    passExpiresAt?: string;
    needsCredits: boolean;
    creditsRequired: number;
}

export interface UserUsageData {
    dailyUsed: number;
    lastResetDate: string;
    unlimitedPassExpiry?: string;
}

/**
 * 오늘 날짜 문자열 반환 (YYYY-MM-DD)
 */
function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * 로컬 스토리지에서 사용량 가져오기 (비로그인 사용자)
 */
function getLocalUsage(): UserUsageData {
    try {
        const stored = localStorage.getItem(LOCAL_USAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            if (data.lastResetDate !== getTodayString()) {
                return { dailyUsed: 0, lastResetDate: getTodayString() };
            }
            return data;
        }
    } catch (e) {
        console.error('Local usage parse error:', e);
    }
    return { dailyUsed: 0, lastResetDate: getTodayString() };
}

/**
 * 로컬 스토리지에 사용량 저장
 */
function setLocalUsage(data: UserUsageData): void {
    localStorage.setItem(LOCAL_USAGE_KEY, JSON.stringify(data));
}

export const UsageService = {
    /**
     * 사용량 정보 조회
     */
    async getUsageInfo(uid?: string): Promise<UsageInfo> {
        let data: UserUsageData;

        if (uid) {
            const docRef = doc(db, "user_usage", uid);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                data = snap.data() as UserUsageData;
                if (data.lastResetDate !== getTodayString()) {
                    data = { dailyUsed: 0, lastResetDate: getTodayString() };
                    await setDoc(docRef, data);
                }
            } else {
                data = { dailyUsed: 0, lastResetDate: getTodayString() };
                await setDoc(docRef, data);
            }
        } else {
            data = getLocalUsage();
        }

        const hasUnlimitedPass = data.unlimitedPassExpiry
            ? new Date(data.unlimitedPassExpiry) > new Date()
            : false;

        const needsCredits = !hasUnlimitedPass && data.dailyUsed >= FREE_DAILY_LIMIT;

        return {
            dailyUsed: data.dailyUsed,
            dailyLimit: FREE_DAILY_LIMIT,
            hasUnlimitedPass,
            passExpiresAt: data.unlimitedPassExpiry,
            needsCredits,
            creditsRequired: needsCredits ? CR_PER_MESSAGE : 0
        };
    },

    /**
     * 사용량 증가
     */
    async incrementUsage(uid?: string): Promise<boolean> {
        if (uid) {
            const docRef = doc(db, "user_usage", uid);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const data = snap.data() as UserUsageData;
                if (data.lastResetDate !== getTodayString()) {
                    await setDoc(docRef, { dailyUsed: 1, lastResetDate: getTodayString() });
                } else {
                    await updateDoc(docRef, { dailyUsed: increment(1) });
                }
            } else {
                await setDoc(docRef, { dailyUsed: 1, lastResetDate: getTodayString() });
            }
        } else {
            const data = getLocalUsage();
            data.dailyUsed++;
            setLocalUsage(data);
        }
        return true;
    },

    /**
     * 무제한 패스 활성화
     */
    async activateUnlimitedPass(uid: string, hours: number = 24): Promise<void> {
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + hours);

        const docRef = doc(db, "user_usage", uid);
        await setDoc(docRef, {
            unlimitedPassExpiry: expiryDate.toISOString(),
            lastResetDate: getTodayString()
        }, { merge: true });
    },

    /**
     * 크레딧 소비 (무료 소진 후)
     * 로컬 세션의 포인트를 직접 조회하고 차감
     */
    async consumeCredits(uid: string, amount: number = CR_PER_MESSAGE): Promise<boolean> {
        try {
            // 로컬 스토리지의 사용자 데이터에서 username 가져오기
            const localSession = localStorage.getItem('ai_hub_session_v4');
            if (!localSession) return false;

            const sessionData = JSON.parse(localSession);
            const currentPoints = sessionData.points || 0;

            if (currentPoints < amount) {
                return false; // 크레딧 부족
            }

            // Firestore에서 포인트(CR) 차감 - username으로 문서 접근
            const userRef = doc(db, "users", sessionData.username);
            await updateDoc(userRef, {
                points: increment(-amount)
            });

            // 로컬 세션도 업데이트
            sessionData.points = currentPoints - amount;
            localStorage.setItem('ai_hub_session_v4', JSON.stringify(sessionData));

            return true;
        } catch (e) {
            console.error('Consume credits error:', e);
            return false;
        }
    },

    /**
     * 사용자 크레딧(포인트) 조회
     */
    async getUserCredits(uid: string): Promise<number> {
        try {
            // 로컬 세션에서 먼저 확인
            const localSession = localStorage.getItem('ai_hub_session_v4');
            if (localSession) {
                const sessionData = JSON.parse(localSession);
                if (sessionData.id === uid) {
                    return sessionData.points || 0;
                }
            }

            // Firestore에서 조회
            const userDocRef = doc(db, "users", uid);
            const userSnap = await getDoc(userDocRef);
            return userSnap.exists() ? (userSnap.data().points || 0) : 0;
        } catch (e) {
            console.error('Get user credits error:', e);
            return 0;
        }
    },

    FREE_DAILY_LIMIT,
    CR_PER_MESSAGE
};
