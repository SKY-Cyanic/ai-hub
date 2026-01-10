import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, Sword, Bug, Blocks, Zap, Star, Trophy, Lock, Coins, Play, ChevronLeft, X, Target, ShoppingCart, Tag, Clock, Users, Sparkles, Gift, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';

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

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
                {/* Featured Game - Large Hero */}
                <div
                    className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${featuredGame.bgGradient} group cursor-pointer shadow-2xl h-[500px]`}
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

                    <div className="relative z-10 h-full p-8 md:p-16 flex flex-col justify-end">
                        <div className="max-w-3xl space-y-6">
                            <div className="transform transition-transform duration-500 group-hover:translate-x-2">
                                <p className="text-amber-300 font-bold tracking-wider text-sm mb-2 uppercase drop-shadow-md">{featuredGame.subtitle}</p>
                                <h2 className="text-5xl md:text-7xl font-black tracking-tight text-white drop-shadow-2xl leading-none">{featuredGame.name}</h2>
                            </div>

                            <p className="text-white/90 text-lg md:text-xl max-w-2xl leading-relaxed drop-shadow-lg line-clamp-3">
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

                            <div className="flex items-center gap-8 pt-4">
                                <button
                                    className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-xl font-black text-white shadow-xl shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 hover:-translate-y-1 transition-all duration-300 ring-2 ring-transparent group-hover:ring-white/30"
                                    disabled={isProcessing}
                                >
                                    <Play size={28} fill="currentColor" />
                                    {featuredGame.isFree ? '무료 플레이' : `${featuredGame.price} CR`}
                                </button>

                                <div className="flex items-center gap-6 text-sm text-white/90 font-medium drop-shadow-md">
                                    <div className="flex items-center gap-2">
                                        <Star size={18} className="text-yellow-400 fill-yellow-400" />
                                        <span className="text-lg font-bold">{featuredGame.rating}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users size={18} />
                                        <span className="text-lg">{featuredGame.players}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Other Games Grid */}
                <div>
                    <h3 className="text-2xl font-black mb-8 flex items-center gap-3 border-b border-white/10 pb-4">
                        <Gift size={24} className="text-purple-400" />
                        모든 게임
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-8">
                        {otherGames.map(game => {
                            const isPurchased = purchasedGames.includes(game.id);
                            const discount = game.originalPrice ? Math.round((1 - game.price / game.originalPrice) * 100) : 0;
                            const isHovered = hoveredGame === game.id;

                            return (
                                <div
                                    key={game.id}
                                    className={`relative h-[300px] rounded-2xl overflow-hidden bg-slate-800 border border-white/5 cursor-pointer transition-all duration-500 group ${isHovered ? 'scale-[1.02] shadow-2xl ring-2 ring-white/10' : 'shadow-lg'}`}
                                    onClick={() => handlePlayGame(game)}
                                    onMouseEnter={() => setHoveredGame(game.id)}
                                    onMouseLeave={() => setHoveredGame(null)}
                                >
                                    {/* Image Background */}
                                    <div className="absolute inset-0 z-0">
                                        <img
                                            src={game.image}
                                            alt={game.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />
                                    </div>

                                    {/* Discount Badge */}
                                    {discount > 0 && (
                                        <div className="absolute top-4 right-4 z-10 px-2.5 py-1 bg-green-500 rounded-lg text-xs font-black text-black shadow-lg">
                                            -{discount}%
                                        </div>
                                    )}

                                    <div className="relative z-10 h-full p-6 flex flex-col justify-end">
                                        <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
                                            <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1 drop-shadow-md">{game.subtitle}</p>
                                            <h3 className="text-3xl font-black text-white leading-tight drop-shadow-xl mb-2">{game.name}</h3>

                                            {/* Tags */}
                                            <div className="flex flex-wrap gap-2 mb-4 opacity-80 group-hover:opacity-100 transition-opacity">
                                                {game.tags.slice(0, 3).map(tag => (
                                                    <span key={tag} className="px-2 py-1 bg-black/40 backdrop-blur-sm rounded-md text-[10px] font-bold text-white border border-white/10">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Footer: Stats & Price - Only visible on hover or bottom */}
                                        <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-auto">
                                            <div className="flex items-center gap-3 text-xs text-white/80 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                                    {game.rating}
                                                </span>
                                                <span>{game.players}</span>
                                            </div>

                                            {/* Price Tag */}
                                            <div className="flex items-center gap-2">
                                                {game.isFree || isPurchased ? (
                                                    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${isPurchased ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/20 text-white border border-white/20 backdrop-blur-sm'}`}>
                                                        {isPurchased ? '보유 중' : '무료'}
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {game.originalPrice && (
                                                            <span className="text-white/60 line-through text-xs decoration-white/60 font-medium">{game.originalPrice}</span>
                                                        )}
                                                        <span className="px-3 py-1.5 bg-amber-500 rounded-lg text-black text-sm font-black shadow-lg shadow-amber-500/20 group-hover:bg-amber-400 transition-colors">
                                                            {game.price} CR
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* Flash Effect Overlay */}
            <div className={`fixed inset-0 bg-white pointer-events-none transition-opacity duration-150 z-[100] ${isFlashing ? 'opacity-80' : 'opacity-0'}`} />

            {/* Screenshot Modal */}
            {screenshot && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-2xl">📸</span> 스크린샷 캡처
                            </h3>
                            <button onClick={() => setScreenshot(null)} className="p-2 hover:bg-white/10 rounded-lg transition">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-hidden flex items-center justify-center bg-black/50">
                            <img src={screenshot} alt="Screenshot" className="max-w-full max-h-[70vh] rounded-lg shadow-lg object-contain" />
                        </div>
                        <div className="p-4 border-t border-white/10 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = screenshot;
                                    link.download = `screenshot-${Date.now()}.png`;
                                    link.click();
                                }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold flex items-center gap-2 transition"
                            >
                                💾 저장하기
                            </button>
                            <button
                                onClick={() => {
                                    // 클립보드 복사 (이미지) - 일부 브라우저 지원 필요
                                    fetch(screenshot).then(res => res.blob()).then(blob => {
                                        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
                                            alert('클립보드에 복사되었습니다!');
                                        });
                                    });
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold flex items-center gap-2 transition"
                            >
                                📋 복사하기
                            </button>
                            {/* 게시물 공유 기능은 추후 연동 */}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GamePage;
