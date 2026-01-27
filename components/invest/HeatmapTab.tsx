import React, { useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { useInvest } from './InvestContext';
import { AssetType, MarketType } from '../../types/invest';
import { LayoutGrid, Info } from 'lucide-react';

const HeatmapTab: React.FC = () => {
    const { stocks, cryptos } = useInvest();
    const [heatmapType, setHeatmapType] = useState<AssetType>('stocks');
    const [marketFilter, setMarketFilter] = useState<MarketType | 'all'>('all');

    const chartData = useMemo(() => {
        let assets = heatmapType === 'stocks' ? stocks : cryptos;
        if (marketFilter !== 'all') {
            assets = assets.filter(a => a.market === marketFilter);
        }

        // Sort by market cap and limit for performance
        const sorted = [...assets].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0)).slice(0, 50);

        return [{
            data: sorted.map(a => ({
                x: a.name,
                y: a.marketCap || 1,
                change: a.changePercent
            }))
        }];
    }, [stocks, cryptos, heatmapType, marketFilter]);

    const chartOptions: any = {
        legend: { show: false },
        chart: {
            toolbar: { show: false },
            background: 'transparent',
            fontFamily: 'inherit'
        },
        theme: { mode: 'dark' },
        plotOptions: {
            treemap: {
                distributed: true,
                enableShades: false,
                colorScale: {
                    ranges: [
                        { from: -100, to: -3, color: '#1e3a8a' }, // Deep Blue
                        { from: -3, to: -0.1, color: '#3b82f6' }, // Blue
                        { from: -0.1, to: 0.1, color: '#475569' }, // Gray
                        { from: 0.1, to: 3, color: '#ef4444' }, // Red
                        { from: 3, to: 100, color: '#991b1b' } // Deep Red
                    ]
                }
            }
        },
        dataLabels: {
            enabled: true,
            style: { fontSize: '12px', fontWeight: 'bold' },
            formatter: (text: string, op: any) => {
                // Find matching asset to get real change percentage
                const series = op.w.config.series[0].data;
                const point = series[op.dataPointIndex];
                return `${text}\n${point.change.toFixed(2)}%`;
            }
        },
        tooltip: {
            y: {
                formatter: (val: number, { dataPointIndex, w }: any) => {
                    const point = w.config.series[0].data[dataPointIndex];
                    return `시가총액 규모: ${val.toLocaleString()} | 수익률: ${point.change.toFixed(2)}%`;
                }
            }
        },
        grid: {
            padding: {
                left: 0,
                right: 0
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <LayoutGrid className="w-6 h-6 text-blue-400" />
                        <h2 className="text-xl font-black text-white">마켓 히트맵</h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-1">
                            <button
                                onClick={() => setHeatmapType('stocks')}
                                className={`px-4 py-2 rounded-lg text-xs font-black transition ${heatmapType === 'stocks' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >주식</button>
                            <button
                                onClick={() => setHeatmapType('crypto')}
                                className={`px-4 py-2 rounded-lg text-xs font-black transition ${heatmapType === 'crypto' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >암호화폐</button>
                        </div>

                        {heatmapType === 'stocks' && (
                            <select
                                value={marketFilter}
                                onChange={(e) => setMarketFilter(e.target.value as any)}
                                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">전체 시장</option>
                                <option value="KOSPI">KOSPI</option>
                                <option value="KOSDAQ">KOSDAQ</option>
                                <option value="NASDAQ">NASDAQ</option>
                                <option value="NYSE">NYSE</option>
                            </select>
                        )}
                    </div>
                </div>

                <div className="min-h-[600px] w-full bg-slate-900/40 rounded-3xl border border-slate-700/50 p-4">
                    <Chart
                        options={chartOptions}
                        series={chartData}
                        type="treemap"
                        height={600}
                    />
                </div>

                <div className="mt-8 flex items-start gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                        히트맵 위의 각 영역 크기는 해당 종목의 <b>시가총액</b> 규모를 나타냅니다.
                        색상은 전일 대비 <b>등락률</b>을 의미하며, <span className="text-red-400 font-bold">진한 빨간색</span>은 강한 상승을,
                        <span className="text-blue-400 font-bold">진한 파란색</span>은 강한 하락을 의미합니다.
                        데이터는 상위 50개 종목을 기준으로 렌더링됩니다.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HeatmapTab;
