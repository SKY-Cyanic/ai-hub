import React from 'react';
import { useInvest } from './InvestContext';
import { History, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const HistoryTab: React.FC = () => {
    const { transactions } = useInvest();

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <h3 className="font-black text-xl text-white flex items-center gap-2">
                        <History className="w-6 h-6 text-blue-400" />
                        거래 내역
                    </h3>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                        Total {transactions.length} Transactions
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-900/40 border-b border-slate-700">
                            <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                <th className="px-6 py-5 text-left">일시</th>
                                <th className="px-4 py-5 text-left">구분</th>
                                <th className="px-4 py-5 text-left">종목명</th>
                                <th className="px-4 py-5 text-right">체결가</th>
                                <th className="px-4 py-5 text-right">수량</th>
                                <th className="px-6 py-5 text-right">체결금액</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic">
                                        거래 내역이 아직 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-700/20 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs text-slate-400 font-mono">
                                                {new Date(t.timestamp).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className={`flex items-center gap-1.5 font-black text-sm ${t.type === 'buy' ? 'text-red-400' : 'text-blue-400'}`}>
                                                {t.type === 'buy' ? (
                                                    <><ArrowUpRight className="w-4 h-4" /> 매수</>
                                                ) : (
                                                    <><ArrowDownRight className="w-4 h-4" /> 매도</>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-200">{t.name}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">{t.symbol}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-slate-300">
                                            ₩{t.price.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-slate-300 font-bold">
                                            {t.quantity.toLocaleString()}주
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="font-black text-white font-mono">
                                                ₩{t.total.toLocaleString()}
                                            </span>
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

export default HistoryTab;
