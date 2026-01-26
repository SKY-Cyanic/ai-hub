// AgentMarketplacePage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { Agent } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ==================== Types ====================
interface AgentStats {
    totalRentals: number;
    activeRentals: number;
    avgRating: number;
    reviewCount: number;
    successRate: number;
}

interface Review {
    id: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
    helpful: number;
}

interface FilterState {
    category: string;
    priceRange: [number, number];
    rating: number;
    sortBy: 'popular' | 'newest' | 'price-low' | 'price-high' | 'rating';
    searchQuery: string;
    tags: string[];
}

// ==================== Constants ====================
const CATEGORIES = [
    { id: 'all', name: '전체', icon: '🌐', color: 'gray' },
    { id: 'trading', name: '트레이딩', icon: '📈', color: 'green' },
    { id: 'analysis', name: '데이터 분석', icon: '🔬', color: 'blue' },
    { id: 'content', name: '콘텐츠', icon: '✍️', color: 'purple' },
    { id: 'automation', name: '자동화', icon: '⚙️', color: 'orange' },
    { id: 'research', name: '리서치', icon: '🔍', color: 'cyan' },
    { id: 'design', name: '디자인', icon: '🎨', color: 'pink' },
    { id: 'code', name: '코딩', icon: '💻', color: 'yellow' },
];

const SORT_OPTIONS = [
    { id: 'popular', label: '인기순', icon: '🔥' },
    { id: 'newest', label: '최신순', icon: '✨' },
    { id: 'price-low', label: '가격 낮은순', icon: '💰' },
    { id: 'price-high', label: '가격 높은순', icon: '💎' },
    { id: 'rating', label: '평점순', icon: '⭐' },
];

const POPULAR_TAGS = [
    'GPT-4', 'Claude', '자동매매', '분석', 'NFT', 'DeFi',
    '마케팅', 'SEO', '번역', '요약', '코딩', 'SQL'
];

// ==================== Sub Components ====================

// 별점 컴포넌트
const StarRating: React.FC<{ rating: number; size?: 'sm' | 'md' | 'lg'; interactive?: boolean; onChange?: (r: number) => void }> = ({
    rating, size = 'md', interactive = false, onChange
}) => {
    const [hovered, setHovered] = useState(0);
    const sizeClasses = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };

    return (
        <div className={`flex gap-0.5 ${sizeClasses[size]}`}>
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    disabled={!interactive}
                    onMouseEnter={() => interactive && setHovered(star)}
                    onMouseLeave={() => interactive && setHovered(0)}
                    onClick={() => interactive && onChange?.(star)}
                    className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
                >
                    {star <= (hovered || rating) ? '★' : '☆'}
                </button>
            ))}
        </div>
    );
};

// 가격 슬라이더
const PriceRangeSlider: React.FC<{ value: [number, number]; onChange: (v: [number, number]) => void; max: number }> = ({
    value, onChange, max
}) => {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
                <span>{value[0]} CR</span>
                <span>{value[1]} CR</span>
            </div>
            <div className="relative h-2 bg-gray-700 rounded-full">
                <div
                    className="absolute h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    style={{
                        left: `${(value[0] / max) * 100}%`,
                        right: `${100 - (value[1] / max) * 100}%`
                    }}
                />
                <input
                    type="range"
                    min={0}
                    max={max}
                    value={value[0]}
                    onChange={(e) => onChange([parseInt(e.target.value), value[1]])}
                    className="absolute w-full h-full opacity-0 cursor-pointer"
                />
                <input
                    type="range"
                    min={0}
                    max={max}
                    value={value[1]}
                    onChange={(e) => onChange([value[0], parseInt(e.target.value)])}
                    className="absolute w-full h-full opacity-0 cursor-pointer"
                />
            </div>
        </div>
    );
};

// 에이전트 카드 (개선된 버전)
const AgentCard: React.FC<{
    agent: Agent;
    stats?: AgentStats;
    onRent: () => void;
    onPreview: () => void;
    onCompare: () => void;
    isComparing: boolean;
    isFavorite: boolean;
    onToggleFavorite: () => void;
}> = ({ agent, stats, onRent, onPreview, onCompare, isComparing, isFavorite, onToggleFavorite }) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    const tierConfig = {
        bronze: { color: 'from-amber-700 to-amber-900', badge: '🥉', label: 'Bronze' },
        silver: { color: 'from-gray-400 to-gray-600', badge: '🥈', label: 'Silver' },
        gold: { color: 'from-yellow-400 to-yellow-600', badge: '🥇', label: 'Gold' },
        platinum: { color: 'from-cyan-400 to-blue-600', badge: '💎', label: 'Platinum' },
        diamond: { color: 'from-purple-400 to-pink-600', badge: '👑', label: 'Diamond' },
    };

    const tier = (agent as any).tier || 'bronze';
    const config = tierConfig[tier as keyof typeof tierConfig];

    return (
        <div className={`group relative bg-gray-900/80 backdrop-blur-sm rounded-2xl overflow-hidden border-2 transition-all duration-500 hover:scale-[1.02] ${isComparing ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]' : 'border-gray-800 hover:border-blue-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]'}`}>
            {/* Tier Badge */}
            <div className={`absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-gradient-to-r ${config.color} text-white text-xs font-bold flex items-center gap-1 shadow-lg`}>
                <span>{config.badge}</span>
                <span>{config.label}</span>
            </div>

            {/* Action Buttons */}
            <div className="absolute top-3 right-3 z-10 flex gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                    className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${isFavorite ? 'bg-red-500/80 text-white' : 'bg-black/50 text-gray-400 hover:text-red-400'}`}
                >
                    {isFavorite ? '❤️' : '🤍'}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onCompare(); }}
                    className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${isComparing ? 'bg-purple-500/80 text-white' : 'bg-black/50 text-gray-400 hover:text-purple-400'}`}
                >
                    ⚖️
                </button>
            </div>

            {/* Thumbnail */}
            <div
                onClick={onPreview}
                className="h-44 relative cursor-pointer overflow-hidden"
            >
                <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-20`} />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

                {/* Agent Avatar */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 flex items-center justify-center text-5xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl">
                            {(agent as any).avatar || '🤖'}
                        </div>
                        {/* Online indicator */}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-gray-900 animate-pulse" />
                    </div>
                </div>

                {/* Stats overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-gray-900 to-transparent p-4">
                    <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1 text-yellow-400">
                            <StarRating rating={agent.rating || 0} size="sm" />
                            <span className="text-gray-400">({stats?.reviewCount || 0})</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <span>👥 {stats?.totalRentals || 0}</span>
                            <span>✅ {stats?.successRate || 0}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                {/* Title & Model */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xl text-white truncate group-hover:text-blue-400 transition-colors">
                            {agent.name}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                            by {(agent as any).creatorName || 'Anonymous'}
                        </p>
                    </div>
                    <span className="px-2 py-1 bg-emerald-900/50 text-emerald-400 text-xs rounded-lg border border-emerald-500/30 font-mono whitespace-nowrap ml-2">
                        {(agent as any).model || 'GPT-4o'}
                    </span>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-sm line-clamp-2 mb-4 min-h-[2.5rem]">
                    {agent.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4 min-h-[28px]">
                    {agent.tags?.slice(0, 4).map(tag => (
                        <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-gray-800/80 text-gray-300 rounded-md hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                            #{tag}
                        </span>
                    ))}
                    {agent.tags?.length > 4 && (
                        <span className="text-xs px-2 py-0.5 text-gray-500">
                            +{agent.tags.length - 4}
                        </span>
                    )}
                </div>

                {/* Capabilities */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                    {((agent as any).capabilities || ['분석', '자동화', '리포트']).slice(0, 3).map((cap: string, i: number) => (
                        <span
                            key={i}
                            className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded-full border border-blue-500/20 whitespace-nowrap"
                        >
                            {cap}
                        </span>
                    ))}
                </div>

                {/* Pricing */}
                <div className="pt-4 border-t border-gray-800">
                    <div className="flex items-end justify-between mb-3">
                        <div>
                            <span className="text-xs text-gray-500 block">일일 대여</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-white">{agent.rental_price_daily}</span>
                                <span className="text-sm text-gray-400">CR/일</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-gray-500 block">월간 예상 수익</span>
                            <span className="text-lg font-bold text-green-400">
                                +{((agent as any).estimatedMonthlyReturn || agent.rental_price_daily * 3)} CR
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={onPreview}
                            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold text-sm transition-all border border-gray-700 hover:border-gray-600"
                        >
                            👁️ 미리보기
                        </button>
                        <button
                            onClick={onRent}
                            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02]"
                        >
                            🚀 대여하기
                        </button>
                    </div>
                </div>
            </div>

            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
};

// 검색 바
const SearchBar: React.FC<{ value: string; onChange: (v: string) => void; onSearch: () => void }> = ({
    value, onChange, onSearch
}) => {
    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                placeholder="에이전트 이름, 기능, 태그로 검색..."
                className="w-full px-6 py-4 pl-14 bg-gray-900/80 border-2 border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-lg"
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute right-20 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                    ✕
                </button>
            )}
            <button
                onClick={onSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
            >
                검색
            </button>
        </div>
    );
};

// 비교 패널
const ComparePanel: React.FC<{
    agents: Agent[];
    onRemove: (id: string) => void;
    onClear: () => void;
    onCompare: () => void;
}> = ({ agents, onRemove, onClear, onCompare }) => {
    if (agents.length === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-xl border-t-2 border-purple-500 p-4 shadow-[0_-10px_40px_rgba(168,85,247,0.3)]">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-purple-400 font-bold">⚖️ 비교 중: {agents.length}/4</span>
                    <div className="flex gap-2">
                        {agents.map(agent => (
                            <div
                                key={agent.id}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
                            >
                                <span className="text-xl">{(agent as any).avatar || '🤖'}</span>
                                <span className="text-white text-sm font-medium max-w-[100px] truncate">{agent.name}</span>
                                <button
                                    onClick={() => onRemove(agent.id)}
                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClear}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg border border-gray-700 transition-colors"
                    >
                        초기화
                    </button>
                    <button
                        onClick={onCompare}
                        disabled={agents.length < 2}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {agents.length < 2 ? '2개 이상 선택' : `${agents.length}개 비교하기`}
                    </button>
                </div>
            </div>
        </div>
    );
};

// 상세/대여 모달
const AgentDetailModal: React.FC<{
    agent: Agent;
    onClose: () => void;
    onRent: (days: number) => void;
    userBalance: number;
}> = ({ agent, onClose, onRent, userBalance }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'stats'>('overview');
    const [rentDays, setRentDays] = useState(7);
    const [rentType, setRentType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

    const pricing = {
        daily: { days: 1, price: agent.rental_price_daily, discount: 0 },
        weekly: { days: 7, price: agent.rental_price_daily * 7 * 0.85, discount: 15 },
        monthly: { days: 30, price: agent.rental_price_daily * 30 * 0.7, discount: 30 },
    };

    const selectedPlan = pricing[rentType];
    const totalCost = Math.floor(selectedPlan.price);
    const canAfford = userBalance >= totalCost;

    const mockReviews: Review[] = [
        { id: '1', userId: 'u1', userName: '트레이더킴', rating: 5, comment: '정말 훌륭한 분석 에이전트입니다. 수익률이 눈에 띄게 올랐어요!', createdAt: '2024-01-15', helpful: 24 },
        { id: '2', userId: 'u2', userName: 'AI연구자', rating: 4, comment: '기능은 좋은데 가끔 응답이 느릴 때가 있습니다.', createdAt: '2024-01-10', helpful: 12 },
        { id: '3', userId: 'u3', userName: '코인마스터', rating: 5, comment: '매일 사용중입니다. 필수 에이전트!', createdAt: '2024-01-08', helpful: 8 },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="relative h-48 bg-gradient-to-r from-blue-900/50 to-purple-900/50 overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                    <div className="absolute inset-0 flex items-center px-8">
                        <div className="flex items-center gap-6">
                            <div className="w-28 h-28 rounded-2xl bg-gray-800 border-2 border-gray-600 flex items-center justify-center text-6xl shadow-2xl">
                                {(agent as any).avatar || '🤖'}
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-bold text-white">{agent.name}</h2>
                                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full border border-emerald-500/30">
                                        {(agent as any).model || 'GPT-4o'}
                                    </span>
                                </div>
                                <p className="text-gray-400 mb-3">by {(agent as any).creatorName || 'Anonymous Creator'}</p>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <StarRating rating={agent.rating || 4.5} size="md" />
                                        <span className="text-gray-400">(128 리뷰)</span>
                                    </div>
                                    <span className="text-gray-500">|</span>
                                    <span className="text-gray-400">👥 1,234회 대여</span>
                                    <span className="text-gray-500">|</span>
                                    <span className="text-green-400">✅ 94% 성공률</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800 px-8 flex-shrink-0">
                    {[
                        { id: 'overview', label: '개요', icon: '📋' },
                        { id: 'reviews', label: '리뷰', icon: '💬' },
                        { id: 'stats', label: '성과', icon: '📊' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-4 font-medium transition-all relative ${activeTab === tab.id
                                ? 'text-blue-400'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {tab.icon} {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-3 space-y-6">
                            {activeTab === 'overview' && (
                                <>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-3">설명</h3>
                                        <p className="text-gray-400 leading-relaxed">
                                            {agent.description}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-3">주요 기능</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {((agent as any).capabilities || ['실시간 분석', '자동 리포트', 'API 연동', '알림 설정']).map((cap: string, i: number) => (
                                                <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                                                    <span className="text-2xl">✓</span>
                                                    <span className="text-gray-300">{cap}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-3">태그</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {agent.tags?.map(tag => (
                                                <span key={tag} className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'reviews' && (
                                <div className="space-y-4">
                                    {mockReviews.map(review => (
                                        <div key={review.id} className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="font-medium text-white">{review.userName}</span>
                                                    <span className="text-gray-500 text-sm ml-2">{review.createdAt}</span>
                                                </div>
                                                <StarRating rating={review.rating} size="sm" />
                                            </div>
                                            <p className="text-gray-400">{review.comment}</p>
                                            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                                                <button className="hover:text-blue-400 transition-colors">👍 {review.helpful}</button>
                                                <span>도움이 됐어요</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'stats' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 text-center">
                                            <div className="text-3xl font-bold text-green-400">+127%</div>
                                            <div className="text-gray-400 text-sm">평균 수익률</div>
                                        </div>
                                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 text-center">
                                            <div className="text-3xl font-bold text-blue-400">94%</div>
                                            <div className="text-gray-400 text-sm">성공률</div>
                                        </div>
                                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 text-center">
                                            <div className="text-3xl font-bold text-purple-400">1,234</div>
                                            <div className="text-gray-400 text-sm">총 대여 횟수</div>
                                        </div>
                                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 text-center">
                                            <div className="text-3xl font-bold text-yellow-400">4.8</div>
                                            <div className="text-gray-400 text-sm">평균 평점</div>
                                        </div>
                                    </div>
                                    {/* 여기에 차트 추가 가능 */}
                                </div>
                            )}
                        </div>

                        {/* Sidebar - Pricing */}
                        <div className="lg:col-span-2">
                            <div className="sticky top-0 p-6 bg-gray-800/50 rounded-2xl border border-gray-700">
                                <h3 className="text-lg font-bold text-white mb-4">대여 플랜 선택</h3>

                                <div className="space-y-3 mb-6">
                                    {Object.entries(pricing).map(([key, plan]) => (
                                        <button
                                            key={key}
                                            onClick={() => setRentType(key as any)}
                                            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${rentType === key
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-gray-700 hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold text-white capitalize">
                                                        {key === 'daily' ? '일일' : key === 'weekly' ? '주간' : '월간'}
                                                    </div>
                                                    <div className="text-sm text-gray-400">{plan.days}일</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-white">{Math.floor(plan.price)} CR</div>
                                                    {plan.discount > 0 && (
                                                        <div className="text-sm text-green-400">-{plan.discount}% 할인</div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="p-4 bg-gray-900/50 rounded-xl mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-400">대여 기간</span>
                                        <span className="font-bold text-white">{selectedPlan.days}일</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-400">일일 요금</span>
                                        <span className="text-white">{agent.rental_price_daily} CR</span>
                                    </div>
                                    {selectedPlan.discount > 0 && (
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-400">할인</span>
                                            <span className="text-green-400">-{selectedPlan.discount}%</span>
                                        </div>
                                    )}
                                    <div className="h-px bg-gray-700 my-3" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold text-white">총 비용</span>
                                        <span className="text-2xl font-bold text-yellow-400">{totalCost} CR</span>
                                    </div>
                                </div>

                                {!canAfford && (
                                    <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-xl text-red-400 text-sm text-center mb-4">
                                        ⚠️ CR이 부족합니다 (보유: {userBalance} CR)
                                    </div>
                                )}

                                <button
                                    onClick={() => onRent(selectedPlan.days)}
                                    disabled={!canAfford}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold text-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25"
                                >
                                    {canAfford ? '🚀 대여 시작하기' : '💰 CR 충전하기'}
                                </button>

                                <p className="text-center text-gray-500 text-xs mt-3">
                                    대여 즉시 에이전트 사용이 가능합니다
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 비교 모달
const CompareModal: React.FC<{
    agents: Agent[];
    onClose: () => void;
    onRent: (agent: Agent) => void;
}> = ({ agents, onClose, onRent }) => {
    const compareFields = [
        { key: 'rental_price_daily', label: '일일 가격', format: (v: number) => `${v} CR` },
        { key: 'rating', label: '평점', format: (v: number) => `⭐ ${v || 'N/A'}` },
        { key: 'total_revenue', label: '총 수익', format: (v: number) => `${v || 0} CR` },
        { key: 'model', label: '모델', format: (v: string) => v || 'GPT-4o' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-gray-900 rounded-3xl border border-purple-500 w-full max-w-5xl max-h-[80vh] overflow-auto">
                <div className="sticky top-0 bg-gray-900 p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">⚖️ 에이전트 비교</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
                </div>

                <div className="p-6">
                    <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${agents.length}, 1fr)` }}>
                        {/* Header row */}
                        <div />
                        {agents.map(agent => (
                            <div key={agent.id} className="text-center p-4 bg-gray-800/50 rounded-xl">
                                <div className="text-4xl mb-2">{(agent as any).avatar || '🤖'}</div>
                                <h3 className="font-bold text-white">{agent.name}</h3>
                            </div>
                        ))}

                        {/* Compare rows */}
                        {compareFields.map(field => (
                            <React.Fragment key={field.key}>
                                <div className="flex items-center text-gray-400 font-medium">
                                    {field.label}
                                </div>
                                {agents.map(agent => (
                                    <div key={agent.id} className="text-center py-3 text-white">
                                        {field.format((agent as any)[field.key])}
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}

                        {/* Action row */}
                        <div />
                        {agents.map(agent => (
                            <div key={agent.id} className="text-center pt-4">
                                <button
                                    onClick={() => onRent(agent)}
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:brightness-110 transition-all"
                                >
                                    대여하기
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==================== Main Component ====================
const AgentMarketplacePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // State
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [compareAgents, setCompareAgents] = useState<Agent[]>([]);
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);

    const [filters, setFilters] = useState<FilterState>({
        category: searchParams.get('category') || 'all',
        priceRange: [0, 1000],
        rating: 0,
        sortBy: (searchParams.get('sort') as any) || 'popular',
        searchQuery: searchParams.get('q') || '',
        tags: [],
    });

    // Load agents
    useEffect(() => {
        setIsLoading(true);
        const unsub = storage.subscribeAgents((data) => {
            setAgents(data);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    // Load favorites from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('agentFavorites');
        if (saved) setFavorites(new Set(JSON.parse(saved)));
    }, []);

    // Save favorites
    useEffect(() => {
        localStorage.setItem('agentFavorites', JSON.stringify([...favorites]));
    }, [favorites]);

    // Filtered & sorted agents
    const filteredAgents = useMemo(() => {
        let result = [...agents];

        // Category filter
        if (filters.category !== 'all') {
            result = result.filter(a => (a as any).category === filters.category || a.tags?.includes(filters.category));
        }

        // Price range
        result = result.filter(a => a.rental_price_daily >= filters.priceRange[0] && a.rental_price_daily <= filters.priceRange[1]);

        // Rating
        if (filters.rating > 0) {
            result = result.filter(a => (a.rating || 0) >= filters.rating);
        }

        // Search
        if (filters.searchQuery) {
            const q = filters.searchQuery.toLowerCase();
            result = result.filter(a =>
                a.name.toLowerCase().includes(q) ||
                a.description.toLowerCase().includes(q) ||
                a.tags?.some(t => t.toLowerCase().includes(q))
            );
        }

        // Tags
        if (filters.tags.length > 0) {
            result = result.filter(a => filters.tags.some(t => a.tags?.includes(t)));
        }

        // Sort
        switch (filters.sortBy) {
            case 'popular':
                result.sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
                break;
            case 'newest':
                result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
            case 'price-low':
                result.sort((a, b) => a.rental_price_daily - b.rental_price_daily);
                break;
            case 'price-high':
                result.sort((a, b) => b.rental_price_daily - a.rental_price_daily);
                break;
            case 'rating':
                result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
        }

        return result;
    }, [agents, filters]);

    // Handlers
    const handleRent = async (agent: Agent, days: number) => {
        if (!user) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        const result = await storage.rentAgent(agent.id, user.id, days);
        if (result.success) {
            alert(result.message);
            setSelectedAgent(null);
        } else {
            alert(`대여 실패: ${result.message}`);
        }
    };

    const toggleCompare = (agent: Agent) => {
        setCompareAgents(prev => {
            if (prev.find(a => a.id === agent.id)) {
                return prev.filter(a => a.id !== agent.id);
            }
            if (prev.length >= 4) {
                alert('최대 4개까지 비교할 수 있습니다.');
                return prev;
            }
            return [...prev, agent];
        });
    };

    const toggleFavorite = (agentId: string) => {
        setFavorites(prev => {
            const next = new Set(prev);
            if (next.has(agentId)) next.delete(agentId);
            else next.add(agentId);
            return next;
        });
    };

    const maxPrice = Math.max(...agents.map(a => a.rental_price_daily), 1000);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
            {/* Hero Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

                <div className="relative max-w-7xl mx-auto px-4 py-16">
                    <div className="text-center mb-12">
                        <h1 className="text-5xl md:text-6xl font-black mb-4">
                            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-transparent bg-clip-text">
                                Agent Marketplace
                            </span>
                            <span className="ml-4">🤖</span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            세계 최고의 AI 전문가들을 만나보세요. 검증된 에이전트로 수익을 극대화하세요.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-center gap-8 mb-12">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white">{agents.length}</div>
                            <div className="text-gray-500">전체 에이전트</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-400">1,234</div>
                            <div className="text-gray-500">활성 대여</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-yellow-400">$52K</div>
                            <div className="text-gray-500">총 거래액</div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="max-w-3xl mx-auto">
                        <SearchBar
                            value={filters.searchQuery}
                            onChange={(v) => setFilters(f => ({ ...f, searchQuery: v }))}
                            onSearch={() => { }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 pb-32">
                {/* Categories */}
                <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFilters(f => ({ ...f, category: cat.id }))}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl whitespace-nowrap transition-all font-medium ${filters.category === cat.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            <span className="text-xl">{cat.icon}</span>
                            <span>{cat.name}</span>
                        </button>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${showFilters ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                        >
                            🎛️ 필터
                        </button>
                        <span className="text-gray-500">{filteredAgents.length}개의 에이전트</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Sort */}
                        <select
                            value={filters.sortBy}
                            onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value as any }))}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:border-blue-500 outline-none"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.icon} {opt.label}</option>
                            ))}
                        </select>

                        <button
                            onClick={() => navigate('/studio')}
                            className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold hover:brightness-110 transition-all"
                        >
                            + 에이전트 등록
                        </button>
                    </div>
                </div>

                {/* Expandable Filters */}
                {showFilters && (
                    <div className="mb-6 p-6 bg-gray-900/80 rounded-2xl border border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Price Range */}
                        <div>
                            <h4 className="font-bold text-white mb-3">가격 범위</h4>
                            <PriceRangeSlider
                                value={filters.priceRange}
                                onChange={(v) => setFilters(f => ({ ...f, priceRange: v }))}
                                max={maxPrice}
                            />
                        </div>

                        {/* Rating */}
                        <div>
                            <h4 className="font-bold text-white mb-3">최소 평점</h4>
                            <div className="flex gap-2">
                                {[0, 3, 4, 4.5].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setFilters(f => ({ ...f, rating: r }))}
                                        className={`px-3 py-2 rounded-lg border transition-all ${filters.rating === r ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                                    >
                                        {r === 0 ? '전체' : `${r}+⭐`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Popular Tags */}
                        <div>
                            <h4 className="font-bold text-white mb-3">인기 태그</h4>
                            <div className="flex flex-wrap gap-2">
                                {POPULAR_TAGS.slice(0, 6).map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setFilters(f => ({
                                            ...f,
                                            tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
                                        }))}
                                        className={`px-3 py-1 rounded-full text-sm transition-all ${filters.tags.includes(tag)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            }`}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Agent Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-96 bg-gray-800/50 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredAgents.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-2xl font-bold text-white mb-2">에이전트를 찾을 수 없습니다</h3>
                        <p className="text-gray-500">다른 검색어나 필터를 시도해보세요</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAgents.map(agent => (
                            <AgentCard
                                key={agent.id}
                                agent={agent}
                                onRent={() => setSelectedAgent(agent)}
                                onPreview={() => setSelectedAgent(agent)}
                                onCompare={() => toggleCompare(agent)}
                                isComparing={!!compareAgents.find(a => a.id === agent.id)}
                                isFavorite={favorites.has(agent.id)}
                                onToggleFavorite={() => toggleFavorite(agent.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Compare Panel */}
            <ComparePanel
                agents={compareAgents}
                onRemove={(id) => setCompareAgents(prev => prev.filter(a => a.id !== id))}
                onClear={() => setCompareAgents([])}
                onCompare={() => setShowCompareModal(true)}
            />

            {/* Modals */}
            {selectedAgent && (
                <AgentDetailModal
                    agent={selectedAgent}
                    onClose={() => setSelectedAgent(null)}
                    onRent={(days) => handleRent(selectedAgent, days)}
                    userBalance={user?.points || 0}
                />
            )}

            {showCompareModal && (
                <CompareModal
                    agents={compareAgents}
                    onClose={() => setShowCompareModal(false)}
                    onRent={(agent) => {
                        setShowCompareModal(false);
                        setSelectedAgent(agent);
                    }}
                />
            )}
        </div>
    );
};

export default AgentMarketplacePage;