
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
    const [itemCat, setItemCat] = useState<'all' | 'avatar' | 'name' | 'system'>('all');
    const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
    const [chargeAmount, setChargeAmount] = useState(1000);
    const [boxResult, setBoxResult] = useState<{ message: string, type?: string } | null>(null);

    useEffect(() => {
        setAuctions(storage.getAuctionItems());
    }, []);

    const handleBuy = async (itemId: string, itemValue: string, type: string) => {
        if (!user) return alert('로그인이 필요합니다.');

        if (itemId === 'item-box') {
            if (user.points < 100) return alert('포인트가 부족합니다.');
            if (confirm('미스테리 박스를 개봉하시겠습니까? (100 CR)')) {
                setIsBuying(itemId);
                const res = await storage.openMysteryBox(user.id);
                if (res.success) {
                    setBoxResult({ message: res.message, type: res.type });
                    refreshUser();
                }
                setIsBuying(null);
            }
            return;
        }

        if (confirm('구매하시겠습니까?')) {
            setIsBuying(itemId);
            const res = await storage.buyItem(user.id, itemId);
            if (res.success) {
                alert(res.message);
                if (type === 'theme') {
                    setCustomTheme(itemValue as any);
                }
                refreshUser();
            } else {
                alert(res.message);
            }
            setIsBuying(null);
        }
    };

    const handleBid = async (aucId: string) => {
        if (!user) return alert('로그인이 필요합니다.');
        if (confirm('500 CR을 사용하여 입찰하시겠습니까?')) {
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
            alert(`${chargeAmount.toLocaleString()} CR 충전 완료!`);
            refreshUser();
        }
    };

    const filteredItems = SHOP_ITEMS.filter(item => itemCat === 'all' || item.category === itemCat);

    if (!user) return <div className="p-8 text-center animate-pulse">인터페이스 로딩 중...</div>;

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Shop Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-6 text-white flex justify-between items-center shadow-xl">
                <div>
                    <h1 className="text-2xl font-black flex items-center gap-2"><ShoppingBag /> NEXUS MARKET</h1>
                    <p className="text-indigo-100 text-sm mt-1">한정판 효과와 유틸리티 아이템을 만나보세요.</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-indigo-200 uppercase font-black tracking-widest">Balance</div>
                    <div className="text-3xl font-black">{user.points.toLocaleString()} CR</div>
                    <button onClick={() => setIsChargeModalOpen(true)} className="mt-2 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg backdrop-blur-sm transition-all font-bold">
                        + 무료 충전
                    </button>
                </div>
            </div>

            {/* Mystery Box Result Modal */}
            {boxResult && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setBoxResult(null)}>
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border-2 border-indigo-500 animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="text-6xl mb-4">
                            {boxResult.type === 'fail' ? '💨' : boxResult.type === 'jackpot' ? '💰' : boxResult.type === 'rare' ? '💎' : '👑'}
                        </div>
                        <h2 className="text-2xl font-black dark:text-white mb-2">박스 개봉 결과!</h2>
                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-6">{boxResult.message}</p>
                        <button onClick={() => setBoxResult(null)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">확인</button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                    <button onClick={() => setActiveTab('items')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'items' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-cyan-400' : 'text-gray-500'}`}>
                        <Palette size={14} className="inline mr-1" /> 아이템 상점
                    </button>
                    <button onClick={() => setActiveTab('auction')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'auction' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-cyan-400' : 'text-gray-500'}`}>
                        <Gavel size={14} className="inline mr-1" /> 포인트 경매
                    </button>
                </div>

                {activeTab === 'items' && (
                    <div className="flex gap-1">
                        {['all', 'avatar', 'name', 'system'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setItemCat(cat as any)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${itemCat === cat ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {cat === 'all' ? '전체' : cat === 'avatar' ? '프로필' : cat === 'name' ? '닉네임' : '시스템'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {activeTab === 'items' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map(item => {
                        const isOwned = user.inventory.includes(item.id);
                        const isSpecial = item.id.includes('effect') || item.id.includes('box');

                        return (
                            <div key={item.id} className={`group bg-white dark:bg-gray-800 border rounded-3xl p-5 flex flex-col justify-between transition-all ${isOwned ? 'opacity-80 border-indigo-100 dark:border-indigo-900/30' : 'border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-1'}`}>
                                <div>
                                    <div className={`text-4xl mb-4 w-16 h-16 flex items-center justify-center rounded-2xl shadow-inner transition-transform group-hover:scale-110 ${isSpecial ? 'bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20' : 'bg-gray-50 dark:bg-gray-900'}`}>
                                        {item.icon}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{item.name}</h3>
                                        {item.id.includes('frame') && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 text-[8px] font-black rounded">SEASON</span>}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{item.description}</p>
                                </div>
                                <button
                                    onClick={() => handleBuy(item.id, item.value, item.type)}
                                    disabled={isOwned || (isBuying === item.id)}
                                    className={`mt-6 w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg ${isOwned ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                >
                                    {isOwned ? '보유 중' : isBuying === item.id ? <Loader2 size={18} className="animate-spin mx-auto" /> : item.id === 'item-box' ? '개봉하기 (100 CR)' : `${item.price.toLocaleString()} CR`}
                                </button>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {auctions.map(auc => (
                        <div key={auc.id} className="bg-gradient-to-br from-gray-900 to-indigo-950 rounded-3xl p-6 text-white border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4"><Crown className="text-yellow-500 opacity-10" size={80} /></div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-red-500 text-white px-2 py-1 rounded-lg text-[10px] font-black animate-pulse flex items-center gap-1"><Clock size={10} /> LIVE</span>
                                <span className="text-[10px] text-indigo-300 font-bold">기한: {new Date(auc.end_time).toLocaleTimeString()}</span>
                            </div>
                            <h3 className="text-xl font-black mb-2">{auc.item_name}</h3>
                            <p className="text-xs text-indigo-200 mb-6">{auc.description}</p>

                            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl mb-6 border border-white/10">
                                <div className="flex justify-between text-[10px] text-gray-400 uppercase mb-1">
                                    <span>현재 입찰가</span>
                                    <span>최고 입찰자</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-2xl font-black text-indigo-400">{auc.current_price.toLocaleString()} CR</div>
                                    <div className="text-sm font-bold text-gray-300">{auc.highest_bidder_name || '입찰자 없음'}</div>
                                </div>
                            </div>

                            <button onClick={() => handleBid(auc.id)} className="w-full py-3 bg-white text-indigo-950 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all active:scale-95">
                                입찰하기 (+500 CP)
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Charge Modal */}
            {isChargeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsChargeModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-2xl w-full max-w-xs border border-indigo-500/20" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-black dark:text-white mb-2">CR 충전소</h3>
                        <p className="text-[10px] text-gray-400 mb-6 font-bold uppercase tracking-wider">Daily Research Support</p>
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            {[1000, 2000, 3000, 5000].map(amt => (
                                <button key={amt} onClick={() => setChargeAmount(amt)} className={`py-3 rounded-xl text-xs font-bold border transition-all ${chargeAmount === amt ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                    {amt.toLocaleString()} CR
                                </button>
                            ))}
                        </div>
                        <button onClick={handleCharge} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg">
                            무료 충전 받기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShopPage;
