
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { PredictionMarket, Bet } from '../types';
import { useNavigate } from 'react-router-dom';

const PredictionMarketPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [markets, setMarkets] = useState<PredictionMarket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMarket, setSelectedMarket] = useState<PredictionMarket | null>(null);
    const [betAmount, setBetAmount] = useState(100);

    useEffect(() => {
        loadMarkets();
    }, []);

    const loadMarkets = async () => {
        setIsLoading(true);
        const data = await storage.getMarkets();
        setMarkets(data);
        setIsLoading(false);
    };

    const handleBet = async (marketId: string, optionId: string) => {
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        if (window.confirm(`${betAmount} CR을 베팅하시겠습니까?`)) {
            const result = await storage.placeBet(user.id, marketId, optionId, betAmount);
            if (result.success) {
                alert(result.message);
                loadMarkets(); // Refresh
            } else {
                alert(result.message);
            }
        }
    };

    const createMockMarket = async () => {
        if (!user?.is_admin) return;
        const q = prompt("예측 주제 입력");
        if (!q) return;
        await storage.createMarket(q, ["YES", "NO"], new Date(Date.now() + 86400000).toISOString());
        loadMarkets();
    };

    return (
        <div className="max-w-6xl mx-auto p-4">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text mb-2">
                        🔮 Prediction Market
                    </h1>
                    <p className="text-gray-400">미래를 예측하고 CR을 획득하세요. 집단 지성의 힘을 믿으세요.</p>
                </div>
                {user?.is_admin && (
                    <button onClick={createMockMarket} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">
                        + 마켓 생성 (Admin)
                    </button>
                )}
            </header>

            {isLoading ? (
                <div className="text-center py-20 text-gray-500">로딩 중...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {markets.map(market => (
                        <div key={market.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500 transition-colors">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs font-bold px-2 py-1 bg-blue-900/50 text-blue-300 rounded">
                                        진행중
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        마감: {new Date(market.deadline).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-6 h-14 line-clamp-2">
                                    {market.question}
                                </h3>

                                <div className="space-y-3 mb-6">
                                    {market.options.map(opt => {
                                        const odds = opt.pool > 0 ? (market.total_pool / opt.pool).toFixed(2) : '2.00';
                                        const percent = market.total_pool > 0 ? Math.round((opt.pool / market.total_pool) * 100) : 0;

                                        return (
                                            <div key={opt.id} className="group cursor-pointer" onClick={() => handleBet(market.id, opt.id)}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-bold text-gray-300 group-hover:text-white transition-colors">
                                                        {opt.label}
                                                    </span>
                                                    <span className="text-blue-400 font-mono">x{odds}</span>
                                                </div>
                                                <div className="h-10 bg-gray-900 rounded-lg relative overflow-hidden border border-gray-700 group-hover:border-blue-500 transition-colors">
                                                    <div
                                                        className="absolute top-0 left-0 h-full bg-blue-600/20 transition-all duration-500"
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 font-bold group-hover:text-white">
                                                        베팅하기
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-gray-700 text-sm">
                                    <div className="text-gray-400">
                                        총 풀: <span className="text-white font-bold">{market.total_pool.toLocaleString()} CR</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={betAmount}
                                            onChange={e => setBetAmount(Number(e.target.value))}
                                            className="w-20 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-right text-white"
                                            step="100"
                                        />
                                        <span className="text-gray-500">CR</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PredictionMarketPage;
