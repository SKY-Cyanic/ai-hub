import React, { useMemo } from 'react';
import { useInvest } from './InvestContext';

const PortfolioTab: React.FC = () => {
    const { cash, portfolio, stocks, cryptos } = useInvest();

    const portfolioStats = useMemo(() => {
        let totalStockValue = 0;
        let totalProfit = 0;
        const details = Object.values(portfolio).map(item => {
            const asset = [...stocks, ...cryptos].find(a => a.code === item.symbol);
            if (!asset) return null;

            const currentVal = asset.price * item.quantity;
            const buyVal = item.avgPrice * item.quantity;
            const profit = currentVal - buyVal;
            const profitRate = (profit / buyVal) * 100;

            totalStockValue += currentVal;
            totalProfit += profit;

            return {
                ...item,
                currentPrice: asset.price,
                currentVal,
                profit,
                profitRate
            };
        }).filter(Boolean);

        const totalAsset = cash + totalStockValue;
        const totalProfitRate = ((totalAsset - 100000000) / 100000000) * 100;

        return {
            totalStockValue,
            totalProfit,
            totalAsset,
            totalProfitRate,
            details
        };
    }, [cash, portfolio, stocks, cryptos]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 bg-gradient-to-br from-emerald-900/20 to-transparent">
                    <p className="text-emerald-400 text-xs font-bold mb-1 uppercase tracking-wider">💵 보유 현금</p>
                    <p className="text-2xl font-black text-white font-mono">₩{cash.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 bg-gradient-to-br from-blue-900/20 to-transparent">
                    <p className="text-blue-400 text-xs font-bold mb-1 uppercase tracking-wider">📊 평가금액</p>
                    <p className="text-2xl font-black text-white font-mono">₩{portfolioStats.totalStockValue.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 bg-gradient-to-br from-amber-900/20 to-transparent">
                    <p className="text-amber-400 text-xs font-bold mb-1 uppercase tracking-wider">💰 총 자산</p>
                    <p className="text-2xl font-black text-white font-mono">₩{portfolioStats.totalAsset.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 bg-gradient-to-br from-purple-900/20 to-transparent">
                    <p className="text-purple-400 text-xs font-bold mb-1 uppercase tracking-wider">📈 총 수익</p>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-2xl font-black font-mono ${portfolioStats.totalProfit >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                            ₩{portfolioStats.totalProfit.toLocaleString()}
                        </p>
                        <p className={`text-lg font-bold ${portfolioStats.totalProfitRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                            ({portfolioStats.totalProfitRate >= 0 ? '+' : ''}{portfolioStats.totalProfitRate.toFixed(2)}%)
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <h3 className="font-bold text-slate-100">💹 보유 종목 상세</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/80 border-b border-slate-700">
                            <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4 text-left">종목</th>
                                <th className="px-4 py-4 text-right">보유수량</th>
                                <th className="px-4 py-4 text-right">평균단가</th>
                                <th className="px-4 py-4 text-right">현재가</th>
                                <th className="px-4 py-4 text-right">평가금액</th>
                                <th className="px-6 py-4 text-right">평가손익</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {portfolioStats.details.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                        보유 종목이 없습니다. 시장 탭에서 종목을 매수해 보세요.
                                    </td>
                                </tr>
                            ) : (
                                portfolioStats.details.map((item: any) => (
                                    <tr key={item.symbol} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-100">{item.name}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">{item.symbol}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-slate-300">
                                            {item.quantity.toLocaleString()}주
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-slate-400">
                                            ₩{item.avgPrice.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-white">
                                            ₩{item.currentPrice.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-white font-bold">
                                            ₩{item.currentVal.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-sm font-black ${item.profit >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                    {item.profit >= 0 ? '+' : ''}₩{item.profit.toLocaleString()}
                                                </span>
                                                <span className={`text-[10px] font-bold ${item.profitRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                    {item.profitRate >= 0 ? '+' : ''}{item.profitRate.toFixed(2)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PortfolioTab;
