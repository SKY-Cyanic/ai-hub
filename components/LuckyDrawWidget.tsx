
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { Gift, Zap, Sparkles, Loader } from 'lucide-react';

const LuckyDrawWidget: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState<{ amount: number, message: string } | null>(null);
    const [hasDrawnToday, setHasDrawnToday] = useState(false);

    useEffect(() => {
        if (user?.quests?.lucky_draw_today) {
            setHasDrawnToday(true);
        } else {
            setHasDrawnToday(false);
        }
    }, [user]);

    const handleDraw = async () => {
        console.log('Lucky draw initiated', { userId: user?.id, hasDrawnToday });
        if (!user) return alert('접근 코드가 필요합니다. (로그인 필요)');
        if (hasDrawnToday) return alert('이미 오늘 분량의 연구 자금을 수령하셨습니다.');

        setIsSpinning(true);

        try {
            // 시뮬레이션된 지연 (긴장감 조성)
            await new Promise(r => setTimeout(r, 1500));

            const amounts = [10, 20, 30, 50, 100, 200, 500];
            const weights = [0.4, 0.25, 0.15, 0.1, 0.05, 0.03, 0.02];

            let random = Math.random();
            let cumulative = 0;
            let amount = 10;

            for (let i = 0; i < weights.length; i++) {
                cumulative += weights[i];
                if (random < cumulative) {
                    amount = amounts[i];
                    break;
                }
            }

            console.log('Winner amount calculated:', amount);
            const success = await storage.givePoints(user.id, amount, `데일리 럭키 드로우 보너스: ${amount} CR`);
            console.log('Result of givePoints:', success);

            if (success) {
                // 활동 기록
                storage.logActivity({
                    type: 'shop',
                    user_id: user.id,
                    user_name: user.nickname,
                    content: `럭키 드로우를 통해 연구 자금 ${amount} CR을 지원받았습니다!`,
                    link: '/shop'
                });

                setResult({ amount, message: amount >= 100 ? 'JACKPOT!' : 'CR RECEIVED' });
                setHasDrawnToday(true);
                refreshUser();
            } else {
                alert('자금 신청 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
            }
        } catch (error) {
            console.error('Lucky draw error:', error);
            alert('시스템 통신 오류가 발생했습니다.');
        } finally {
            setIsSpinning(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-indigo-600 dark:text-cyan-400 uppercase flex items-center gap-2">
                        <Gift size={14} /> Lucky Protocol
                    </h3>
                    {hasDrawnToday && (
                        <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black">COLLECTED</span>
                    )}
                </div>

                {result ? (
                    <div className="py-4 text-center animate-zoom-in">
                        <div className="text-[10px] font-black text-gray-400 uppercase mb-1">{result.message}</div>
                        <div className="text-3xl font-black text-indigo-600 dark:text-cyan-400">+{result.amount} <span className="text-sm">CR</span></div>
                        <button
                            onClick={() => setResult(null)}
                            className="mt-4 text-[10px] font-black text-gray-400 hover:text-indigo-500 uppercase tracking-widest"
                        >
                            닫기
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                            매일 한 번, 무작위 연구 지원금을 신청하세요. 최대 <span className="text-indigo-500 font-bold font-mono">500 CR</span>의 잭팟 기회가 있습니다.
                        </p>

                        <button
                            onClick={handleDraw}
                            disabled={isSpinning || hasDrawnToday}
                            className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${hasDrawnToday
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700'
                                }`}
                        >
                            {isSpinning ? (
                                <Loader size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Zap size={18} fill="currentColor" />
                                    <span className="text-sm font-black uppercase tracking-wider">지원금 신청</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LuckyDrawWidget;
