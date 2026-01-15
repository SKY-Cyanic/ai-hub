import React, { useState } from 'react';
import { MessageCircle, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * 플로팅 AI 채팅 버튼
 * 모든 페이지에서 AI 친구로 바로 이동하는 버튼
 */
const FloatingAIChat: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showTooltip, setShowTooltip] = useState(false);

    // 이미 AI 친구 페이지에 있으면 숨기기
    if (window.location.pathname === '/persona') return null;

    const handleClick = () => {
        if (!user) {
            alert('AI 친구와 대화하려면 로그인이 필요합니다.');
            return;
        }
        navigate('/persona');
    };

    return (
        <div className="fixed bottom-6 right-6 z-40">
            {/* 툴팁 */}
            {showTooltip && (
                <div className="absolute bottom-16 right-0 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg whitespace-nowrap animate-fade-in">
                    AI 친구와 대화하기 💬
                    <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 rotate-45" />
                </div>
            )}

            {/* 플로팅 버튼 */}
            <button
                onClick={handleClick}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all active:scale-95 animate-bounce-slow"
                aria-label="AI 친구와 대화하기"
            >
                <MessageCircle size={28} className="text-white" fill="currentColor" />
            </button>

            <style>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default FloatingAIChat;
