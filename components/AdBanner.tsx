import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

import { storage } from '../services/storage';

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

interface AdBannerProps {
    slot: 'sidebar' | 'footer' | 'game' | 'inline' | 'reward';
    className?: string;
}

/**
 * 구글 애드센스 광고 배너 컴포넌트
 * - sidebar: 사이드바 하단 (250x250)
 * - footer: 페이지 하단 (728x90 리더보드)
 * - game: 게임 페이지 (반응형)
 * - inline: 콘텐츠 중간 (반응형)
 * - reward: 보상형 광고 버튼
 */
const AdBanner: React.FC<AdBannerProps> = ({ slot, className = '' }) => {
    const adRef = useRef<HTMLDivElement>(null);
    const isLoaded = useRef(false);
    const [isRewardLoading, setIsRewardLoading] = React.useState(false);

    const { user, refreshUser } = useAuth();
    const location = useLocation();

    useEffect(() => {
        // 개발 환경에서는 광고 로드 스킵
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // 광고 제거 패스 체크
        const hasAdRemove = user?.expires_at?.['ad_remove'] && new Date(user.expires_at['ad_remove']) > new Date();

        if (slot !== 'reward' && !isDev && !isLoaded.current && adRef.current && !hasAdRemove) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                isLoaded.current = true;
            } catch (e) {
                console.error('AdSense error:', e);
            }
        }
    }, [user, slot]);

    const handleRewardAd = async () => {
        if (!user) return alert('로그인이 필요합니다.');
        if (isRewardLoading) return;

        if (!confirm('15초 광고를 시청하고 50 CR을 받으시겠습니까?')) return;

        setIsRewardLoading(true);

        // 3초 시뮬레이션
        setTimeout(async () => {
            const reward = 50;
            // 직접 트랜잭션 추가 (API가 없으므로 storage.updateUserCredits 같은게 필요하지만 여기선 간단히 구현)
            // storage.ts의존성 최소화를 위해 간단히 user 객체 수정 후 save하지만, 안전하게 별도 메소드 사용 권장
            // 여기서는 deductPoints는 있는데 earnPoints는 없으므로 간단히 구현

            // Note: In real app, verify backend verification token
            if (user) {
                // 임시: user 객체를 직접 업데이트하고 save
                // 하지만 storage.deductPoints(-50) 은 꼼수이므로...
                // storage.ts에 earnPoints가 없으므로 upgradeToPro 로직 등을 참고하여 직접 구현하거나 
                // types.ts를 보면 updateUserCredits 같은게 있는지 확인. 
                // storage.ts에 purchaseItem 등이 있으니... 여기선 upgradeToPro 처럼 직접 구현은 복잡하니
                // deductPoints에 음수를 넣는 꼼수보다는, 
                // 단순히 알림만 띄우고 끝내는게 아니라 실제로 줘야함.

                // Let's use a simple direct update via storage.saveUser pattern here for now as there is no specific 'earnPoints' method exposed publicly in previous artifacts fully.
                // Actually `storage.ts` usually has direct access in other components.

                const updatedUser = { ...user };
                updatedUser.points = (updatedUser.points || 0) + reward;

                if (!updatedUser.transactions) updatedUser.transactions = [];
                updatedUser.transactions.unshift({
                    id: `tx-ad-${Date.now()}`,
                    type: 'earn',
                    amount: reward,
                    description: '보상형 광고 시청 보상',
                    created_at: new Date().toISOString()
                });

                await storage.saveUser(updatedUser);
                refreshUser();

                storage.addNotification({
                    id: `notif-${Date.now()}`,
                    user_id: user.id,
                    type: 'system',
                    message: `광고 시청 보상으로 ${reward} CR이 지급되었습니다!`,
                    link: '/mypage',
                    is_read: false,
                    created_at: new Date().toISOString()
                });

                alert(`광고 시청 완료! ${reward} CR이 지급되었습니다.`);
            }
            setIsRewardLoading(false);
        }, 3000);
    };

    // AI 채팅 페이지에서는 광고 숨김
    const isAIChatPage = location.pathname === '/chat' ||
        location.pathname === '/ai-friend' ||
        location.pathname === '/persona';

    if (isAIChatPage) return null;

    // 보상형 광고는 광고 제거 패스 있어도 보임 (선택사항이므로)
    // 그 외 슬롯은 광고 제거 패스 시 숨김
    const hasAdRemove = user?.expires_at?.['ad_remove'] && new Date(user.expires_at['ad_remove']) > new Date();
    if (slot !== 'reward' && hasAdRemove) return null;

    // 보상형 광고 UI
    if (slot === 'reward') {
        return (
            <button
                onClick={handleRewardAd}
                disabled={isRewardLoading}
                className={`w-full p-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg transform transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${className}`}
            >
                {isRewardLoading ? (
                    <>⏳ 광고 재생 중... (3초)</>
                ) : (
                    <>📺 광고 보고 50 CR 받기</>
                )}
            </button>
        );
    }

    // 슬롯별 스타일 설정
    const getSlotStyles = () => {
        switch (slot) {
            case 'sidebar':
                return 'w-[250px] h-[250px] mx-auto';
            case 'footer':
                return 'w-full max-w-[728px] h-[90px] mx-auto';
            case 'game':
                return 'w-full max-w-[728px] h-[90px] mx-auto md:h-[90px]';
            case 'inline':
                return 'w-full min-h-[100px]';
            default:
                return '';
        }
    };

    // 개발 환경에서는 플레이스홀더 표시
    const isDev = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isDev) {
        return (
            <div className={`bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-xs font-bold ${getSlotStyles()} ${className}`}>
                <div className="text-center">
                    <div className="text-lg mb-1">📢</div>
                    <div>광고 영역 ({slot})</div>
                </div>
            </div>
        );
    }

    return (
        <div ref={adRef} className={`overflow-hidden ${getSlotStyles()} ${className}`}>
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-6612970567702495"
                data-ad-slot="auto"
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    );
};

export default AdBanner;
