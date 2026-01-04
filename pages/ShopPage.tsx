
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SHOP_ITEMS, storage } from '../services/storage';
import { AuctionItem } from '../types';
import { ShoppingBag, Check, Gavel, Loader2, Clock, Crown, Palette } from 'lucide-react';

const ShopPage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const { setCustomTheme } = useTheme();
    const [isBuying, setIsBuying] = useState<string | null>(null);
    const [auctions, setAuctions] = useState<AuctionItem[]>([]);
    const [activeTab, setActiveTab] = useState<'items' | 'auction'>('items');
    const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
    const [chargeAmount, setChargeAmount] = useState(1000);

    useEffect(() => {
        setAuctions(storage.getAuctionItems());
    }, []);

    const handleBuy = async (itemId: string, itemValue: string, type: string) => {
        if (!user) return alert('로그인이 필요합니다.');
        if (confirm('구매하시겠습니까?')) {
            setIsBuying(itemId);
            const success = await storage.buyItem(user.id, itemId);
            if (success) {
                alert('구매 성공!');
                if (type === 'theme') {
                    setCustomTheme(itemValue as any);
                }
                refreshUser();
            } else {
                alert('포인트 부족 혹은 보유 중인 아이템입니다.');
            }
            setIsBuying(null);
        }
    };

    const handleBid = async (aucId: string) => {
        if (!user) return alert('로그인이 필요합니다.');
        if (confirm('500 P를 사용하여 입찰하시겠습니까?')) {
            const res = await storage.placeBid(user.id, aucId);
            if (res.success) {
                alert(res.message);
                setAuctions(storage.getAuctionItems()); // Refresh
                refreshUser();
            } else {
                alert(res.message);
            }
        }
    };

    const handleCharge = async () => {
        if (!user) return;

        // Check cooldown from transactions
        const lastCharge = user.transactions?.filter(t => t.type === 'charge').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        if (lastCharge) {
            const lastDate = new Date(lastCharge.created_at);
            const now = new Date();
            const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
            if (diffHours < 24) {
                alert(`충전은 24시간마다 가능합니다.\n남은 시간: ${Math.ceil(24 - diffHours)}시간`);
                setIsChargeModalOpen(false);
                return;
            }
        }

        setIsChargeModalOpen(false);
        const success = await storage.chargePoints(user.id, chargeAmount);
        if (success) {
            alert(`${chargeAmount.toLocaleString()} P 충전 완료! (다음 충전: 24시간 후)`);
            refreshUser();
        }
    };

    if (!user) return <div className="p-8 text-center animate-pulse">인터페이스 로딩 중...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Shop Header */}
            <div className="bg-indigo-600 rounded-3xl p-6 text-white flex justify-between items-center shadow-2xl">
                <div>
                    <h1 className="text-2xl font-black flex items-center gap-2"><ShoppingBag /> NEXUS MARKET</h1>
                    <p className="text-indigo-100 text-sm mt-1">커스텀 모듈 및 리미티드 아이템을 획득하세요.</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-indigo-200 uppercase font-black tracking-widest">Balance</div>
                    <div className="text-3xl font-black">{user.points.toLocaleString()} P</div>
                    <button onClick={() => setIsChargeModalOpen(true)} className="mt-2 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg backdrop-blur-sm transition-all">
                        + 무료 충전소
                    </button>
                </div>
            </div>

            {/* Charge Modal */}
            {isChargeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsChargeModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-2xl w-full max-w-xs border border-indigo-500/20" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-black dark:text-white mb-4">일일 무료 충전소</h3>
                        <p className="text-xs text-gray-400 mb-4">하루에 한 번, 연구 자금을 지원받을 수 있습니다.</p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {[1000, 2000, 3000, 5000].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => setChargeAmount(amt)}
                                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${chargeAmount === amt ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    {amt.toLocaleString()} P
                                </button>
                            ))}
                        </div>
                        <button onClick={handleCharge} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg">
                            지원금 받기
                        </button>
                    </div>
                </div>
            )}


            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('items')}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'items' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-cyan-400' : 'text-gray-500'}`}
                >
                    <Palette size={14} className="inline mr-1" /> 모듈 상점
                </button>
                <button
                    onClick={() => setActiveTab('auction')}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'auction' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-cyan-400' : 'text-gray-500'}`}
                >
                    <Gavel size={14} className="inline mr-1" /> 포인트 경매소
                </button>
            </div>

            {
                activeTab === 'items' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {SHOP_ITEMS.map(item => {
                            const isOwned = user.inventory.includes(item.id);
                            return (
                                <div key={item.id} className={`bg-white dark:bg-gray-800 border rounded-3xl p-5 flex flex-col justify-between transition-all ${isOwned ? 'opacity-80 border-indigo-100' : 'border-gray-200 dark:border-gray-700 hover:shadow-xl'}`}>
                                    <div>
                                        <div className="text-4xl mb-4 bg-gray-50 dark:bg-gray-900 w-16 h-16 flex items-center justify-center rounded-2xl shadow-inner">{item.icon}</div>
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{item.name}</h3>
                                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">{item.description}</p>
                                    </div>
                                    <button
                                        onClick={() => handleBuy(item.id, item.value, item.type)}
                                        disabled={isOwned || isBuying === item.id}
                                        className={`mt-6 w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg ${isOwned ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                    >
                                        {isOwned ? '보유 중' : isBuying === item.id ? <Loader2 size={18} className="animate-spin mx-auto" /> : `${item.price} P`}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {auctions.map(auc => (
                            <div key={auc.id} className="bg-gradient-to-br from-indigo-900 to-gray-900 rounded-3xl p-6 text-white border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4"><Crown className="text-yellow-500 opacity-20" size={60} /></div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-red-500 text-white px-2 py-1 rounded-lg text-[10px] font-black animate-pulse flex items-center gap-1"><Clock size={10} /> LIVE</span>
                                    <span className="text-[10px] text-indigo-300 font-bold">ENDS: {new Date(auc.end_time).toLocaleTimeString()}</span>
                                </div>
                                <h3 className="text-xl font-black mb-2">{auc.item_name}</h3>
                                <p className="text-xs text-indigo-200 mb-6">{auc.description}</p>

                                <div className="bg-black/30 p-4 rounded-2xl mb-6">
                                    <div className="flex justify-between text-[10px] text-gray-400 uppercase mb-1">
                                        <span>Current Bid</span>
                                        <span>Highest Bidder</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-2xl font-black text-indigo-400">{auc.current_price.toLocaleString()} P</div>
                                        <div className="text-sm font-bold">{auc.highest_bidder_name || 'No Bids'}</div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleBid(auc.id)}
                                    className="w-full py-3 bg-white text-indigo-900 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all active:scale-95"
                                >
                                    입찰하기 ( +500P )
                                </button>
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
};

export default ShopPage;
