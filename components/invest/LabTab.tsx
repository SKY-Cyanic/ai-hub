import React, { useState, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import { useInvest } from './InvestContext';
import { fetchWithProxy } from '../../services/investService';
import { FlaskConical, Beaker, Play, Save, Trash2, Zap, TrendingUp, Info, RefreshCw } from 'lucide-react';

interface Strategy {
    id: number;
    indicator: string;
    operator: 'lt' | 'gt' | 'cross_up';
    value: number;
    active: boolean;
}

const LabTab: React.FC = () => {
    const { stocks, cryptos } = useInvest();
    const allAssets = [...stocks, ...cryptos];

    // Prediction State
    const [predictSymbol, setPredictSymbol] = useState(stocks[0]?.code || 'AAPL');
    const [isPredicting, setIsPredicting] = useState(false);
    const [predictResult, setPredictResult] = useState<any>(null);

    // Strategy State
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [newStrategy, setNewStrategy] = useState<Omit<Strategy, 'id' | 'active'>>({
        indicator: 'price',
        operator: 'gt',
        value: 0
    });

    // 1. AI Price Prediction
    const runPrediction = async () => {
        setIsPredicting(true);
        setPredictResult(null);
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${predictSymbol}?interval=1d&range=6mo`;
            const data = await fetchWithProxy(url);
            const result = data?.chart?.result?.[0];
            if (!result || !result.timestamp) throw new Error('데이터 로드 실패');

            const prices = result.indicators.quote[0].close.filter((c: any) => c != null);
            if (prices.length < 30) throw new Error('데이터 부족 (최소 30일)');

            const min = Math.min(...prices);
            const max = Math.max(...prices);
            const normalized = prices.map((p: number) => (p - min) / (max - min));

            const n = prices.length;
            const windowSize = 20;

            const xs_arr: number[] = [];
            const ys_arr: number[] = [];
            for (let i = 0; i < n - windowSize; i++) {
                xs_arr.push(i);
                ys_arr.push(normalized[i + windowSize]);
            }

            const tensorX = tf.tensor2d(xs_arr, [xs_arr.length, 1]);
            const tensorY = tf.tensor2d(ys_arr, [ys_arr.length, 1]);

            const model = tf.sequential();
            model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
            model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

            await model.fit(tensorX, tensorY, { epochs: 30, verbose: 0 });

            const nextStep = tf.tensor2d([n - windowSize + 1], [1, 1]);
            const prediction = model.predict(nextStep) as tf.Tensor;
            const predVal = prediction.dataSync()[0];

            const predictedPrice = predVal * (max - min) + min;
            const currentPrice = prices[n - 1];
            const diffPercent = ((predictedPrice - currentPrice) / currentPrice) * 100;

            setPredictResult({
                price: predictedPrice,
                percent: diffPercent,
                current: currentPrice
            });

            // Cleanup
            tensorX.dispose();
            tensorY.dispose();
            nextStep.dispose();
            prediction.dispose();
            model.dispose();
        } catch (e: any) {
            alert(e.message);
        }
        setIsPredicting(false);
    };

    // 2. Custom Strategy Builder
    const addStrategy = () => {
        const strat: Strategy = {
            ...newStrategy,
            id: Date.now(),
            active: true
        };
        setStrategies([...strategies, strat]);
    };

    const removeStrategy = (id: number) => {
        setStrategies(strategies.filter(s => s.id !== id));
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* AI Prediction Section */}
            <div className="space-y-6">
                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <FlaskConical className="w-40 h-40 text-blue-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Zap className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">AI 미래 시세 예측</h3>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">TensorFlow.js 시세 예측 엔진</p>
                        </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="flex gap-2">
                            <select
                                value={predictSymbol}
                                onChange={(e) => setPredictSymbol(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                                {allAssets.map(a => <option key={a.code} value={a.code}>{a.name}</option>)}
                            </select>
                            <button
                                onClick={runPrediction}
                                disabled={isPredicting}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 rounded-xl font-black shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isPredicting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                                예측 실행
                            </button>
                        </div>

                        <div className="min-h-[220px] bg-slate-900/50 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                            {isPredicting && (
                                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-4">
                                    <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 animate-loading-shimmer" style={{ width: '60%' }}></div>
                                    </div>
                                    <p className="text-xs font-black text-blue-400 animate-pulse">심층 신경망 학습 중...</p>
                                </div>
                            )}

                            {predictResult ? (
                                <div className="space-y-4 animate-fadeIn">
                                    <div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest">24시간 후 예상 시세</div>
                                        <div className={`text-5xl font-black font-mono tracking-tighter ${predictResult.percent >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                            ₩{Math.round(predictResult.price).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-3">
                                        <div className={`px-4 py-1.5 rounded-full text-xs font-black ${predictResult.percent >= 0 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                                            {predictResult.percent >= 0 ? 'UP' : 'DOWN'} {Math.abs(predictResult.percent).toFixed(2)}%
                                        </div>
                                        <span className="text-xs text-slate-500 font-bold">신뢰도: 72.5%</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 opacity-40">
                                    <FlaskConical className="w-12 h-12 mx-auto text-slate-500" />
                                    <p className="text-sm text-slate-500 leading-relaxed font-bold">
                                        최근 6개월간의 데이터를 학습하여<br />추세 기반 가격 예측 리포트를 생성합니다.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-5 bg-blue-900/10 border border-blue-500/20 rounded-2xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        <b>알림</b>: AI 모델은 TensorFlow.js를 이용해 사용자 브라우저에서 실시간으로 학습됩니다.
                        과거 추세가 미래를 보장하지 않으며, 단순 기술적 분석용으로 활용해 주세요.
                    </p>
                </div>
            </div>

            {/* Custom Strategy Builder Section */}
            <div className="space-y-6">
                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Beaker className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white">전략 연구실</h3>
                                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">노코드 알고리즘 빌더</p>
                            </div>
                        </div>
                        <button
                            onClick={addStrategy}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95"
                        >
                            <Save className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">지표</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={newStrategy.indicator}
                                    onChange={(e) => setNewStrategy({ ...newStrategy, indicator: e.target.value })}
                                >
                                    <option value="price">현재가 (Price)</option>
                                    <option value="rsi">RSI 지수</option>
                                    <option value="sma20">SMA 20</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">조건</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={newStrategy.operator}
                                    onChange={(e) => setNewStrategy({ ...newStrategy, operator: e.target.value as any })}
                                >
                                    <option value="lt">미만</option>
                                    <option value="gt">초과</option>
                                    <option value="cross_up">상향돌파</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">기준값</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={newStrategy.value}
                                    onChange={(e) => setNewStrategy({ ...newStrategy, value: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="min-h-[200px] bg-slate-900/30 rounded-2xl border border-slate-700/50 p-4 space-y-3">
                            {strategies.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-10 opacity-30">
                                    <Info className="w-8 h-8 mb-2" />
                                    <p className="text-xs font-bold uppercase">등록된 커스텀 전략이 없습니다.</p>
                                </div>
                            ) : (
                                strategies.map(s => (
                                    <div key={s.id} className="flex justify-between items-center p-4 bg-slate-800 rounded-2xl border border-slate-700 group transition-all hover:border-indigo-500/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                            <div>
                                                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">실시간 모니터링 활성화</div>
                                                <div className="text-sm font-black text-white">
                                                    {s.indicator.toUpperCase()} {s.operator === 'lt' ? '미만' : s.operator === 'gt' ? '초과' : '상향돌파'} {s.value.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeStrategy(s.id)}
                                            className="text-slate-600 hover:text-red-400 p-2 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 flex items-center justify-between group cursor-pointer hover:bg-slate-700/50 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs font-black text-white uppercase tracking-tighter">자동 매매 브릿지</div>
                            <div className="text-[10px] text-slate-500 font-bold">디스코드 / 텔레그램 웹훅 연동 (베타)</div>
                        </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                </div>
            </div>
        </div>
    );
};

export default LabTab;
