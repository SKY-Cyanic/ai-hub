import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SHOP_ITEMS, storage } from '../services/storage';
import { AuctionItem } from '../types';
import {
    ShoppingBag, Check, Gavel, Loader2, Clock, Crown, Palette,
    ChevronRight, Zap, Trophy, Coins, Sparkles, Filter
} from 'lucide-react';
import { UserNickname, UserAvatar } from '../components/UserEffect';

const ShopPage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const { setCustomTheme } = useTheme();
    const [isBuying, setIsBuying] = useState<string | null>(null);
    const [auctions, setAuctions] = useState<AuctionItem[]>([]);
    const [activeTab, setActiveTab] = useState<'items' | 'auction'>('items');
    const [itemCat, setItemCat] = useState<'all' | 'avatar' | 'name' | 'system'>('all');
    const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
    const [chargeAmount, setChargeAmount] = useState<number>(0);
    const [paymentStep, setPaymentStep] = useState<1 | 2>(1);
    const [selectedMethod, setSelectedMethod] = useState<'toss' | 'kakao' | 'card' | null>(null);
    const [boxResult, setBoxResult] = useState<{ message: string, type?: string } | null>(null);
    const [previewItem, setPreviewItem] = useState<any | null>(null);

    // 구매 확인 모달 상태
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        itemId: string;
        itemValue?: string;
        type: string;
        message: string;
    } | null>(null);

    useEffect(() => {
        setAuctions(storage.getAuctionItems());
    }, []);

    // 구매 버튼 클릭 시 모달 열기
    const handleBuyClick = (itemId: string, itemValue: string | undefined, type: string) => {
        console.log('[ShopPage] handleBuyClick:', { itemId, itemValue, type });
        if (!user) return alert('로그인이 필요합니다.');

        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;

        if (itemId === 'item-box') {
            if (user.points < 100) return alert('포인트가 부족합니다.');
            setConfirmModal({
                isOpen: true,
                itemId,
                itemValue,
                type,
                message: `미스테리 박스를 개봉하시겠습니까? (100 CR)`
            });
        } else {
            if (user.points < item.price) return alert('CR이 부족합니다.');
            setConfirmModal({
                isOpen: true,
                itemId,
                itemValue,
                type,
                message: `${item.name}을(를) ${item.price.toLocaleString()} CR에 구매하시겠습니까?`
            });
        }
    };

    // 구매 확정 처리
    const handleConfirmPurchase = async () => {
        if (!confirmModal || !user) return;

        const { itemId, itemValue, type } = confirmModal;
        setConfirmModal(null);

        if (itemId === 'item-box') {
            setIsBuying(itemId);
            const res = await storage.openMysteryBox(user.id);
            console.log('[ShopPage] openMysteryBox result:', res);
            if (res.success) {
                setBoxResult({ message: res.message, type: res.type });
                refreshUser();
            }
            setIsBuying(null);
            return;
        }

        console.log('[ShopPage] Purchase confirmed, calling buyItem...');
        setIsBuying(itemId);
        try {
            const res = await storage.buyItem(user.id, itemId);
            console.log('[ShopPage] buyItem result:', res);
            if (res.success) {
                alert(res.message);
                if (type === 'theme') {
                    setCustomTheme(itemValue as any);
                }
                refreshUser();
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error('[ShopPage] buyItem error:', error);
            alert('구매 중 오류가 발생했습니다.');
        }
        setIsBuying(null);
    };

    const handleBid = async (aucId: string) => {
        if (!user) return alert('로그인이 필요합니다.');
        if (confirm('500 CR을 사용하여 입찰하시겠습니까?')) {
            const res = await storage.placeBid(user.id, aucId);
            if (res.success) {
                alert(res.message);
                setAuctions(storage.getAuctionItems());
                refreshUser();
            } else {
                alert(res.message);
            }
        }
    };

    const handleCharge = async () => {
        if (!user) return;
        setIsChargeModalOpen(false);
        const success = await storage.chargePoints(user.id, chargeAmount);
        if (success) {
            alert(`${chargeAmount.toLocaleString()} CR 충전 완료!`);
            refreshUser();
            setPaymentStep(1);
            setSelectedMethod(null);
        }
    };

    const getPreviewProfile = () => {
        if (!user || !previewItem) return user;
        const newProfile = { ...user, active_items: { ...user.active_items } };
        if (previewItem.type === 'color') newProfile.active_items.name_color = previewItem.value;
        if (previewItem.type === 'frame') newProfile.active_items.frame = previewItem.value;
        if (previewItem.type === 'badge') newProfile.active_items.badge = previewItem.value;
        if (previewItem.type === 'special_effects' || previewItem.id.includes('effect')) {
            if (!newProfile.active_items.special_effects) newProfile.active_items.special_effects = [];
            if (!newProfile.active_items.special_effects.includes(previewItem.value)) {
                newProfile.active_items.special_effects = [...newProfile.active_items.special_effects, previewItem.value];
            }
        }
        if (previewItem.type === 'custom_title') newProfile.active_items.custom_title = "[미리보기 칭호]";
        return newProfile;
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
                        + 충전하기
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
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                    <button onClick={() => setActiveTab('items')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'items' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-cyan-400' : 'text-gray-500 hover:text-gray-700'}`}>
                        <Palette size={14} className="inline mr-1" /> 아이템 상점
                    </button>
                    <button onClick={() => setActiveTab('auction')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'auction' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-cyan-400' : 'text-gray-500 hover:text-gray-700'}`}>
                        <Gavel size={14} className="inline mr-1" /> 포인트 경매
                    </button>
                </div>

                {activeTab === 'items' && (
                    <div className="flex gap-1 overflow-x-auto pb-2 md:pb-0">
                        {(['all', 'avatar', 'name', 'system'] as const).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setItemCat(cat)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all flex-shrink-0 ${itemCat === cat ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {cat === 'all' ? '전체' : cat === 'avatar' ? '프로필' : cat === 'name' ? '닉네임' : '시스템'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Preview Area */}
            {previewItem && activeTab === 'items' && (
                <div className="p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-[32px] border-2 border-indigo-500/20 shadow-xl animate-fade-in relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Sparkles size={120} /></div>
                    <div className="flex items-center gap-6 relative z-10">
                        <UserAvatar profile={getPreviewProfile() as any} size="lg" className="scale-125 translate-x-2" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-black uppercase">Preview</span>
                                <span className="text-[10px] text-gray-400 font-bold">{previewItem.name}</span>
                            </div>
                            <UserNickname profile={getPreviewProfile() as any} className="text-2xl" />
                            <p className="text-xs text-gray-400 mt-2 font-medium">아이템 적용 시 내 정보가 이렇게 표시됩니다.</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="text-xl font-black text-indigo-600">{previewItem.price.toLocaleString()} CR</div>
                            <button onClick={() => setPreviewItem(null)} className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors underline">미리보기 종료</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'items' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map(item => {
                        const isOwned = user.inventory.includes(item.id);
                        const isSpecial = item.id.includes('effect') || item.id.includes('box');

                        return (
                            <div key={item.id} className={`group bg-white dark:bg-gray-800 border rounded-[32px] p-6 flex flex-col justify-between transition-all ${isOwned ? 'opacity-80 border-indigo-50 dark:border-indigo-900/10' : 'border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:border-indigo-500/30 hover:-translate-y-1'}`}>
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
                                <div className="mt-6 flex gap-2">
                                    {!isOwned && item.category !== 'system' && (
                                        <button onClick={() => setPreviewItem(item)} className="p-3 border border-indigo-100 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" title="미리보기">
                                            👁️
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleBuyClick(item.id, item.value, item.type)}
                                        disabled={isOwned || (isBuying === item.id)}
                                        className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg ${isOwned ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                    >
                                        {isOwned ? '보유 중' : isBuying === item.id ? <Loader2 size={18} className="animate-spin mx-auto" /> : item.id === 'item-box' ? '박스 개봉' : `${item.price.toLocaleString()} CR`}
                                    </button>
                                </div>
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

            {/* Premium Charge Modal */}
            {isChargeModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl px-4 animate-fade-in" onClick={() => { setIsChargeModalOpen(false); setPaymentStep(1); }}>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-[32px] shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-800 overflow-hidden translate-y-0" onClick={e => e.stopPropagation()}>
                        {paymentStep === 1 ? (
                            <div className="p-8">
                                <h3 className="text-2xl font-black dark:text-white mb-1">CR 충전</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 font-medium">원하시는 충전 금액을 선택해주세요.</p>

                                <div className="space-y-3 mb-8">
                                    {[
                                        { amt: 5000, label: 'Standard', sub: '기본 포인트 충전' },
                                        { amt: 15000, label: 'Best Value', sub: '보너스 1,000 CR 포함', hot: true },
                                        { amt: 30000, label: 'Premium', sub: '보너스 3,000 CR 포함' },
                                        { amt: 50000, label: 'VIP Pack', sub: '무지개 닉네임 7일권 증정' }
                                    ].map(item => (
                                        <button
                                            key={item.amt}
                                            onClick={() => setChargeAmount(item.amt)}
                                            className={`w-full p-4 rounded-2xl border-2 transition-all flex justify-between items-center group ${chargeAmount === item.amt ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 hover:bg-white dark:hover:bg-gray-800'}`}
                                        >
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-black ${chargeAmount === item.amt ? 'text-indigo-600' : 'text-gray-900 dark:text-gray-100'}`}>{item.label}</span>
                                                    {item.hot && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">BEST</span>}
                                                </div>
                                                <div className="text-[11px] text-gray-400 font-medium">{item.sub}</div>
                                            </div>
                                            <div className={`text-lg font-black ${chargeAmount === item.amt ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100'}`}>
                                                ₩{(item.amt).toLocaleString()}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <button
                                    disabled={chargeAmount === 0}
                                    onClick={() => setPaymentStep(2)}
                                    className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${chargeAmount === 0 ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}
                                >
                                    결제 단계로 이동 <ChevronRight size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="p-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <button onClick={() => setPaymentStep(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-400"><ChevronRight size={20} className="rotate-180" /></button>
                                    <h3 className="text-xl font-black dark:text-white">결제 수단 선택</h3>
                                </div>

                                <div className="space-y-3 mb-8">
                                    {[
                                        { id: 'toss', name: '토스페이', color: 'bg-blue-500', icon: '💸' },
                                        { id: 'kakao', name: '카카오페이', color: 'bg-yellow-400', icon: '🟨' },
                                        { id: 'card', name: '신용/체크카드', color: 'bg-gray-800', icon: '💳' },
                                    ].map(method => (
                                        <button
                                            key={method.id}
                                            onClick={() => setSelectedMethod(method.id as any)}
                                            className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${selectedMethod === method.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'}`}
                                        >
                                            <div className={`w-10 h-10 ${method.color} rounded-xl flex items-center justify-center text-lg shadow-inner`}>{method.icon}</div>
                                            <span className="font-bold dark:text-white">{method.name}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-2xl mb-8 flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-500 uppercase">결제 금액</span>
                                    <span className="text-xl font-black text-indigo-600">₩{chargeAmount.toLocaleString()}</span>
                                </div>

                                <button
                                    disabled={!selectedMethod}
                                    onClick={handleCharge}
                                    className={`w-full py-4 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${!selectedMethod ? 'bg-gray-200 dark:bg-gray-800 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}
                                >
                                    {selectedMethod ? `${selectedMethod === 'card' ? '카드' : selectedMethod === 'toss' ? '토스' : '카카오'}로 결제하기` : '결제 수단을 선택해 주세요'}
                                </button>
                            </div>
                        )}
                        <div className="bg-gray-100 dark:bg-gray-800 p-4 text-center">
                            <p className="text-[9px] text-gray-400 font-medium">결제 시 이용약관 및 취소 규정에 동의하는 것으로 간주됩니다.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-fade-in" onClick={() => setConfirmModal(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center" onClick={e => e.stopPropagation()}>
                        <div className="text-5xl mb-4">🛒</div>
                        <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">구매 확인</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{confirmModal.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirmPurchase}
                                className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                구매하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShopPage;
