import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { fetchWithProxy } from '../../services/investService';
import { useInvest } from './InvestContext';
import { Trophy, Play, SkipForward, Pause, RefreshCw, History, Calendar } from 'lucide-react';

const SCENARIOS = [
    { id: 'random', name: '랜덤 시점', icon: '🎲', desc: '과거의 임의의 시점으로 이동합니다.' },
    { id: 'covid', name: '코로나 대폭락', icon: '🦠', date: '2020-01-01', desc: '2020년 3월 팬데믹 공포의 한복판' },
    { id: 'gme', name: '게임스톱 숏스퀴즈', icon: '🎮', date: '2021-01-01', desc: '개미들의 반란, 기록적인 변동성' },
    { id: 'financial2008', name: '리먼 브라더스 사태', icon: '🏦', date: '2008-09-01', desc: '금융 위기의 시작점' },
    { id: 'ai2023', name: 'AI 랠리의 시작', icon: '🤖', date: '2023-01-01', desc: '생성형 AI 광풍이 시작된 2023년' },
];

const GameTab: React.FC = () => {
    const { stocks } = useInvest();
    const [gameState, setGameState] = useState<'selection' | 'playing' | 'result'>('selection');
    const [selectedScenario, setSelectedScenario] = useState('random');
    const [selectedSymbol, setSelectedSymbol] = useState(stocks[0]?.code || 'AAPL');

    // Game Data
    const [gameData, setGameData] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [cash, setCash] = useState(10000000); // 10M KRW
    const [held, setHeld] = useState(0);
    const [isAuto, setIsAuto] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const autoIntervalRef = useRef<any>(null);

    const exchangeRate = selectedSymbol.includes('.KS') ? 1 : 1380;

    const startGame = async () => {
        setIsLoading(true);
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${selectedSymbol}?interval=1d&range=10y`;
            const data = await fetchWithProxy(url);
            const result = data?.chart?.result?.[0];

            if (!result?.timestamp) throw new Error('데이터를 불러올 수 없습니다.');

            const quotes = result.indicators.quote[0];
            const processed = result.timestamp.map((t: number, i: number) => ({
                time: t as UTCTimestamp,
                open: quotes.open[i],
                high: quotes.high[i],
                low: quotes.low[i],
                close: quotes.close[i]
            })).filter((d: any) => d.close != null);

            if (processed.length < 200) throw new Error('시뮬레이션을 위한 데이터가 부족합니다.');

            let startIndex = 0;
            const scenario = SCENARIOS.find(s => s.id === selectedScenario);

            if (selectedScenario === 'random') {
                startIndex = Math.floor(Math.random() * (processed.length - 250)) + 50;
            } else if (scenario?.date) {
                const targetTime = new Date(scenario.date).getTime() / 1000;
                startIndex = processed.findIndex((d: any) => d.time >= targetTime);
                if (startIndex === -1 || startIndex < 50) startIndex = 50;
            }

            setGameData(processed);
            setCurrentIndex(startIndex);
            setCash(10000000);
            setHeld(0);
            setGameState('playing');
        } catch (e: any) {
            alert(e.message);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (gameState === 'playing' && chartContainerRef.current) {
            chartRef.current = createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth,
                height: 400,
                layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
                grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
                timeScale: { borderColor: '#334155' },
                rightPriceScale: { borderColor: '#334155' }
            });

            if (!chartRef.current) return;
            seriesRef.current = chartRef.current.addCandlestickSeries({
                upColor: '#ef4444', downColor: '#3b82f6',
                borderUpColor: '#ef4444', borderDownColor: '#3b82f6',
                wickUpColor: '#ef4444', wickDownColor: '#3b82f6'
            });

            const initialSlice = gameData.slice(Math.max(0, currentIndex - 100), currentIndex + 1);
            seriesRef.current.setData(initialSlice);
            chartRef.current.timeScale().fitContent();

            return () => {
                chartRef.current?.remove();
                if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
            };
        }
    }, [gameState, gameData]);

    const performAction = (action: 'buy' | 'sell' | 'next') => {
        const currentData = gameData[currentIndex];
        const price = currentData.close;
        const priceKRW = price * exchangeRate;

        if (action === 'buy') {
            const qty = Math.floor(cash / priceKRW);
            if (qty > 0) {
                setHeld(prev => prev + qty);
                setCash(prev => prev - qty * priceKRW);
            }
        } else if (action === 'sell') {
            if (held > 0) {
                setCash(prev => prev + held * priceKRW);
                setHeld(0);
            }
        }

        if (currentIndex >= gameData.length - 1) {
            setGameState('result');
            setIsAuto(false);
            return;
        }

        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        seriesRef.current?.update(gameData[nextIndex]);
    };

    useEffect(() => {
        if (isAuto) {
            autoIntervalRef.current = setInterval(() => performAction('next'), 300);
        } else {
            if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
        }
        return () => {
            if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
        };
    }, [isAuto, currentIndex]);

    const currentPrice = gameData[currentIndex]?.close || 0;
    const totalAsset = cash + (held * currentPrice * exchangeRate);
    const profitRate = ((totalAsset - 10000000) / 10000000) * 100;

    if (gameState === 'selection') {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
                <div className="text-center space-y-4">
                    <h2 className="text-4xl font-black text-white tracking-widest uppercase">투자 챌린지</h2>
                    <p className="text-slate-400">과거의 특정 시점으로 돌아가 당신의 투자 실력을 증명하세요.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SCENARIOS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedScenario(s.id)}
                            className={`p-6 rounded-3xl border-2 transition-all text-left space-y-3 group ${selectedScenario === s.id
                                ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)]'
                                : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                                }`}
                        >
                            <div className="text-3xl">{s.icon}</div>
                            <div>
                                <h3 className="font-black text-white group-hover:text-blue-400 transition-colors">{s.name}</h3>
                                {s.date && <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.date}</div>}
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                        </button>
                    ))}
                </div>

                <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 space-y-6 shadow-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">종목 선택</label>
                            <select
                                value={selectedSymbol}
                                onChange={(e) => setSelectedSymbol(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {stocks.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col justify-end">
                            <button
                                onClick={startGame}
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3 rounded-xl shadow-xl transition-all transform hover:-translate-y-1 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                                챌린지 시작
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (gameState === 'result') {
        return (
            <div className="max-w-2xl mx-auto bg-slate-800 rounded-3xl border border-slate-700 p-12 text-center space-y-8 shadow-2xl animate-shake">
                <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-yellow-500/50">
                    <Trophy className="w-12 h-12 text-yellow-500" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">챌린지 종료</h2>
                    <p className="text-slate-400">당신의 최종 투자 결과입니다.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                        <div className="text-xs text-slate-500 font-bold uppercase mb-2">최종 자산</div>
                        <div className="text-2xl font-black text-white font-mono">₩{totalAsset.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                        <div className="text-xs text-slate-500 font-bold uppercase mb-2">누적 수익률</div>
                        <div className={`text-2xl font-black font-mono ${profitRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                            {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setGameState('selection')}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                    <RefreshCw className="w-5 h-5" />
                    다시 도전하기
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fadeIn">
            <div className="lg:col-span-3 space-y-4">
                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-2xl overflow-hidden relative">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                                <Calendar className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">현재 시점</div>
                                <div className="text-lg font-black text-white font-mono">
                                    {new Date(gameData[currentIndex].time * 1000).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-900 rounded-2xl border border-slate-700 flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">총 자산</div>
                                <div className="text-lg font-black text-emerald-400 font-mono">₩{totalAsset.toLocaleString()}</div>
                            </div>
                            <div className={`text-xl font-black font-mono ${profitRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
                            </div>
                        </div>
                    </div>

                    <div ref={chartContainerRef} className="w-full border border-slate-700/50 rounded-2xl overflow-hidden" />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <button
                            onClick={() => performAction('buy')}
                            className="bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl shadow-lg transition-all transform active:scale-95"
                        >풀매수</button>
                        <button
                            onClick={() => performAction('sell')}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg transition-all transform active:scale-95"
                        >풀매도</button>
                        <button
                            onClick={() => performAction('next')}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                        >
                            <SkipForward className="w-5 h-5" />
                            다음 날
                        </button>
                        <button
                            onClick={() => setIsAuto(!isAuto)}
                            className={`font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 ${isAuto ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-700 text-white hover:bg-slate-600'
                                }`}
                        >
                            {isAuto ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            {isAuto ? '정지' : '자동진행'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-400" />
                        게임 정보
                    </h4>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700">
                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">시나리오</div>
                            <div className="text-white font-black">{SCENARIOS.find(s => s.id === selectedScenario)?.name}</div>
                        </div>
                        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700">
                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">보유 수량</div>
                            <div className="text-white font-black">{held.toLocaleString()}주</div>
                        </div>
                        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700">
                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">가용 현금</div>
                            <div className="text-emerald-400 font-black">₩{cash.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameTab;
