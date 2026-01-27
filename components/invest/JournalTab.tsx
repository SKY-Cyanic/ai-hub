import React, { useState, useEffect } from 'react';
import { useInvest } from './InvestContext';
import { BookOpen, Calendar, MessageSquare, TrendingUp, TrendingDown, Info, Trash2 } from 'lucide-react';

const JournalTab: React.FC = () => {
    const { transactions, stocks, cryptos } = useInvest();
    const [journal, setJournal] = useState<any[]>([]);

    useEffect(() => {
        // Load nested data from transactions or localstorage
        // For demo, we'll enhance transactions with "Smart" context
        const enhanced = transactions.map(t => {
            const asset = [...stocks, ...cryptos].find(a => a.code === t.code);
            return {
                ...t,
                id: t.time || Date.now(),
                context: {
                    rsi: (Math.random() * 40 + 30).toFixed(1), // Mock RSI for existing transitions
                    marketMood: getMockMood(t.type, asset)
                },
                notes: ''
            };
        });
        setJournal(enhanced);
    }, [transactions]);

    const getMockMood = (type: string, asset: any) => {
        if (!asset) return '😐 횡보/안전';
        const change = asset.changePercent;
        if (change > 3) return '🚀 급등 장세';
        if (change < -3) return '📉 투매 장세';
        return type === 'buy' ? '🤔 저점 매수 기회' : '🤑 익절 타이밍';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <BookOpen className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Smart Journal</h2>
                        <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">AI Enhanced Trade Log</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Entries</div>
                    <div className="text-xl font-black text-white">{journal.length}</div>
                </div>
            </div>

            {journal.length === 0 ? (
                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-20 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-700">
                        <BookOpen className="w-10 h-10" />
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">기록된 일지가 없습니다.</h3>
                    <p className="text-sm text-slate-500">시장에서 거래를 수행하면 스마트 일지가 자동으로 작성됩니다.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {journal.map((j, i) => (
                        <div key={i} className="bg-slate-800 rounded-3xl border border-slate-700 p-6 hover:border-purple-500/50 transition-all cursor-pointer group shadow-xl">
                            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg ${j.type === 'buy' ? 'bg-red-600 shadow-red-500/20' : 'bg-blue-600 shadow-blue-500/20'}`}>
                                        {j.type === 'buy' ? 'B' : 'S'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{j.name}</h3>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(j.time).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="px-4 py-2 bg-slate-900 rounded-xl border border-slate-700 text-center">
                                        <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5">Price</p>
                                        <p className="text-sm font-black text-white font-mono">₩{j.price.toLocaleString()}</p>
                                    </div>
                                    <div className="px-4 py-2 bg-slate-900 rounded-xl border border-slate-700 text-center">
                                        <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5">Quantity</p>
                                        <p className="text-sm font-black text-white font-mono">{j.quantity.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">RSI Dashboard</div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-black text-purple-400 font-mono">{j.context.rsi}</span>
                                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-500" style={{ width: `${j.context.rsi}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Market Context</div>
                                    <div className="text-sm font-black text-slate-200">{j.context.marketMood}</div>
                                </div>
                                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Strategy Match</div>
                                        <div className="text-sm font-black text-emerald-400">Low Volatility</div>
                                    </div>
                                    <TrendingUp className="w-5 h-5 text-emerald-500 opacity-50" />
                                </div>
                            </div>

                            <div className="relative">
                                <textarea
                                    placeholder="익절의 이유나 당시의 심리를 기록해보세요..."
                                    className="w-full bg-slate-900/30 border border-slate-700 rounded-2xl p-4 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none min-h-[80px]"
                                />
                                <div className="absolute right-4 bottom-4 flex items-center gap-2 opacity-50">
                                    <MessageSquare className="w-4 h-4 text-slate-500" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase">Save Note</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 p-6 bg-slate-800 rounded-3xl border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center">
                        <Info className="w-5 h-5 text-slate-500" />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-bold">
                        스마트 저널은 모든 거래의 <b>지표 환경</b>을 박제합니다. <br />
                        꾸준한 복기가 수익률의 차이를 만듭니다.
                    </p>
                </div>
                <button className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-red-400 transition-colors uppercase">
                    <Trash2 className="w-4 h-4" />
                    Clear All
                </button>
            </div>
        </div>
    );
};

export default JournalTab;
