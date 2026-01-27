import React, { useState, useMemo, useEffect } from 'react';
import { useInvest } from './InvestContext';
import { Asset, MarketType, AssetType } from '../../types/invest';
import { Search, Star, MessageSquare, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import TradeModal from './TradeModal';
import { InvestService } from '../../services/investService';

const MarketTab: React.FC = () => {
    const { stocks, cryptos, favorites, toggleFavorite } = useInvest();
    const [assetType, setAssetType] = useState<AssetType>('stocks');
    const [marketFilter, setMarketFilter] = useState<MarketType | 'all' | 'favorites'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Trade Modal State
    const [tradeAsset, setTradeAsset] = useState<Asset | null>(null);
    const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');

    // News State
    const [news, setNews] = useState<any[]>([]);
    const [isNewsLoading, setIsNewsLoading] = useState(true);

    useEffect(() => {
        const loadNews = async () => {
            const data = await InvestService.fetchNews();
            setNews(data);
            setIsNewsLoading(false);
        };
        loadNews();
    }, []);

    const openTrade = (asset: Asset, type: 'buy' | 'sell') => {
        setTradeAsset(asset);
        setTradeType(type);
    };

    const filteredAssets = useMemo(() => {
        let list = assetType === 'stocks' ? stocks : cryptos;

        if (marketFilter === 'favorites') {
            list = list.filter(a => favorites.includes(a.code));
        } else if (marketFilter !== 'all') {
            list = list.filter(a => a.market === marketFilter);
        }

        if (searchTerm) {
            const lowSearch = searchTerm.toLowerCase();
            list = list.filter(a =>
                a.name.toLowerCase().includes(lowSearch) ||
                a.code.toLowerCase().includes(lowSearch) ||
                a.sector.toLowerCase().includes(lowSearch)
            );
        }

        return list;
    }, [stocks, cryptos, favorites, assetType, marketFilter, searchTerm]);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            <div className="xl:col-span-3 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                {/* Asset Type Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-800/50">
                    <button
                        onClick={() => setAssetType('stocks')}
                        className={`flex-1 px-6 py-4 font-bold transition-all ${assetType === 'stocks'
                            ? 'bg-gradient-to-r from-blue-600/20 to-transparent border-b-2 border-blue-500 text-blue-400'
                            : 'text-slate-400 hover:bg-slate-700/50'
                            }`}
                    >
                        📈 주식
                    </button>
                    <button
                        onClick={() => setAssetType('crypto')}
                        className={`flex-1 px-6 py-4 font-bold transition-all ${assetType === 'crypto'
                            ? 'bg-gradient-to-r from-blue-600/20 to-transparent border-b-2 border-blue-500 text-blue-400'
                            : 'text-slate-400 hover:bg-slate-700/50'
                            }`}
                    >
                        ₿ 암호화폐
                    </button>
                </div>

                {/* Market Filters */}
                {assetType === 'stocks' && (
                    <div className="flex gap-2 p-4 border-b border-slate-700 bg-slate-900/20 flex-wrap">
                        <button
                            onClick={() => setMarketFilter('favorites')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${marketFilter === 'favorites' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                }`}
                        >
                            ⭐ 관심
                        </button>
                        <button
                            onClick={() => setMarketFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${marketFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                }`}
                        >
                            전체
                        </button>
                        {['KOSPI', 'KOSDAQ', 'NASDAQ', 'NYSE'].map((m) => (
                            <button
                                key={m}
                                onClick={() => setMarketFilter(m as MarketType)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${marketFilter === m ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                    }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                )}

                {/* Search */}
                <div className="p-4 border-b border-slate-700 bg-slate-900/40">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="🔍 종목명, 코드, 섹터 검색..."
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                    <table className="w-full">
                        <thead className="bg-slate-800/80 sticky top-0 z-10 border-b border-slate-700">
                            <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4 text-left">종목</th>
                                <th className="px-4 py-4 text-left">섹터</th>
                                <th className="px-4 py-4 text-right">현재가</th>
                                <th className="px-4 py-4 text-right">전일대비</th>
                                <th className="px-4 py-4 text-right">등락률</th>
                                <th className="px-4 py-4 text-right">거래량</th>
                                <th className="px-6 py-4 text-center">관심</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredAssets.map(asset => (
                                <tr key={asset.code} className="hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors cursor-pointer">{asset.name}</span>
                                            <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{asset.code}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <span className="text-xs text-slate-400 px-2 py-1 bg-slate-700/50 rounded-md">{asset.sector}</span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right font-bold text-white font-mono">
                                        {asset.market === 'CRYPTO' ? `$${asset.price.toLocaleString()}` : `₩${asset.price.toLocaleString()}`}
                                    </td>
                                    <td className={`px-4 py-4 whitespace-nowrap text-right text-xs font-bold ${asset.change >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                        {asset.change >= 0 ? '▲' : '▼'}{Math.abs(asset.change).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-black ${asset.changePercent >= 0 ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right text-xs text-slate-500 font-mono">
                                        {(asset.volume / 1000000).toFixed(1)}M
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => openTrade(asset, 'buy')}
                                                className="bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-black shadow-sm"
                                            >매수</button>
                                            <button
                                                onClick={() => openTrade(asset, 'sell')}
                                                className="bg-blue-500/10 text-blue-500 border border-blue-500/30 px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all text-xs font-black shadow-sm"
                                            >매도</button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button
                                            onClick={() => toggleFavorite(asset.code)}
                                            className={`p-2 rounded-full transition-all duration-300 ${favorites.includes(asset.code)
                                                ? 'text-amber-400 bg-amber-400/10'
                                                : 'text-slate-600 hover:text-slate-400 hover:bg-slate-700'
                                                }`}
                                        >
                                            <Star className="w-4 h-4" fill={favorites.includes(asset.code) ? "currentColor" : "none"} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sidebar Placeholder */}
            <div className="space-y-4">
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg p-5">
                    <h3 className="font-bold flex items-center gap-2 text-slate-100 mb-4">
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        실시간 뉴스
                    </h3>
                    <div className="space-y-4">
                        {isNewsLoading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 animate-pulse">
                                    <div className="h-3 w-20 bg-slate-700 rounded mb-2"></div>
                                    <div className="h-4 w-full bg-slate-700 rounded"></div>
                                </div>
                            ))
                        ) : news.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-500 font-bold uppercase">뉴스를 불러오지 못했습니다.</div>
                        ) : (
                            news.slice(0, 6).map((item, i) => (
                                <a
                                    key={i}
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-4 bg-slate-900/40 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-700/30 transition-all group"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-widest">{item.source}</span>
                                        <span className="text-[10px] text-slate-500 font-bold">{item.time}</span>
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-200 leading-snug group-hover:text-blue-300 transition-colors line-clamp-2">{item.title}</h4>
                                    <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink className="w-3 h-3 text-blue-500" />
                                    </div>
                                </a>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {tradeAsset && (
                <TradeModal
                    asset={tradeAsset}
                    type={tradeType}
                    onClose={() => setTradeAsset(null)}
                />
            )}
        </div>
    );
};

export default MarketTab;
