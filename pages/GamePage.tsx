import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, Sword, Bug, Blocks, Zap, Star, Trophy, Lock, Coins, Play, ChevronLeft, X, Target, ShoppingCart, Tag, Clock, Users, Sparkles, Gift, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { GameSubmission } from '../types';
import AdBanner from '../components/AdBanner';

interface Game {
    id: string;
    name: string;
    subtitle: string;
    description: string;
    image: string;
    tags: string[];
    bgGradient: string;
    accentColor: string;
    iframeSrc: string;
    price: number;
    originalPrice?: number;
    isFree?: boolean;
    isFeatured?: boolean;
    rating: number;
    players: string;
}

const games: Game[] = [
    {
        id: 'fantasy-shooter',
        name: 'Legends of Aetheria',
        subtitle: '10 클래스 판타지 슈터',
        description: '10가지 고유 클래스와 스킬 트리를 마스터하고 무한 던전에 도전하세요. 탕탕특공대 스타일의 중독성 있는 액션 RPG!',
        image: '/images/games/fantasy-shooter.png',
        tags: ['액션', 'RPG', '로그라이크', '무료'],
        bgGradient: 'from-purple-900 via-indigo-900 to-slate-900',
        accentColor: '#a855f7',
        iframeSrc: '/games/fantasy-shooter.html',
        price: 0,
        isFree: true,
        isFeatured: true,
        rating: 4.8,
        players: '10K+'
    },
    {
        id: 'neon-blood',
        name: 'NEON BLOOD',
        subtitle: '1인칭 사이버펑크 IAI',
        description: '네온 빛 속의 사무라이가 되어라. 리듬에 맞춰 정확하게 베는 초집중 액션. 느린 시간 속 완벽한 한 수를 노려라.',
        image: '/images/games/neon-blood.png',
        tags: ['리듬', '액션', '사이버펑크', '무료'],
        bgGradient: 'from-pink-900 via-red-900 to-slate-900',
        accentColor: '#ec4899',
        iframeSrc: '/games/neon-blood.html',
        price: 0,
        isFree: true,
        rating: 4.9,
        players: '5K+'
    },
    {
        id: 'lego-build',
        name: '레고 빌더 3D',
        subtitle: '무한 창작 시뮬레이션',
        description: '상상력을 현실로! 수백 가지 블록으로 자유롭게 조립하고 저장하고 공유하세요. 3D 환경에서 나만의 걸작을 만들어보세요.',
        image: '/images/games/lego-build.png',
        tags: ['창작', '시뮬레이션', '샌드박스', '무료'],
        bgGradient: 'from-yellow-800 via-orange-900 to-slate-900',
        accentColor: '#f59e0b',
        iframeSrc: '/games/lego-build.html',
        price: 0,
        isFree: true,
        rating: 4.6,
        players: '3K+'
    },
    {
        id: 'jump-game',
        name: '점프 어드벤처',
        subtitle: '극한 플랫포머 도전',
        description: '픽셀아트의 감성과 하드코어 플랫포머의 만남. 정밀한 조작으로 수백 개의 스테이지를 클리어하세요!',
        image: '/images/games/jump-game.png',
        tags: ['플랫포머', '인디', '도전'],
        bgGradient: 'from-blue-900 via-cyan-900 to-slate-900',
        accentColor: '#06b6d4',
        iframeSrc: '/games/jump-game/index.html',
        price: 50,
        originalPrice: 100,
        rating: 4.5,
        players: '2K+'
    },
    {
        id: 'virus-lab',
        name: '바이러스 랩',
        subtitle: '전략 진화 시뮬레이션',
        description: '미시세계의 지배자가 되어라. 바이러스를 진화시키고 전 세계를 감염시키는 전략 게임. 과연 인류를 멸망시킬 수 있을까?',
        image: '/images/games/virus-lab.png',
        tags: ['전략', '시뮬레이션', '프리미엄'],
        bgGradient: 'from-green-900 via-teal-900 to-slate-900',
        accentColor: '#10b981',
        iframeSrc: '/games/virus-lab.html',
        price: 100,
        originalPrice: 200,
        rating: 4.7,
        players: '8K+'
    },
];

const GamePage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [activeGame, setActiveGame] = useState<Game | null>(null);
    const [purchasedGames, setPurchasedGames] = useState<string[]>(() => {
        const saved = localStorage.getItem('purchased_games');
        return saved ? JSON.parse(saved) : [];
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [hoveredGame, setHoveredGame] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [isFlashing, setIsFlashing] = useState(false);

    // 심사 시스템 관련 상태
    const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
    const [submissionType, setSubmissionType] = useState<'idea' | 'game'>('idea');
    const [submissionTitle, setSubmissionTitle] = useState('');
    const [submissionContent, setSubmissionContent] = useState('');
    const [submissionHtml, setSubmissionHtml] = useState('');
    const [submissions, setSubmissions] = useState<GameSubmission[]>([]);

    // 관리자 기능 - 심사 대기열 로드
    useEffect(() => {
        if (user?.is_admin) {
            const unsub = storage.subscribeGameSubmissions(setSubmissions);
            return () => unsub();
        }
    }, [user]);

    // 크레딧(포인트) 실시간 동기화 - points 필드 사용!
    const userCredits = user?.points ?? 0;

    // 구매한 게임 저장
    useEffect(() => {
        localStorage.setItem('purchased_games', JSON.stringify(purchasedGames));
    }, [purchasedGames]);

    // F2 스크린샷 단축키 (메인 창)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                handleCaptureRequest();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeGame]);

    const handleCaptureRequest = () => {
        if (activeGame && iframeRef.current) {
            // 시각적 피드백 (플래시)
            setIsFlashing(true);
            setTimeout(() => setIsFlashing(false), 150);

            // 찰칵 소리 (선택적)
            // const audio = new Audio('/sfx/camera.mp3'); audio.play().catch(() => {});

            // 게임에 캡처 요청
            iframeRef.current.contentWindow?.postMessage({ type: 'CAPTURE_REQUEST' }, '*');
        } else {
            console.log('Game not active');
        }
    };

    // 인앱 구매 및 캡처 메시지 리스너
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (!event.data) return;

            // 0. F2 키 포워딩 (iframe에서 눌렀을 때)
            if (event.data.type === 'F2_PRESSED') {
                handleCaptureRequest();
            }
            // 1. 구매 요청
            else if (event.data.type === 'PURCHASE_REQUEST' && user) {
                const { item, price, gameId } = event.data;
                if (userCredits >= price) {
                    setIsProcessing(true);
                    const success = await storage.updateUserCredits(user.id, -price, `인앱 구매: ${item}`);
                    if (success) {
                        refreshUser();
                        iframeRef.current?.contentWindow?.postMessage({
                            type: 'PURCHASE_SUCCESS',
                            item,
                            gameId
                        }, '*');
                    }
                    setIsProcessing(false);
                } else {
                    iframeRef.current?.contentWindow?.postMessage({
                        type: 'PURCHASE_FAILED',
                        reason: 'insufficient_credits'
                    }, '*');
                }
            }
            // 2. 스크린샷 수신
            else if (event.data.type === 'CAPTURE_SUCCESS') {
                setScreenshot(event.data.imageData);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user, userCredits, refreshUser, activeGame]);

    // 게임 구매/플레이
    const handlePlayGame = async (game: Game) => {
        // 무료 게임 또는 이미 구매한 게임
        if (game.isFree || purchasedGames.includes(game.id)) {
            setActiveGame(game);
            return;
        }

        // 로그인 필요
        if (!user) {
            alert('게임을 구매하려면 로그인이 필요합니다.');
            return;
        }

        // 크레딧 부족
        if (userCredits < game.price) {
            alert(`크레딧이 부족합니다.\n필요: ${game.price} CR\n보유: ${userCredits} CR`);
            return;
        }

        // 구매 확인
        const discount = game.originalPrice ? Math.round((1 - game.price / game.originalPrice) * 100) : 0;
        const msg = discount > 0
            ? `${game.name}을(를) ${game.price} CR로 구매하시겠습니까?\n(${discount}% 할인 중!)`
            : `${game.name}을(를) ${game.price} CR로 구매하시겠습니까?`;

        if (confirm(msg)) {
            setIsProcessing(true);
            try {
                const success = await storage.updateUserCredits(user.id, -game.price, `게임 구매: ${game.name}`);
                if (success) {
                    setPurchasedGames([...purchasedGames, game.id]);
                    refreshUser();
                    setActiveGame(game);
                } else {
                    alert('결제에 실패했습니다. 다시 시도해주세요.');
                }
            } catch (e) {
                alert('오류가 발생했습니다.');
            }
            setIsProcessing(false);
        }
    };

    // 게임 플레이 모드
    if (activeGame) {
        return (
            <div className="fixed inset-0 z-50 bg-black">
                <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/90 to-transparent flex justify-between items-center px-6 z-10">
                    <button
                        onClick={() => setActiveGame(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition font-medium"
                    >
                        <ChevronLeft size={18} /> 라이브러리
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="text-white/60 text-sm">플레이 중</span>
                        <h2 className="text-white font-bold">{activeGame.name}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {user && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded text-amber-300 text-sm font-bold">
                                <Coins size={14} />
                                {userCredits.toLocaleString()} CR
                            </div>
                        )}
                        <button
                            onClick={() => setActiveGame(null)}
                            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-red-600/50 transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <iframe
                    ref={iframeRef}
                    src={activeGame.iframeSrc}
                    className="w-full h-full border-0"
                    title={activeGame.name}
                    allow="fullscreen; autoplay"
                />
            </div>
        );
    }

    const featuredGame = games.find(g => g.isFeatured) || games[0];
    const otherGames = games.filter(g => g.id !== featuredGame.id);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg">
                            <Gamepad2 size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight">게임 라이브러리</h1>
                            <p className="text-xs text-white/40">{games.length}개 게임</p>
                        </div>
                    </div>
                    {user && (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-lg">
                                <Coins size={18} className="text-amber-400" />
                                <span className="font-bold text-amber-300">{userCredits.toLocaleString()}</span>
                                <span className="text-amber-400/60 text-sm">CR</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-10 overflow-x-hidden">
                {/* Featured Game - Large Hero */}
                <div
                    className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${featuredGame.bgGradient} group cursor-pointer shadow-2xl h-[280px] md:h-[500px]`}
                    onClick={() => handlePlayGame(featuredGame)}
                    onMouseEnter={() => setHoveredGame(featuredGame.id)}
                    onMouseLeave={() => setHoveredGame(null)}
                >
                    {/* Hero Image Background */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src={featuredGame.image}
                            alt={featuredGame.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-r ${featuredGame.bgGradient} opacity-60 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-40`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                    </div>

                    {/* Featured Badge */}
                    <div className="absolute top-6 left-6 z-10 flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-xs font-black text-black shadow-lg shadow-amber-500/20">
                        <Sparkles size={12} />
                        추천 게임
                    </div>

                    <div className="relative z-10 h-full p-6 md:p-16 flex flex-col justify-end">
                        <div className="max-w-3xl space-y-4 md:space-y-6">
                            <div className="transform transition-transform duration-500 group-hover:translate-x-2">
                                <p className="text-amber-300 font-bold tracking-wider text-xs md:text-sm mb-1 md:mb-2 uppercase drop-shadow-md">{featuredGame.subtitle}</p>
                                <h2 className="text-3xl md:text-7xl font-black tracking-tight text-white drop-shadow-2xl leading-tight md:leading-none">{featuredGame.name}</h2>
                            </div>

                            <p className="text-white/80 text-sm md:text-xl max-w-2xl leading-relaxed drop-shadow-lg line-clamp-2 md:line-clamp-3">
                                {featuredGame.description}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                                {featuredGame.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold text-white shadow-sm">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center gap-4 md:gap-8 pt-2 md:pt-4">
                                <button
                                    className="inline-flex items-center gap-2 md:gap-3 px-6 py-2.5 md:px-10 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg md:rounded-xl text-base md:text-xl font-black text-white shadow-xl shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 hover:-translate-y-1 transition-all duration-300 ring-2 ring-transparent group-hover:ring-white/30"
                                    onClick={(e) => { e.stopPropagation(); handlePlayGame(featuredGame); }}
                                    disabled={isProcessing}
                                >
                                    <Play size={20} fill="currentColor" className="md:w-7 md:h-7" />
                                    {featuredGame.isFree ? '무료 플레이' : `${featuredGame.price} CR`}
                                </button>

                                <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-white/90 font-medium drop-shadow-md">
                                    <div className="flex items-center gap-1.5 md:gap-2">
                                        <Star size={14} className="text-yellow-400 fill-yellow-400 md:w-[18px] md:h-[18px]" />
                                        <span className="text-sm md:text-lg font-bold">{featuredGame.rating}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 md:gap-2">
                                        <Users size={14} className="md:w-[18px] md:h-[18px]" />
                                        <span className="text-sm md:text-lg">{featuredGame.players}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Game Submission / Admin Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition-all cursor-pointer"
                        onClick={() => { setSubmissionType('idea'); setIsSubmissionModalOpen(true); }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-white">게임 아이디어 제안</h4>
                                <p className="text-xs text-white/50">새로운 게임에 대한 영감을 공유하세요</p>
                            </div>
                        </div>
                        <ChevronLeft className="rotate-180 text-white/20 group-hover:text-purple-400 transition-colors" />
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all cursor-pointer"
                        onClick={() => { setSubmissionType('game'); setIsSubmissionModalOpen(true); }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-white">직접 만든 게임 올리기</h4>
                                <p className="text-xs text-white/50">HTML/JS 게임을 업로드하고 심사받으세요</p>
                            </div>
                        </div>
                        <ChevronLeft className="rotate-180 text-white/20 group-hover:text-blue-400 transition-colors" />
                    </div>
                </div>

                {/* Admin Review Queue */}
                {user?.is_admin && submissions.filter(s => s.status === 'pending').length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-black flex items-center gap-2 text-amber-400">
                            <Bug size={20} /> 심사 대기열 ({submissions.filter(s => s.status === 'pending').length})
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {submissions.filter(s => s.status === 'pending').map(sub => (
                                <div key={sub.id} className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-lg shadow-amber-500/5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-2 inline-block ${sub.type === 'game' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                {sub.type === 'game' ? 'HTML 게임' : '아이디어'}
                                            </span>
                                            <h4 className="text-xl font-bold text-white">{sub.title}</h4>
                                            <p className="text-sm text-white/40">작성자: {sub.submitter_name} • {new Date(sub.created_at).toLocaleString()}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => storage.updateGameSubmissionStatus(sub.id, 'rejected', prompt('거절 사유를 입력하세요:') || '')}
                                                className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition font-bold"
                                            >거절</button>
                                            <button
                                                onClick={() => storage.updateGameSubmissionStatus(sub.id, 'approved')}
                                                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition font-bold"
                                            >승인</button>
                                        </div>
                                    </div>
                                    <p className="text-white/80 whitespace-pre-wrap mb-4">{sub.description}</p>
                                    {sub.html_content && (
                                        <div className="bg-black/50 p-4 rounded-xl border border-white/10 font-mono text-xs text-white/60 overflow-x-auto">
                                            <code className="whitespace-pre">{sub.html_content.slice(0, 500)}...</code>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Other Games Grid */}
                <div>
                    <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-8 flex items-center gap-3 border-b border-white/10 pb-4">
                        <Gift size={20} className="text-purple-400" />
                        모든 게임
                    </h3>
                    {/* Mobile: 가로 스크롤, PC: 그리드 */}
                    <div className="md:hidden overflow-x-auto pb-4 -mx-6 px-6">
                        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                            {otherGames.map(game => {
                                const isPurchased = purchasedGames.includes(game.id);
                                const discount = game.originalPrice ? Math.round((1 - game.price / game.originalPrice) * 100) : 0;
                                return (
                                    <div
                                        key={game.id}
                                        onClick={() => handlePlayGame(game)}
                                        className="flex-shrink-0 w-32 cursor-pointer group"
                                    >
                                        <div className="relative rounded-lg overflow-hidden mb-2">
                                            <img src={game.image} alt={game.name} className="w-32 h-44 object-cover" />
                                            {discount > 0 && (
                                                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-green-500 rounded text-[10px] font-black text-black">
                                                    -{discount}%
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-white truncate">{game.name}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            {game.isFree || isPurchased ? (
                                                <span className={`text-xs font-bold ${isPurchased ? 'text-indigo-400' : 'text-green-400'}`}>
                                                    {isPurchased ? '보유' : '무료'}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-amber-400">{game.price} CR</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* PC: 그리드 */}
                    <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {otherGames.map(game => {
                            const isPurchased = purchasedGames.includes(game.id);
                            const discount = game.originalPrice ? Math.round((1 - game.price / game.originalPrice) * 100) : 0;
                            const isHovered = hoveredGame === game.id;

                            return (
                                <div
                                    key={game.id}
                                    className={`relative rounded-lg overflow-hidden bg-slate-800 border border-white/5 cursor-pointer transition-all duration-300 group
                                        ${isHovered ? 'scale-[1.02] shadow-xl ring-1 ring-white/20' : 'shadow-lg hover:bg-slate-700/50'}`}
                                    onClick={() => handlePlayGame(game)}
                                    onMouseEnter={() => setHoveredGame(game.id)}
                                    onMouseLeave={() => setHoveredGame(null)}
                                >
                                    {/* Steam 스타일 세로형 카드 */}
                                    <div className="relative">
                                        <img
                                            src={game.image}
                                            alt={game.name}
                                            className="w-full h-44 object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        {discount > 0 && (
                                            <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 rounded text-xs font-black text-black">
                                                -{discount}%
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 bg-slate-800/80">
                                        <p className="text-sm font-bold text-white truncate mb-1">{game.name}</p>
                                        <p className="text-xs text-white/50 mb-2">{game.subtitle}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs text-white/60">
                                                <span className="flex items-center gap-1">
                                                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                                                    {game.rating}
                                                </span>
                                            </div>
                                            {game.isFree || isPurchased ? (
                                                <span className={`text-xs font-bold ${isPurchased ? 'text-indigo-400' : 'text-green-400'}`}>
                                                    {isPurchased ? '보유 중' : '무료'}
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    {game.originalPrice && (
                                                        <span className="text-xs text-white/40 line-through">{game.originalPrice}</span>
                                                    )}
                                                    <span className="px-2 py-0.5 bg-amber-500 rounded text-xs font-bold text-black">
                                                        {game.price} CR
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* 게임 목록 하단 광고 */}
                    <div className="mt-8">
                        <AdBanner slot="game" />
                    </div>
                </div>
            </div>
            {/* Flash Effect Overlay */}
            <div className={`fixed inset-0 bg-white pointer-events-none transition-opacity duration-150 z-[100] ${isFlashing ? 'opacity-80' : 'opacity-0'}`} />

            {/* Submission Modal */}
            {isSubmissionModalOpen && (
                <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`h-2 bg-gradient-to-r ${submissionType === 'game' ? 'from-blue-500 to-cyan-500' : 'from-purple-500 to-pink-500'}`} />
                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-black text-white">
                                        {submissionType === 'game' ? '🎮 게임 업로드 (HTML)' : '💡 게임 아이디어 제안'}
                                    </h3>
                                    <p className="text-white/50">{submissionType === 'game' ? 'HTML 형식의 게임을 제출하세요. 심사 후 등록됩니다.' : '멋진 게임 아이디어를 들려주세요.'}</p>
                                </div>
                                <button onClick={() => setIsSubmissionModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-white/70">제목</label>
                                    <input
                                        type="text"
                                        value={submissionTitle}
                                        onChange={(e) => setSubmissionTitle(e.target.value)}
                                        placeholder="게임 또는 아이디어의 제목"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-white/70">설명</label>
                                    <textarea
                                        value={submissionContent}
                                        onChange={(e) => setSubmissionContent(e.target.value)}
                                        placeholder="자세한 설명을 작성해주세요..."
                                        rows={4}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                {submissionType === 'game' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-white/70 text-blue-400">HTML 소스 (단일 파일 권장)</label>
                                        <textarea
                                            value={submissionHtml}
                                            onChange={(e) => setSubmissionHtml(e.target.value)}
                                            placeholder="<!DOCTYPE html>... 코드를 붙여넣으세요"
                                            rows={8}
                                            className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={async () => {
                                    if (!submissionTitle || !submissionContent) return alert('제목과 내용을 입력해주세요.');
                                    if (submissionType === 'game' && !submissionHtml) return alert('HTML 소스를 입력해주세요.');

                                    const res = await storage.submitGameSubmission({
                                        submitter_id: user?.id || 'unknown',
                                        submitter_name: user?.nickname || 'Guest',
                                        type: submissionType,
                                        title: submissionTitle,
                                        description: submissionContent,
                                        html_content: submissionType === 'game' ? submissionHtml : undefined
                                    });

                                    if (res) {
                                        alert('제출되었습니다! 관리자 심사를 기다려주세요.');
                                        setSubmissionTitle('');
                                        setSubmissionContent('');
                                        setSubmissionHtml('');
                                        setIsSubmissionModalOpen(false);
                                    }
                                }}
                                className={`w-full py-4 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 ${submissionType === 'game' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-purple-600 hover:bg-purple-500'}`}
                            >
                                제출하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default GamePage;
