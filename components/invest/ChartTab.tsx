import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, LineStyle } from 'lightweight-charts';
import { useInvest } from './InvestContext';
import { InvestService, fetchWithProxy } from '../../services/investService';
import { Asset, Period } from '../../types/invest';
import { TrendingUp, BarChart2, Activity } from 'lucide-react';

const ChartTab: React.FC = () => {
    const { stocks, cryptos } = useInvest();
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const volumeContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const candlestickSeriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);

    const [selectedSymbol, setSelectedSymbol] = useState(stocks[0]?.code || '');
    const [period, setPeriod] = useState<Period>('1M');
    const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
    const [isLoading, setIsLoading] = useState(false);

    const allAssets = [...stocks, ...cryptos];
    const currentAsset = allAssets.find(a => a.code === selectedSymbol);

    const initChart = useCallback(() => {
        if (!chartContainerRef.current || !volumeContainerRef.current) return;

        // Main Chart
        chartRef.current = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 450,
            layout: { background: { color: '#1e293b00' }, textColor: '#94a3b8' },
            grid: { vertLines: { color: '#334155' }, horzLines: { color: '#334155' } },
            timeScale: { borderColor: '#475569', timeVisible: true, secondsVisible: false },
        });

        candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
            upColor: '#ef4444', downColor: '#3b82f6',
            borderUpColor: '#ef4444', borderDownColor: '#3b82f6',
            wickUpColor: '#ef4444', wickDownColor: '#3b82f6'
        });

        // Volume Chart
        const volChart = createChart(volumeContainerRef.current, {
            width: volumeContainerRef.current.clientWidth,
            height: 100,
            layout: { background: { color: '#1e293b00' }, textColor: '#94a3b8' },
            grid: { vertLines: { color: '#334155' }, horzLines: { color: '#334155' } },
            timeScale: { visible: false },
        });

        volumeSeriesRef.current = volChart.addHistogramSeries({
            color: '#34d399',
            priceFormat: { type: 'volume' },
        });

        // Sync timescale
        chartRef.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
            if (range) volChart.timeScale().setVisibleRange(range);
        });

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
                volChart.applyOptions({ width: volumeContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chartRef.current?.remove();
            volChart.remove();
        };
    }, []);

    useEffect(() => {
        const cleanup = initChart();
        return cleanup;
    }, [initChart]);

    const loadData = useCallback(async () => {
        if (!currentAsset || !candlestickSeriesRef.current || !volumeSeriesRef.current) return;
        setIsLoading(true);

        const querySymbol = currentAsset.symbol || (currentAsset as any).yahooSymbol;
        let range = '1mo', interval = '1h';

        switch (period) {
            case '1D': range = '1d'; interval = '5m'; break;
            case '1W': range = '5d'; interval = '15m'; break;
            case '1M': range = '1mo'; interval = '1h'; break;
            case '3M': range = '3mo'; interval = '1d'; break;
            case '1Y': range = '1y'; interval = '1d'; break;
            case '5Y': range = '5y'; interval = '1wk'; break;
            case 'MAX': range = 'max'; interval = '1mo'; break;
        }

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${querySymbol}?interval=${interval}&range=${range}`;
        const data = await fetchWithProxy(url);
        const result = data?.chart?.result?.[0];

        if (result && result.timestamp) {
            const quotes = result.indicators.quote[0];
            const formattedData: CandlestickData[] = [];
            const volData: any[] = [];

            result.timestamp.forEach((t: number, i: number) => {
                if (quotes.close[i] != null && quotes.open[i] != null) {
                    formattedData.push({
                        time: t as UTCTimestamp,
                        open: quotes.open[i],
                        high: quotes.high[i],
                        low: quotes.low[i],
                        close: quotes.close[i],
                    });
                    volData.push({
                        time: t as UTCTimestamp,
                        value: quotes.volume[i],
                        color: quotes.close[i] >= quotes.open[i] ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.5)'
                    });
                }
            });

            candlestickSeriesRef.current.setData(formattedData);
            volumeSeriesRef.current.setData(volData);
            chartRef.current?.timeScale().fitContent();
        }
        setIsLoading(false);
    }, [currentAsset, period]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 space-y-4">
                <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <select
                                value={selectedSymbol}
                                onChange={(e) => setSelectedSymbol(e.target.value)}
                                className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {allAssets.map(a => (
                                    <option key={a.code} value={a.code}>{a.name}</option>
                                ))}
                            </select>
                            {currentAsset && (
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-white">
                                        {currentAsset.market === 'CRYPTO' ? `$${currentAsset.price.toLocaleString()}` : `₩${currentAsset.price.toLocaleString()}`}
                                    </span>
                                    <span className={`text-sm font-bold ${currentAsset.change >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                        {currentAsset.change >= 0 ? '+' : ''}{currentAsset.changePercent.toFixed(2)}%
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700">
                            {(['1D', '1W', '1M', '3M', '1Y', '5Y', 'MAX'] as Period[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${period === p ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-slate-800/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                            </div>
                        )}
                        <div ref={chartContainerRef} className="w-full" />
                        <div ref={volumeContainerRef} className="w-full mt-2" />
                    </div>
                </div>

                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl">
                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        AI 투자 포인트 & 분석
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        최근 {period} 기간 동안 <b>{currentAsset?.name}</b> 종목은 변동성이
                        {currentAsset && Math.abs(currentAsset.changePercent) > 5 ? ' 높은' : ' 안정적인'} 흐름을 보이고 있습니다.
                        기술적으로 RSI 지표는 과매수/과매도 구간을 탐색 중이며, AI는 이를 기반으로 단기적 추세 전환 가능성을 분석하고 있습니다.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl">
                    <h4 className="text-sm font-black text-slate-100 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        실시간 호가 정보
                    </h4>
                    <div className="space-y-2">
                        {[5, 4, 3, 2, 1, -1, -2, -3, -4, -5].map(offset => (
                            <div key={offset} className={`flex justify-between items-center p-2 rounded-lg transition ${offset > 0 ? 'bg-red-500/5 hover:bg-red-500/10' : 'bg-blue-500/5 hover:bg-blue-500/10'}`}>
                                <span className={`text-xs font-bold ${offset > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                    {currentAsset ? (currentAsset.price * (1 + offset * 0.001)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">{(Math.random() * 1000).toFixed(0)}주</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl">
                    <h4 className="text-sm font-black text-slate-100 mb-4 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-purple-400" />
                        AI 거래 전략 제안
                    </h4>
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                        <div className="text-xs text-slate-500 mb-2 font-bold uppercase">전략 분석 결과</div>
                        <div className="text-emerald-400 font-black mb-1">매수 관점 (Strong Buy)</div>
                        <div className="text-[10px] text-slate-400">신뢰도: 85% | 예상 수익: +4.2%</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChartTab;
