import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

interface AdBannerProps {
    slot: 'sidebar' | 'footer' | 'game' | 'inline';
    className?: string;
}

/**
 * 구글 애드센스 광고 배너 컴포넌트
 * - sidebar: 사이드바 하단 (250x250)
 * - footer: 페이지 하단 (728x90 리더보드)
 * - game: 게임 페이지 (반응형)
 * - inline: 콘텐츠 중간 (반응형)
 */
const AdBanner: React.FC<AdBannerProps> = ({ slot, className = '' }) => {
    const adRef = useRef<HTMLDivElement>(null);
    const isLoaded = useRef(false);

    const { user } = useAuth();
    const location = useLocation();

    useEffect(() => {
        // 개발 환경에서는 광고 로드 스킵
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // 광고 제거 패스 체크
        const hasAdRemove = user?.expires_at?.['ad_remove'] && new Date(user.expires_at['ad_remove']) > new Date();

        if (!isDev && !isLoaded.current && adRef.current && !hasAdRemove) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                isLoaded.current = true;
            } catch (e) {
                console.error('AdSense error:', e);
            }
        }
    }, [user]);

    // AI 채팅 페이지에서는 광고 숨김
    const isAIChatPage = location.pathname === '/chat' ||
        location.pathname === '/ai-friend' ||
        location.pathname === '/persona';

    if (isAIChatPage) return null;

    // 광고 제거 효과가 있으면 렌더링하지 않음
    const hasAdRemove = user?.expires_at?.['ad_remove'] && new Date(user.expires_at['ad_remove']) > new Date();
    if (hasAdRemove) return null;

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
