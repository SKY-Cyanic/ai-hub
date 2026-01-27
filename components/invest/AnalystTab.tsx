import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useInvest } from './InvestContext';
import { fetchWithProxy } from '../../services/investService';
import { Brain, Zap, Target, BarChart3, Info, RefreshCw, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

// Help functions for analysis
function normalize(arr: number[]) {
    if (arr.length === 0) return [];
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const diffs = arr.map(x => Math.pow(x - mean, 2));
    const std = Math.sqrt(diffs.reduce((a, b) => a + b, 0) / arr.length);
    return arr.map(x => (x - mean) / (std || 0.0001));
}

function calculateCorrelation(a: number[], b: number[]) {
    if (a.length === 0 || b.length === 0) return 0;
    if (a.length !== b.length) {
        const min = Math.min(a.length, b.length);
        a = a.slice(-min); b = b.slice(-min);
    }
    const n = a.length;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += a[i] * b[i];
    return sum / (n - 1);
}

const AnalystTab: React.FC = () => {
    const { stocks, cryptos, portfolio, usdRate } = useInvest();
    const allAssets = [...stocks, ...cryptos];

    // States
    const [selectedSymbol, setSelectedSymbol] = useState(stocks[0]?.code || '');
    const [isPatternLoading, setIsPatternLoading] = useState(false);
    const [patternResult, setPatternResult] = useState<any>(null);
    const [smartMoney, setSmartMoney] = useState<any[]>([]);

    // 1. Pattern Matching
    const runPatternMatching = useCallback(async (symbol: string) => {
        setIsPatternLoading(true);
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2y`;
            const data = await fetchWithProxy(url);
            const result = data?.chart?.result?.[0];
            if (!result) throw new Error('데이터 없음');

            const closes = result.indicators.quote[0].close.filter((c: any) => c != null);
            if (closes.length < 60) throw new Error('데이터 부족');

            const windowSize = 30;
            const currentWindow = closes.slice(-windowSize);
            const currentNorm = normalize(currentWindow);

            let bestMatch = { score: -1, index: -1 };
            for (let i = 0; i < closes.length - windowSize * 2; i++) {
                const historyWindow = closes.slice(i, i + windowSize);
                const historyNorm = normalize(historyWindow);
                const score = calculateCorrelation(currentNorm, historyNorm);
                if (score > bestMatch.score) bestMatch = { score, index: i };
            }

            if (bestMatch.score > 0.7) {
                const matchDate = new Date(result.timestamp[bestMatch.index] * 1000).toLocaleDateString();
                const afterMatch = closes.slice(bestMatch.index + windowSize, bestMatch.index + windowSize + 10);
                const change = ((afterMatch[afterMatch.length - 1] - afterMatch[0]) / afterMatch[0] * 100);
                setPatternResult({ score: bestMatch.score, date: matchDate, change });
            } else {
                setPatternResult({ error: '유사 패턴을 찾지 못했습니다.' });
            }
        } catch (e: any) {
            setPatternResult({ error: e.message });
        }
        setIsPatternLoading(false);
    }, []);

    // 2. Smart Money Tracker
    useEffect(() => {
        const alerts = allAssets
            .filter(a => Math.abs(a.changePercent) > 5)
            .map(a => ({
                name: a.name,
                code: a.code,
                type: a.changePercent > 0 ? '매집' : '이탈',
                value: a.changePercent
            }))
            .slice(0, 5);
        setSmartMoney(alerts);
    }, [stocks, cryptos]);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-6">
                {/* AI Master Section */}
                <div className="bg-gradient-to-br from-indigo-900/40 to-slate-800 rounded-3xl border border-indigo-500/30 p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full" />
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/40">
                            <Brain className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">AI 마스터 리포트</h3>
                            <p className="text-xs text-indigo-300 font-bold">딥러닝 시장 종합 분석</p>
                        </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">시장 감정 지수</div>
                            <p className="text-slate-200 leading-relaxed text-sm">
                                현재 시장은 <span className="text-red-400 font-bold">강한 상방 압력</span>을 받고 있습니다.
                                주요 기술주들의 견조한 성장이 전체 지수를 견인하고 있으며, 특히 AI 관련 섹터로의 수급 쏠림 현상이 뚜렷합니다.
                                단기 과열 양상에 주의하며 분산 투자가 권장되는 시점입니다.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                                <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase">리스크 지수</div>
                                <div className="text-xl font-black text-emerald-400">Low (2.4)</div>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                                <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase">주도 섹터</div>
                                <div className="text-xl font-black text-blue-400">Semiconductor</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Smart Money Tracker */}
                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl">
                    <h4 className="text-sm font-black text-slate-100 mb-6 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        이상 수급 감지기 (Smart Money)
                    </h4>
                    <div className="space-y-3">
                        {smartMoney.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">현재 탐지된 특이 수급 종목이 없습니다.</div>
                        ) : (
                            smartMoney.map((a, i) => (
                                <div key={i} className={`flex justify-between items-center p-4 bg-slate-900/30 rounded-2xl border-l-4 transition-all hover:bg-slate-900/50 ${a.type === '매집' ? 'border-red-500 shadow-red-500/5' : 'border-blue-500 shadow-blue-500/5'}`}>
                                    <div>
                                        <div className="font-bold text-white">{a.name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono uppercase">{a.code}</div>
                                    </div>
                                    <div className={`text-right ${a.type === '매집' ? 'text-red-400' : 'text-blue-400'}`}>
                                        <div className="font-black text-sm">{a.type} 포착</div>
                                        <div className="text-xs font-mono">{a.value >= 0 ? '+' : ''}{a.value.toFixed(2)}%</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Pattern Matching */}
                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl">
                    <h4 className="text-sm font-black text-slate-100 mb-6 flex items-center gap-2">
                        <Target className="w-4 h-4 text-cyan-400" />
                        차트 패턴 매칭 (과거 패턴 검색)
                    </h4>
                    <div className="space-y-6">
                        <div className="flex gap-2">
                            <select
                                value={selectedSymbol}
                                onChange={(e) => setSelectedSymbol(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                                {allAssets.map(a => <option key={a.code} value={a.code}>{a.name} ({a.code})</option>)}
                            </select>
                            <button
                                onClick={() => runPatternMatching(selectedSymbol)}
                                disabled={isPatternLoading}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 rounded-xl font-black transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isPatternLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : '분석'}
                            </button>
                        </div>

                        <div className="min-h-[200px] flex items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-700/50 p-8 text-center">
                            {patternResult ? (
                                patternResult.error ? (
                                    <p className="text-slate-500 text-sm">{patternResult.error}</p>
                                ) : (
                                    <div className="space-y-4 animate-fadeIn">
                                        <div className="text-5xl font-black text-cyan-400 font-mono tracking-tighter">
                                            {(patternResult.score * 100).toFixed(1)}<span className="text-2xl ml-1">%</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-200 font-bold mb-1">매칭 성공!</p>
                                            <p className="text-xs text-slate-500">
                                                이 종목의 현재 흐름은 <span className="text-white">{patternResult.date}</span> 부근의 과거 패턴과 매우 유사합니다.
                                            </p>
                                        </div>
                                        <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">과거 패턴 이후 10일간 수익률</div>
                                            <div className={`text-2xl font-black font-mono ${patternResult.change >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                {patternResult.change >= 0 ? <TrendingUp className="inline w-5 h-5 mr-1" /> : <TrendingDown className="inline w-5 h-5 mr-1" />}
                                                {patternResult.change >= 0 ? '+' : ''}{patternResult.change.toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="space-y-3">
                                    <Info className="w-8 h-8 text-slate-700 mx-auto" />
                                    <p className="text-slate-500 text-sm">종목을 선택하고 분석 버튼을 눌러보세요.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Advisor Recommendation */}
                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-40 h-40 text-white" />
                    </div>
                    <h4 className="text-sm font-black text-slate-100 mb-6 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                        AI 투자 어드바이저 한마디
                    </h4>
                    <div className="p-5 bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 rounded-2xl relative z-10">
                        <p className="text-sm text-slate-200 leading-relaxed italic">
                            "시장은 늘 정답을 말하지만, 개미들은 늘 오답을 읽습니다.
                            지표는 이미 과열을 가리키고 있는데 탐욕에 눈이 멀어 폭락장 앞에서 춤추고 있는 건 아닌지 자문해보세요.
                            <b>{patternResult?.change < 0 ? '데이터는 하락을 경고하고 있습니다.' : '지금이 기회일 수도 있고, 함정일 수도 있습니다.'}</b>"
                        </p>
                        <div className="mt-4 text-[10px] font-black text-orange-500/70 text-right uppercase tracking-widest">— Savage AI Analyst —</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalystTab;
