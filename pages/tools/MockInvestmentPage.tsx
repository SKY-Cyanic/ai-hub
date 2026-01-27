import React, { useState, useEffect } from 'react';
import { InvestProvider, useInvest } from '../../components/invest/InvestContext';
import MarketTab from '../../components/invest/MarketTab';
import PortfolioTab from '../../components/invest/PortfolioTab';
import IndicesTab from '../../components/invest/IndicesTab';
import HistoryTab from '../../components/invest/HistoryTab';
import ChartTab from '../../components/invest/ChartTab';
import HeatmapTab from '../../components/invest/HeatmapTab';
import GameTab from '../../components/invest/GameTab';
import AnalystTab from '../../components/invest/AnalystTab';
import BacktestTab from '../../components/invest/BacktestTab';
import LabTab from '../../components/invest/LabTab';
import JournalTab from '../../components/invest/JournalTab';
import { Asset, MarketType, IndexData } from '../../types/invest';
import { InvestService } from '../../services/investService';

const MockInvestmentPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('market');

    return (
        <InvestProvider>
            <div className="min-h-screen bg-slate-900 text-slate-100 pb-20">
                <InvestHeader />
                <InvestTicker />
                <InvestNav activeTab={activeTab} onTabChange={setActiveTab} />
                <main className="max-w-[1920px] mx-auto p-4">
                    <InvestContent activeTab={activeTab} />
                </main>
            </div>
        </InvestProvider>
    );
};

const InvestHeader: React.FC = () => {
    const { cash, portfolio, stocks, cryptos } = useInvest();
    const [totalAsset, setTotalAsset] = useState(cash);
    const [profitRate, setProfitRate] = useState(0);

    useEffect(() => {
        let stockValue = 0;
        Object.values(portfolio).forEach(item => {
            const asset = [...stocks, ...cryptos].find(a => a.code === item.symbol);
            if (asset) {
                stockValue += item.quantity * asset.price;
            }
        });
        const total = cash + stockValue;
        setTotalAsset(total);
        const rate = ((total - 100000000) / 100000000) * 100;
        setProfitRate(rate);
    }, [cash, portfolio, stocks, cryptos]);

    return (
        <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
            <div className="max-w-[1920px] mx-auto px-4 py-3">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            📈 모의투자 Pro
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-xs text-slate-400">보유 현금</p>
                            <p className="text-lg font-bold text-emerald-400">₩{cash.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-600"></div>
                        <div className="text-center">
                            <p className="text-xs text-slate-400">총 자산</p>
                            <p className="text-lg font-bold text-amber-400">₩{totalAsset.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-600"></div>
                        <div className="text-center">
                            <p className="text-xs text-slate-400">수익률</p>
                            <p className={`text-lg font-bold ${profitRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

const InvestTicker: React.FC = () => {
    const { indices } = useInvest();
    return (
        <div className="bg-slate-800/80 border-b border-slate-700">
            <div className="max-w-[1920px] mx-auto px-4 py-4">
                <div className="flex gap-8 overflow-x-auto pb-2 min-w-max custom-scrollbar">
                    {indices.map(idx => (
                        <div key={idx.symbol} className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-300">{idx.name}</span>
                            <span className="text-sm font-bold text-white">{idx.price.toLocaleString()}</span>
                            <span className={`text-xs font-medium ${idx.change >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                {idx.change >= 0 ? '▲' : '▼'}{Math.abs(idx.change).toLocaleString()} ({idx.changePercent.toFixed(2)}%)
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const InvestNav: React.FC<{ activeTab: string, onTabChange: (tab: string) => void }> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'market', label: '📊 시장' },
        { id: 'indices', label: '📈 지수' },
        { id: 'chart', label: '📉 차트' },
        { id: 'heatmap', label: '🗺️ 히트맵' },
        { id: 'portfolio', label: '💼 포트폴리오' },
        { id: 'history', label: '📝 거래내역' },
        { id: 'game', label: '🎮 챌린지', color: 'text-yellow-400' },
        { id: 'backtest', label: '🧪 백테스팅' },
        { id: 'analyst', label: '👨‍🔬 분석가', color: 'text-cyan-400' },
        { id: 'lab', label: '🧪 연구소', color: 'text-indigo-400' },
        { id: 'journal', label: '📓 스마트 일지', color: 'text-purple-400' },
    ];

    return (
        <nav className="bg-slate-800/50 border-b border-slate-700 overflow-x-auto sticky top-[4.5rem] mt-[-1px] z-40">
            <div className="max-w-[1920px] mx-auto px-4">
                <div className="flex gap-2 py-3 min-w-max">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`px-6 py-2.5 rounded-xl font-semibold transition ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : `hover:bg-slate-700 text-slate-300 ${tab.color || ''}`
                                }`}
                            onClick={() => onTabChange(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </nav>
    );
};

const InvestContent: React.FC<{ activeTab: string }> = ({ activeTab }) => {
    const { refreshData } = useInvest();

    useEffect(() => {
        refreshData();
        const timer = setInterval(refreshData, 30000); // 30s interval
        return () => clearInterval(timer);
    }, [refreshData]);

    return (
        <div className="animate-fadeIn">
            {activeTab === 'market' && <MarketTab />}
            {activeTab === 'indices' && <IndicesTab />}
            {activeTab === 'chart' && <ChartTab />}
            {activeTab === 'heatmap' && <HeatmapTab />}
            {activeTab === 'portfolio' && <PortfolioTab />}
            {activeTab === 'history' && <HistoryTab />}
            {activeTab === 'game' && <GameTab />}
            {activeTab === 'analyst' && <AnalystTab />}
            {activeTab === 'backtest' && <BacktestTab />}
            {activeTab === 'lab' && <LabTab />}
            {activeTab === 'journal' && <JournalTab />}
            {activeTab !== 'market' && activeTab !== 'indices' && activeTab !== 'chart' && activeTab !== 'heatmap' && activeTab !== 'portfolio' && activeTab !== 'history' && activeTab !== 'game' && activeTab !== 'analyst' && activeTab !== 'backtest' && activeTab !== 'lab' && activeTab !== 'journal' && (
                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-20 text-center shadow-2xl">
                    <div className="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl animate-bounce">🚧</span>
                    </div>
                    <h2 className="text-2xl font-black mb-4 text-white uppercase tracking-tighter">추가 기능 구현 중</h2>
                    <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
                        선택하신 <b>{activeTab}</b> 탭의 데이터를 React 환경으로 안전하게 마이그레이션하고 있습니다. <br />잠시만 기다려 주세요!
                    </p>
                </div>
            )}
        </div>
    );
};

export default MockInvestmentPage;
