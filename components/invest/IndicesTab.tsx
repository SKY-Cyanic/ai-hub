import React, { useMemo } from 'react';
import { useInvest } from './InvestContext';
import { Globe } from 'lucide-react';

const IndicesTab: React.FC = () => {
    const { indices } = useInvest();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <Globe className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-black text-white">글로벌 주요 지수</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {indices.map(idx => (
                    <div key={idx.symbol} className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl hover:border-slate-500 transition-all group overflow-hidden relative">
                        {/* Background Decoration */}
                        <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-10 ${idx.change >= 0 ? 'bg-red-500' : 'bg-blue-500'}`} />

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">{idx.country} MARKET</span>
                                <h3 className="font-black text-lg text-white group-hover:text-blue-400 transition-colors">{idx.name}</h3>
                            </div>
                            <span className="text-2xl">{idx.country}</span>
                        </div>

                        <div className="space-y-1 relative z-10">
                            <div className="text-3xl font-black text-white font-mono tracking-tighter">
                                {idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </div>
                            <div className={`flex items-center gap-2 font-bold ${idx.change >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                <span className="text-sm">
                                    {idx.change >= 0 ? '▲' : '▼'} {Math.abs(idx.change).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-white/5 text-xs">
                                    {idx.change >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${idx.change >= 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(100, Math.abs(idx.changePercent) * 20)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-slate-800/50 rounded-3xl border border-slate-700 p-8 text-center mt-8">
                <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mx-auto">
                    실시간 지수 데이터는 Yahoo Finance API를 통해 프록시 서버를 거쳐 30초 간격으로 자동 갱신됩니다. <br />
                    각 국가별 거래 시간 및 데이터 지연 현상에 따라 실제 시세와 다소 차이가 있을 수 있습니다.
                </p>
            </div>
        </div>
    );
};

export default IndicesTab;
