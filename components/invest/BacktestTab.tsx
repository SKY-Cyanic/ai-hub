import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createChart } from 'lightweight-charts';
import { useInvest } from './InvestContext';
import { fetchWithProxy, calculateSMA } from '../../services/investService';
import { Beaker, Play, History, TrendingUp, TrendingDown, LayoutPanelLeft, FileText, RefreshCw } from 'lucide-react';

const BacktestTab: React.FC = () => {
    const { stocks, cryptos } = useInvest();
    const allAssets = [...stocks, ...cryptos];

    const [selectedSymbol, setSelectedSymbol] = useState(stocks[0]?.code || 'AAPL');
    const [initialCapital, setInitialCapital] = useState(10000000);
    const [maShort, setMaShort] = useState(20);
    const [maLong, setMaLong] = useState(60);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<any>(null);

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);

    const runBacktest = useCallback(async () => {
        setIsLoading(true);
        const asset = allAssets.find(a => a.code === selectedSymbol);
        if (!asset) return;

        try {
            const querySymbol = asset.symbol || (asset as any).yahooSymbol;
            const data = await fetchWithProxy(`https://query1.finance.yahoo.com/v8/finance/chart/${querySymbol}?interval=1d&range=2y`);
            const result = data?.chart?.result?.[0];

            if (!result || !result.timestamp) throw new Error('데이터 로드 실패');

            const quotes = result.indicators.quote[0];
            const prices = result.timestamp.map((t: number, i: number) => ({
                time: t,
                close: quotes.close[i]
            })).filter((d: any) => d.close != null);

            if (prices.length < maLong + 10) throw new Error('시뮬레이션 데이터 부족');

            const smaShort = calculateSMA(prices, maShort);
            const smaLong = calculateSMA(prices, maLong);

            let cash = initialCapital;
            let held = 0;
            let trades: any[] = [];
            let equity: any[] = [];

            for (let i = 0; i < prices.length; i++) {
                const current = prices[i];
                const s = smaShort[i];
                const l = smaLong[i];
                const prevS = smaShort[i - 1];
                const prevL = smaLong[i - 1];

                if (prevS && prevL) {
                    // Golden Cross
                    if (prevS <= prevL && s > l && held === 0) {
                        held = cash / current.close;
                        cash = 0;
                        trades.push({ type: 'buy', time: current.time, price: current.close });
                    }
                    // Dead Cross
                    else if (prevS >= prevL && s < l && held > 0) {
                        cash = held * current.close;
                        held = 0;
                        trades.push({ type: 'sell', time: current.time, price: current.close });
                    }
                }
                equity.push({ time: current.time, value: cash + (held * current.close) });
            }

            const finalAsset = cash + (held * prices[prices.length - 1].close);
            const totalReturn = ((finalAsset - initialCapital) / initialCapital) * 100;
            const winCount = trades.filter((t, i) => t.type === 'sell' && t.price > trades[i - 1]?.price).length;
            const winRate = Math.floor(trades.length / 2) > 0 ? (winCount / Math.floor(trades.length / 2)) * 100 : 0;

            setResults({ totalReturn, finalAsset, trades, winRate, prices, smaShort, smaLong, equity });

            // Render Chart
            setTimeout(() => renderChart(prices, smaShort, smaLong, trades, equity), 0);
        } catch (e: any) {
            alert(e.message);
        }
        setIsLoading(false);
    }, [selectedSymbol, initialCapital, maShort, maLong, allAssets]);

    const renderChart = (prices: any[], smaShort: number[], smaLong: number[], trades: any[], equity: any[]) => {
        if (!chartContainerRef.current) return;
        chartContainerRef.current.innerHTML = '';

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 400,
            layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
            grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
            timeScale: { borderColor: '#334155' },
            rightPriceScale: { borderColor: '#334155' }
        }) as any;

        const priceSeries = chart.addLineSeries({ color: '#64748b', lineWidth: 1, title: '가격' });
        priceSeries.setData(prices.map(d => ({ time: d.time, value: d.close })));

        const sSeries = chart.addLineSeries({ color: '#f59e0b', lineWidth: 2, title: '단기 이평선' });
        sSeries.setData(prices.map((d, i) => ({ time: d.time, value: smaShort[i] })).filter(d => !isNaN(d.value)));

        const lSeries = chart.addLineSeries({ color: '#3b82f6', lineWidth: 2, title: '장기 이평선' });
        lSeries.setData(prices.map((d, i) => ({ time: d.time, value: smaLong[i] })).filter(d => !isNaN(d.value)));

        const equitySeries = chart.addAreaSeries({
            topColor: 'rgba(16, 185, 129, 0.4)',
            bottomColor: 'rgba(16, 185, 129, 0.0)',
            lineColor: '#10b981', lineWidth: 2, title: '자산 가치',
            priceScaleId: 'left'
        });
        chart.priceScale('left').applyOptions({ visible: true, borderVisible: false });
        equitySeries.setData(equity.map(d => ({ time: d.time, value: d.value })));

        const markers = trades.map(t => ({
            time: t.time,
            position: t.type === 'buy' ? 'belowBar' : 'aboveBar',
            color: t.type === 'buy' ? '#ef4444' : '#3b82f6',
            shape: t.type === 'buy' ? 'arrowUp' : 'arrowDown',
            text: t.type === 'buy' ? 'B' : 'S'
        }));
        priceSeries.setMarkers(markers);

        chart.timeScale().fitContent();
        chartRef.current = chart;
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                    <Beaker className="w-8 h-8 text-indigo-400" />
                    <div>
                        <h2 className="text-2xl font-black text-white">전략 백테스팅 시뮬레이터</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">전략 가상 검증기</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">테스트 종목</label>
                        <select
                            value={selectedSymbol}
                            onChange={(e) => setSelectedSymbol(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {allAssets.map(a => <option key={a.code} value={a.code}>{a.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">단기 MA</label>
                        <input
                            type="number" value={maShort} onChange={(e) => setMaShort(parseInt(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">장기 MA</label>
                        <input
                            type="number" value={maLong} onChange={(e) => setMaLong(parseInt(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={runBacktest}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-black shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                        시뮬레이션 실행
                    </button>
                </div>
            </div>

            {results && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-sm font-black text-slate-100 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    전략 퍼포먼스 차트
                                </h4>
                                <div className="flex items-center gap-4 text-xs">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> 이평선{maShort}</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> 이평선{maLong}</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> 자산 가치</span>
                                </div>
                            </div>
                            <div ref={chartContainerRef} className="rounded-2xl border border-slate-700/50 overflow-hidden" />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl">
                            <h4 className="text-sm font-black text-slate-100 mb-6 flex items-center gap-2">
                                <LayoutPanelLeft className="w-4 h-4 text-blue-400" />
                                분석 요약
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">총 수익률</div>
                                    <div className={`text-2xl font-black font-mono ${results.totalReturn >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                        {results.totalReturn >= 0 ? '+' : ''}{results.totalReturn.toFixed(2)}%
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">최종 자산</div>
                                    <div className="text-xl font-black text-white font-mono">₩{results.finalAsset.toLocaleString()}</div>
                                </div>
                                <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">매매 횟수</div>
                                    <div className="text-2xl font-black text-indigo-400 font-mono">{results.trades.length}회</div>
                                </div>
                                <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">전략 승률</div>
                                    <div className="text-2xl font-black text-amber-400 font-mono">{results.winRate.toFixed(1)}%</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl max-h-[400px] flex flex-col">
                            <h4 className="text-sm font-black text-slate-100 mb-6 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-purple-400" />
                                매매 로그 (Recent 10)
                            </h4>
                            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1">
                                {results.trades.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 text-xs italic">매매 기록이 없습니다.</div>
                                ) : (
                                    [...results.trades].reverse().slice(0, 10).map((t, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-slate-900/30 rounded-xl border border-slate-700/50">
                                            <div className="text-xs text-slate-500 font-mono">{new Date(t.time * 1000).toLocaleDateString()}</div>
                                            <div className={`font-black text-xs ${t.type === 'buy' ? 'text-red-400' : 'text-blue-400'}`}>
                                                {t.type === 'buy' ? '매수' : '매도'}
                                            </div>
                                            <div className="text-xs text-white font-black font-mono">₩{t.price.toLocaleString()}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BacktestTab;
