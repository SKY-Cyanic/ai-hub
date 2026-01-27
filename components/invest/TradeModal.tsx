import React, { useState, useEffect } from 'react';
import { useInvest } from './InvestContext';
import { Asset, AssetType } from '../../types/invest';
import { X } from 'lucide-react';

interface TradeModalProps {
    asset: Asset | null;
    type: 'buy' | 'sell';
    onClose: () => void;
}

const TradeModal: React.FC<TradeModalProps> = ({ asset, type, onClose }) => {
    const { cash, portfolio, buyAsset, sellAsset, usdRate } = useInvest();
    const [quantity, setQuantity] = useState(1);
    const [totalPrice, setTotalPrice] = useState(0);

    const heldItem = asset ? portfolio[asset.code] : null;

    useEffect(() => {
        if (asset) {
            setTotalPrice(asset.price * quantity);
        }
    }, [asset, quantity]);

    if (!asset) return null;

    const handleConfirm = () => {
        const success = type === 'buy'
            ? buyAsset(asset.code, quantity, asset.market === 'CRYPTO' ? 'crypto' : 'stocks')
            : sellAsset(asset.code, quantity);

        if (success) {
            onClose();
        } else {
            alert(type === 'buy' ? '잔액이 부족합니다.' : '보유 수량이 부족합니다.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
            <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 w-full max-w-md shadow-2xl overflow-hidden relative">
                {/* Decoration */}
                <div className={`absolute top-0 left-0 w-full h-1.5 ${type === 'buy' ? 'bg-red-500' : 'bg-blue-500'}`} />

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-black text-white">{asset.name}</h3>
                        <p className="text-xs text-slate-500 font-mono">{asset.code} · {type === 'buy' ? '매수 주문' : '매도 주문'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="space-y-5">
                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase">현재 가격</span>
                            <span className="font-mono font-bold text-white">
                                {asset.market === 'CRYPTO' ? `$${asset.price.toLocaleString()}` : `₩${asset.price.toLocaleString()}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">
                                {type === 'buy' ? '주문 가능 금액' : '보유 수량'}
                            </span>
                            <span className="font-mono font-bold text-indigo-400">
                                {type === 'buy' ? `₩${cash.toLocaleString()}` : `${heldItem?.quantity?.toLocaleString() || 0}주`}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">주문 수량</label>
                        <div className="relative">
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-xl font-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                                <button
                                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold"
                                >-</button>
                                <button
                                    onClick={() => setQuantity(prev => prev + 1)}
                                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold"
                                >+</button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 border border-slate-700 text-right">
                        <span className="text-xs font-bold text-slate-500 uppercase block mb-1">예상 체결 총액</span>
                        <div className="text-2xl font-black text-white font-mono">
                            {asset.market === 'CRYPTO' ? `$${totalPrice.toLocaleString()}` : `₩${totalPrice.toLocaleString()}`}
                        </div>
                        {asset.market === 'CRYPTO' && (
                            <div className="text-xs text-slate-500 mt-1">
                                (약 ₩{(totalPrice * usdRate).toLocaleString()})
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleConfirm}
                        className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 ${type === 'buy'
                                ? 'bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-red-900/20 hover:from-red-400 hover:to-orange-500'
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-900/20 hover:from-blue-400 hover:to-indigo-500'
                            }`}
                    >
                        {type === 'buy' ? '매수하기' : '매도하기'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TradeModal;
