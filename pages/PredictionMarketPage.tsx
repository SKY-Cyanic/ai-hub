// PredictionMarketPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { PredictionMarket } from '../types';
import { useNavigate } from 'react-router-dom';

// ==================== Types ====================
interface MarketAnalytics {
    totalBettors: number;
    averageBet: number;
    whaleDistribution: Record<string, number>;
    recentTrend: 'up' | 'down' | 'stable';
    volumeHistory: number[];
    confidence: number;
}

interface UserBet {
    marketId: string;
    optionId: string;
    amount: number;
    timestamp: string;
    potentialReturn: number;
}

type MarketStatus = 'active' | 'pending' | 'resolved' | 'disputed';
type SortOption = 'newest' | 'ending' | 'volume' | 'trending';
type FilterCategory = 'all' | 'crypto' | 'sports' | 'politics' | 'entertainment' | 'tech';

// ==================== Constants ====================
const CATEGORIES: { id: FilterCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: '전체 시장', icon: <GridIcon /> },
    { id: 'crypto', label: '암호화폐', icon: <CryptoIcon /> },
    { id: 'sports', label: '스포츠', icon: <SportsIcon /> },
    { id: 'politics', label: '정치', icon: <PoliticsIcon /> },
    { id: 'entertainment', label: '엔터테인먼트', icon: <EntertainmentIcon /> },
    { id: 'tech', label: '테크/경제', icon: <TechIcon /> },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
    { id: 'trending', label: '실시간 인기' },
    { id: 'volume', label: '거래 대금순' },
    { id: 'ending', label: '마감 임박' },
    { id: 'newest', label: '최신 등록' },
];

// ==================== Icons ====================
function GridIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    );
}

function CryptoIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function SportsIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function PoliticsIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
    );
}

function EntertainmentIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
    );
}

function TechIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    );
}

function ChartIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    );
}

function TrendUpIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
    );
}

function TrendDownIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}

function FireIcon() {
    return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
        </svg>
    );
}

// ==================== Utility Functions ====================
function formatTimeRemaining(deadline: string): string {
    const now = Date.now();
    const end = new Date(deadline).getTime();
    const diff = end - now;

    if (diff <= 0) return '종료됨';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}일 ${hours}시간 남음`;
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
}

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
}

function getMarketStatus(market: PredictionMarket): MarketStatus {
    const now = Date.now();
    const deadline = new Date(market.deadline).getTime();

    if (market.result_option_id) return 'resolved';
    if (deadline < now) return 'pending';
    return 'active';
}

function generateMockAnalytics(market: PredictionMarket): MarketAnalytics {
    return {
        totalBettors: Math.floor(Math.random() * 500) + 50,
        averageBet: Math.floor(market.total_pool / (Math.random() * 100 + 10)),
        whaleDistribution: market.options.reduce((acc, opt) => {
            acc[opt.id] = Math.random() * 100;
            return acc;
        }, {} as Record<string, number>),
        recentTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
        volumeHistory: Array.from({ length: 24 }, () => Math.random() * 1000),
        confidence: Math.random() * 40 + 60,
    };
}

// ==================== Sub Components ====================

// 미니 차트 컴포넌트
const MiniChart: React.FC<{ data: number[]; color?: string; height?: number }> = ({
    data,
    color = '#3b82f6',
    height = 40
}) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = ((max - value) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const areaPoints = `0,${height} ${points} 100,${height}`;

    return (
        <svg className="w-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
            <defs>
                <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon
                points={areaPoints}
                fill={`url(#gradient-${color.replace('#', '')})`}
            />
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
};

// 프로그레스 바 컴포넌트
const ProgressBar: React.FC<{
    options: Array<{ id: string; label: string; pool: number }>;
    total: number;
}> = ({ options, total }) => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

    return (
        <div className="space-y-2">
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-800">
                {options.map((opt, idx) => {
                    const percent = total > 0 ? (opt.pool / total) * 100 : 0;
                    return (
                        <div
                            key={opt.id}
                            className="transition-all duration-500 relative group"
                            style={{
                                width: `${percent}%`,
                                backgroundColor: colors[idx % colors.length],
                            }}
                        >
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-xs">
                {options.map((opt, idx) => {
                    const percent = total > 0 ? Math.round((opt.pool / total) * 100) : 0;
                    return (
                        <div key={opt.id} className="flex items-center gap-1.5">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: colors[idx % colors.length] }}
                            />
                            <span className="text-gray-400">{opt.label}</span>
                            <span className="text-white font-bold">{percent}%</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// 배팅 슬라이더 컴포넌트
const BetSlider: React.FC<{
    value: number;
    onChange: (value: number) => void;
    max: number;
    min?: number;
}> = ({ value, onChange, max, min = 10 }) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="space-y-2">
            <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                    className="absolute h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
                <span>{min} CR</span>
                <span>{max} CR</span>
            </div>
        </div>
    );
};

// 마켓 카드 컴포넌트
const MarketCard: React.FC<{
    market: PredictionMarket;
    analytics: MarketAnalytics;
    userBalance: number;
    isPro: boolean;
    onBet: (optionId: string, amount: number) => void;
    onViewDetails: () => void;
}> = ({ market, analytics, userBalance, isPro, onBet, onViewDetails }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [betAmount, setBetAmount] = useState(100);

    const status = getMarketStatus(market);
    const timeRemaining = formatTimeRemaining(market.deadline);
    const isEnding = new Date(market.deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000;

    const statusConfig = {
        active: { label: 'LIVE', color: 'bg-green-500', textColor: 'text-green-400' },
        pending: { label: 'PENDING', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
        resolved: { label: 'RESOLVED', color: 'bg-blue-500', textColor: 'text-blue-400' },
        disputed: { label: 'DISPUTED', color: 'bg-red-500', textColor: 'text-red-400' },
    };

    const handleBet = () => {
        if (selectedOption && betAmount > 0) {
            onBet(selectedOption, betAmount);
            setSelectedOption(null);
        }
    };

    const getOdds = (optionPool: number) => {
        if (optionPool <= 0) return 2.0;
        return Math.max(1.01, market.total_pool / optionPool);
    };

    const getPotentialReturn = (optionPool: number, amount: number) => {
        const odds = getOdds(optionPool);
        return Math.floor(amount * odds);
    };

    return (
        <div className="group relative">
            {/* 글로우 효과 */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all duration-300">
                {/* 헤더 */}
                <div className="p-5 pb-0">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                            {/* 상태 표시 */}
                            <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${statusConfig[status].color} animate-pulse`} />
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${statusConfig[status].textColor}`}>
                                    {statusConfig[status].label}
                                </span>
                            </div>

                            {/* 트렌딩 배지 */}
                            {analytics.recentTrend === 'up' && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 rounded-full">
                                    <FireIcon />
                                    <span className="text-[10px] font-bold text-orange-400">HOT</span>
                                </div>
                            )}
                        </div>

                        {/* 타이머 */}
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${isEnding ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                            <ClockIcon />
                            <span className="text-xs font-mono font-bold">{timeRemaining}</span>
                        </div>
                    </div>

                    {/* 질문 */}
                    <h3
                        onClick={onViewDetails}
                        className="text-lg font-bold text-white mb-4 line-clamp-2 cursor-pointer hover:text-blue-400 transition-colors leading-tight"
                    >
                        {market.question}
                    </h3>

                    {/* 진행률 바 */}
                    <ProgressBar options={market.options} total={market.total_pool} />
                </div>

                {/* 옵션 선택 영역 */}
                <div className="p-5 pt-4">
                    <div className="grid gap-2">
                        {market.options.map((option, idx) => {
                            const odds = getOdds(option.pool);
                            const isSelected = selectedOption === option.id;
                            const colors = ['from-blue-600 to-blue-700', 'from-red-600 to-red-700', 'from-green-600 to-green-700'];

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => setSelectedOption(isSelected ? null : option.id)}
                                    disabled={status !== 'active'}
                                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${isSelected
                                        ? 'border-white/50 bg-white/5'
                                        : 'border-gray-800 hover:border-gray-700 bg-gray-800/50'
                                        } ${status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[idx % colors.length]} flex items-center justify-center font-bold text-white`}>
                                                {option.label.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-white">{option.label}</div>
                                                <div className="text-xs text-gray-500">
                                                    {formatNumber(option.pool)} CR pooled
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-white font-mono">
                                                x{odds.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-500">배당률</div>
                                        </div>
                                    </div>

                                    {/* 선택시 확장 */}
                                    {isSelected && (
                                        <div className="mt-4 pt-4 border-t border-gray-700 animate-fadeIn">
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="flex justify-between text-sm mb-2">
                                                        <span className="text-gray-400">베팅 금액</span>
                                                        <span className="text-white font-bold">{betAmount} CR</span>
                                                    </div>
                                                    <BetSlider
                                                        value={betAmount}
                                                        onChange={setBetAmount}
                                                        max={Math.min(userBalance, 10000)}
                                                        min={10}
                                                    />
                                                </div>

                                                <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                                                    <span className="text-sm text-gray-400">예상 수익</span>
                                                    <span className="text-lg font-bold text-green-400">
                                                        +{formatNumber(getPotentialReturn(option.pool, betAmount))} CR
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleBet();
                                                    }}
                                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                >
                                                    베팅 참여하기
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 푸터 통계 */}
                <div className="px-5 pb-5">
                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <UsersIcon />
                                <span>{analytics.totalBettors}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <ChartIcon />
                                <span>{formatNumber(market.total_pool)} CR</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs text-gray-500 hover:text-blue-400 transition-colors flex items-center gap-1"
                        >
                            {isExpanded ? 'Hide' : 'Analytics'}
                            <svg
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* 확장된 분석 영역 */}
                    {isExpanded && (
                        <div className="mt-4 space-y-4 animate-fadeIn">
                            {/* 볼륨 차트 */}
                            <div className="p-4 bg-gray-800/50 rounded-xl">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        24h Volume
                                    </span>
                                    <div className={`flex items-center gap-1 text-xs ${analytics.recentTrend === 'up' ? 'text-green-400' : analytics.recentTrend === 'down' ? 'text-red-400' : 'text-gray-400'
                                        }`}>
                                        {analytics.recentTrend === 'up' ? <TrendUpIcon /> : analytics.recentTrend === 'down' ? <TrendDownIcon /> : null}
                                        {analytics.recentTrend === 'up' ? '+12.5%' : analytics.recentTrend === 'down' ? '-8.3%' : 'Stable'}
                                    </div>
                                </div>
                                <MiniChart
                                    data={analytics.volumeHistory}
                                    color={analytics.recentTrend === 'up' ? '#10b981' : analytics.recentTrend === 'down' ? '#ef4444' : '#6b7280'}
                                />
                            </div>

                            {/* Whale Insight (PRO) */}
                            <div className={`p-4 rounded-xl border ${isPro
                                ? 'bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30'
                                : 'bg-gray-800/30 border-gray-700'
                                }`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                                            Whale Insight
                                        </span>
                                        <span className="px-1.5 py-0.5 bg-purple-500 text-white text-[9px] font-bold rounded">
                                            PRO
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {Math.round(analytics.confidence)}% confidence
                                    </div>
                                </div>

                                {isPro ? (
                                    <div className="space-y-2">
                                        {market.options.map((opt) => {
                                            const whalePercent = analytics.whaleDistribution[opt.id] || 0;
                                            return (
                                                <div key={opt.id} className="flex items-center gap-3">
                                                    <span className="w-16 text-xs text-gray-400 truncate">{opt.label}</span>
                                                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                                                            style={{ width: `${whalePercent}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-white font-mono w-12 text-right">
                                                        {Math.round(whalePercent)}%
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-2">
                                        <p className="text-xs text-gray-500 mb-2">
                                            Unlock whale betting patterns with PRO
                                        </p>
                                        <button className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors">
                                            Upgrade to PRO
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// 마켓 생성 모달
const CreateMarketModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (question: string, options: string[], deadline: string, category: FilterCategory) => void;
}> = ({ isOpen, onClose, onCreate }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [deadline, setDeadline] = useState('');
    const [category, setCategory] = useState<FilterCategory>('crypto');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!question.trim() || options.some(o => !o.trim()) || !deadline) {
            alert('모든 필드(질문, 옵션, 마감시간)를 입력해주세요.');
            return;
        }
        onCreate(question, options.filter(o => o.trim()), deadline, category);
        onClose();
        setQuestion('');
        setOptions(['', '']);
        setDeadline('');
    };

    const addOption = () => {
        if (options.length < 6) {
            setOptions([...options, '']);
        }
    };

    const removeOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg overflow-hidden animate-scaleIn">
                <div className="p-6 border-b border-gray-800">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">새 예측 시장 생성</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Question */}
                    <div>
                        <label className="text-sm font-bold text-gray-400 block mb-2">질문 (Question)</label>
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="예: 2024년 말 비트코인이 10만 달러를 돌파할까요?"
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none transition-colors"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="text-sm font-bold text-gray-400 block mb-2">카테고리</label>
                        <div className="grid grid-cols-3 gap-2">
                            {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${category === cat.id
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                        }`}
                                >
                                    {cat.icon}
                                    <span className="text-xs font-medium">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Options */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-gray-400">선택 옵션</label>
                            <button
                                onClick={addOption}
                                disabled={options.length >= 6}
                                className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                            >
                                + 옵션 추가
                            </button>
                        </div>
                        <div className="space-y-2">
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                            const newOptions = [...options];
                                            newOptions[idx] = e.target.value;
                                            setOptions(newOptions);
                                        }}
                                        placeholder={`옵션 ${idx + 1}`}
                                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 outline-none transition-colors"
                                    />
                                    {options.length > 2 && (
                                        <button
                                            onClick={() => removeOption(idx)}
                                            className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-red-600/20 text-gray-500 hover:text-red-400 flex items-center justify-center transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Deadline */}
                    <div>
                        <label className="text-sm font-bold text-gray-400 block mb-2">마감 일시 (Deadline)</label>
                        <input
                            type="datetime-local"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 outline-none transition-colors"
                        />
                    </div>
                </div>

                <div className="p-6 bg-gray-800/50 border-t border-gray-800">
                    <button
                        onClick={handleSubmit}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all hover:scale-[1.02]"
                    >
                        시장 생성하기
                    </button>
                </div>
            </div>
        </div>
    );
};

// 상세 모달
const MarketDetailModal: React.FC<{
    market: PredictionMarket | null;
    analytics: MarketAnalytics | null;
    onClose: () => void;
    onBet: (optionId: string, amount: number) => void;
    userBalance: number;
    isPro: boolean;
}> = ({ market, analytics, onClose, onBet, userBalance, isPro }) => {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [betAmount, setBetAmount] = useState(100);

    if (!market || !analytics) return null;

    const status = getMarketStatus(market);
    const timeRemaining = formatTimeRemaining(market.deadline);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-2xl my-8 overflow-hidden animate-scaleIn">
                {/* Header */}
                <div className="relative p-6 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
                                {status}
                            </span>
                        </div>
                        <span className="text-gray-600">•</span>
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <ClockIcon />
                            <span>{timeRemaining}</span>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white leading-tight">
                        {market.question}
                    </h2>

                    <div className="flex gap-4 mt-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">{formatNumber(market.total_pool)}</div>
                            <div className="text-xs text-gray-500">총 거래액 (CR)</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">{analytics.totalBettors}</div>
                            <div className="text-xs text-gray-500">참여자 수</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">{formatNumber(analytics.averageBet)}</div>
                            <div className="text-xs text-gray-500">평균 베팅 (CR)</div>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="p-6 border-b border-gray-800">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">거래량 히스토리 (24시간)</h3>
                    <div className="h-32">
                        <MiniChart data={analytics.volumeHistory} height={128} />
                    </div>
                </div>

                {/* Options */}
                <div className="p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">베팅 참여하기</h3>
                    <div className="space-y-3">
                        {market.options.map((option, idx) => {
                            const odds = option.pool > 0 ? market.total_pool / option.pool : 2.0;
                            const percent = market.total_pool > 0 ? (option.pool / market.total_pool) * 100 : 50;
                            const isSelected = selectedOption === option.id;
                            const colors = ['blue', 'red', 'green', 'yellow', 'purple'];
                            const color = colors[idx % colors.length];

                            return (
                                <div
                                    key={option.id}
                                    onClick={() => setSelectedOption(isSelected ? null : option.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                                        ? 'border-white/50 bg-white/5'
                                        : 'border-gray-800 hover:border-gray-700'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl bg-${color}-600/20 flex items-center justify-center text-${color}-400 font-bold text-lg`}>
                                                {option.label.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{option.label}</div>
                                                <div className="text-sm text-gray-500">{Math.round(percent)}% • {formatNumber(option.pool)} CR</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-white font-mono">x{odds.toFixed(2)}</div>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="mt-4 pt-4 border-t border-gray-700 space-y-4 animate-fadeIn">
                                            <div>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-gray-400">베팅 금액</span>
                                                    <span className="text-white font-bold">{betAmount} CR</span>
                                                </div>
                                                <BetSlider
                                                    value={betAmount}
                                                    onChange={setBetAmount}
                                                    max={Math.min(userBalance, 10000)}
                                                />
                                            </div>

                                            <div className="grid grid-cols-4 gap-2">
                                                {[100, 500, 1000, 5000].map(amount => (
                                                    <button
                                                        key={amount}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setBetAmount(Math.min(amount, userBalance));
                                                        }}
                                                        className="py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        {amount}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex justify-between items-center p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                                                <span className="text-green-400">예상 수익</span>
                                                <span className="text-xl font-bold text-green-400">
                                                    +{formatNumber(Math.floor(betAmount * odds))} CR
                                                </span>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onBet(option.id, betAmount);
                                                    onClose();
                                                }}
                                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all hover:scale-[1.02]"
                                            >
                                                베팅 확정
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==================== Main Component ====================
const PredictionMarketPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State
    const [markets, setMarkets] = useState<PredictionMarket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMarket, setSelectedMarket] = useState<PredictionMarket | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Filters
    const [category, setCategory] = useState<FilterCategory>('all');
    const [sortBy, setSortBy] = useState<SortOption>('trending');
    const [searchQuery, setSearchQuery] = useState('');

    // Analytics cache
    const [analyticsCache, setAnalyticsCache] = useState<Record<string, MarketAnalytics>>({});

    useEffect(() => {
        loadMarkets();
    }, []);

    const loadMarkets = async () => {
        setIsLoading(true);
        const data = await storage.getMarkets();
        setMarkets(data);

        // Generate mock analytics for each market
        const analytics: Record<string, MarketAnalytics> = {};
        data.forEach(market => {
            analytics[market.id] = generateMockAnalytics(market);
        });
        setAnalyticsCache(analytics);

        setIsLoading(false);
    };

    const handleBet = async (marketId: string, optionId: string, amount: number) => {
        if (!user) {
            alert('베팅에 참여하려면 로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        if (window.confirm(`${amount} CR을 이 예측에 베팅하시겠습니까?`)) {
            const result = await storage.placeBet(user.id, marketId, optionId, amount);
            if (result.success) {
                alert(result.message);
                loadMarkets();
            } else {
                alert(result.message);
            }
        }
    };

    const handleCreateMarket = async (question: string, options: string[], deadline: string, cat: FilterCategory) => {
        await storage.createMarket(question, options, new Date(deadline).toISOString());
        loadMarkets();
    };

    // Filtered and sorted markets
    const filteredMarkets = useMemo(() => {
        let result = [...markets];

        // Category filter
        if (category !== 'all') {
            // In real app, markets would have a category field
            // For now, we'll just show all
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(m => m.question.toLowerCase().includes(query));
        }

        // Sort
        switch (sortBy) {
            case 'trending':
                result.sort((a, b) => (analyticsCache[b.id]?.totalBettors || 0) - (analyticsCache[a.id]?.totalBettors || 0));
                break;
            case 'volume':
                result.sort((a, b) => b.total_pool - a.total_pool);
                break;
            case 'ending':
                result.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
                break;
            case 'newest':
                result.sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
                break;
        }

        return result;
    }, [markets, category, sortBy, searchQuery, analyticsCache]);

    // Stats
    const stats = useMemo(() => ({
        totalVolume: markets.reduce((sum, m) => sum + m.total_pool, 0),
        activeMarkets: markets.filter(m => getMarketStatus(m) === 'active').length,
        totalParticipants: Object.values(analyticsCache).reduce((sum, a) => sum + a.totalBettors, 0),
    }), [markets, analyticsCache]);

    const isPro = user?.membership_tier === 'pro';

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            {/* Hero Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-purple-900/10 to-transparent" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />

                <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-12">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                        <div>
                            <h1 className="text-4xl lg:text-5xl font-black mb-2">
                                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                                    예측 시장 (Alpha)
                                </span>
                            </h1>
                            <p className="text-gray-400 text-lg">
                                미래를 예측하고 정확한 분석으로 보상을 획득하세요.
                            </p>
                        </div>

                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all hover:scale-105 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            시장 생성하기
                        </button>
                    </div>

                    {/* Stats Bar */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-4 text-center">
                            <div className="text-3xl font-bold text-white mb-1">{formatNumber(stats.totalVolume)}</div>
                            <div className="text-sm text-gray-500">누적 거래액 (CR)</div>
                        </div>
                        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-4 text-center">
                            <div className="text-3xl font-bold text-green-400 mb-1">{stats.activeMarkets}</div>
                            <div className="text-sm text-gray-500">진행 중인 예측</div>
                        </div>
                        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-4 text-center">
                            <div className="text-3xl font-bold text-blue-400 mb-1">{formatNumber(stats.totalParticipants)}</div>
                            <div className="text-sm text-gray-500">총 참여자 수</div>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="예측 시장 검색 (키워드, 종목 등)..."
                                className="w-full px-5 py-3 pl-12 bg-gray-900/80 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none transition-colors"
                            />
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="px-4 py-3 bg-gray-900/80 border border-gray-800 rounded-xl text-white focus:border-blue-500 outline-none appearance-none cursor-pointer min-w-[160px]"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Categories */}
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setCategory(cat.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${category === cat.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                {cat.icon}
                                <span className="text-sm font-medium">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Markets Grid */}
            <div className="max-w-7xl mx-auto px-4 pb-20">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-80 bg-gray-900/50 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredMarkets.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                            <ChartIcon />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">검색된 마켓이 없습니다</h3>
                        <p className="text-gray-500 mb-6">첫 번째 예측 시장을 직접 만들어보세요!</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
                        >
                            시장 생성하기
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMarkets.map(market => (
                            <MarketCard
                                key={market.id}
                                market={market}
                                analytics={analyticsCache[market.id] || generateMockAnalytics(market)}
                                userBalance={user?.points || 0}
                                isPro={isPro}
                                onBet={(optionId, amount) => handleBet(market.id, optionId, amount)}
                                onViewDetails={() => setSelectedMarket(market)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateMarketModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateMarket}
            />

            <MarketDetailModal
                market={selectedMarket}
                analytics={selectedMarket ? analyticsCache[selectedMarket.id] : null}
                onClose={() => setSelectedMarket(null)}
                onBet={(optionId, amount) => {
                    if (selectedMarket) {
                        handleBet(selectedMarket.id, optionId, amount);
                    }
                }}
                userBalance={user?.points || 0}
                isPro={isPro}
            />

            {/* CSS */}
            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default PredictionMarketPage;