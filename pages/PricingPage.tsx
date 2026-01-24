
import React, { useState } from 'react';
import { Check, Star, Zap, Crown, Shield, X, Rocket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { useNavigate } from 'react-router-dom';

const PricingPage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [isYearly, setIsYearly] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleUpgrade = async () => {
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        if (user.membership_tier === 'pro') {
            alert('이미 Pro 멤버십을 이용 중입니다.');
            return;
        }

        if (!confirm('AI Hub Pro 멤버십을 구독하시겠습니까?\n(테스트 모드: 실제 결제되지 않음)')) {
            return;
        }

        setIsProcessing(true);
        try {
            // Simulate payment delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            const success = await storage.upgradeToPro(user.id);
            if (success) {
                await refreshUser();
                alert('환영합니다! Pro 멤버십이 활성화되었습니다.\n가입 보너스 500 CR이 지급되었습니다.');
                navigate('/');
            } else {
                alert('업그레이드 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error(error);
            alert('오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white pt-10 pb-20 px-4">
            {/* Header */}
            <div className="text-center mb-16 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-bold mb-4 animate-pulse">
                    <Crown size={16} /> 2026 Special Launch Offer
                </div>
                <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Unlock the Full Power of AI
                </h1>
                <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
                    단순한 사용자를 넘어, <span className="text-white font-bold">생태계의 지배자</span>가 되세요.
                    압도적인 성능과 경제적 혜택이 당신을 기다립니다.
                </p>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center gap-4 mt-8">
                    <span className={`text-sm font-bold ${!isYearly ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
                    <button
                        onClick={() => setIsYearly(!isYearly)}
                        className="w-14 h-7 bg-slate-700 rounded-full relative transition-colors duration-300 focus:outline-none"
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${isYearly ? 'left-8' : 'left-1'}`}></div>
                    </button>
                    <span className={`text-sm font-bold ${isYearly ? 'text-white' : 'text-slate-500'}`}>
                        Yearly <span className="text-green-400 text-xs ml-1">(Save 20%)</span>
                    </span>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Free Plan */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-slate-600 transition-all">
                    <h3 className="text-xl font-bold text-slate-300">Basic</h3>
                    <div className="my-6">
                        <span className="text-4xl font-black">Free</span>
                    </div>
                    <p className="text-slate-400 text-sm mb-8 min-h-[40px]">AI Hub를 체험하고 싶은 입문자를 위한 기본 플랜</p>
                    <button className="w-full py-3 rounded-xl border border-slate-600 font-bold hover:bg-slate-700 transition" disabled>
                        현재 이용 중
                    </button>
                    <div className="mt-8 space-y-4">
                        <FeatureItem text="Flux Schnell 모델 (기본 속도)" />
                        <FeatureItem text="일일 이미지 생성 5회" />
                        <FeatureItem text="기본 리서치 리포트" />
                        <FeatureItem text="커뮤니티 이용" />
                    </div>
                </div>

                {/* Pro Plan (Hero) */}
                <div className="relative bg-gradient-to-b from-indigo-900/80 to-slate-900 border border-indigo-500/50 rounded-2xl p-8 transform md:-translate-y-4 shadow-2xl shadow-indigo-900/30">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                        Most Popular
                    </div>
                    <h3 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
                        <Zap size={20} className="fill-indigo-300" /> Pro
                    </h3>
                    <div className="my-6">
                        <span className="text-5xl font-black text-white">₩{isYearly ? '7,900' : '9,900'}</span>
                        <span className="text-slate-400 text-sm font-medium">/월</span>
                    </div>
                    <p className="text-indigo-100/80 text-sm mb-8 min-h-[40px]">
                        전문 크리에이터와 투자자를 위한<br />
                        <span className="font-bold text-yellow-300">압도적인 성능과 혜택</span>
                    </p>
                    <button
                        onClick={handleUpgrade}
                        disabled={isProcessing || user?.membership_tier === 'pro'}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2
                        ${user?.membership_tier === 'pro'
                                ? 'bg-green-600 cursor-default'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white'}`}
                    >
                        {isProcessing ? '처리 중...' : (user?.membership_tier === 'pro' ? '이용 중입니다' : '지금 시작하기 🚀')}
                    </button>
                    <div className="mt-8 space-y-4">
                        <FeatureItem text="Flux Ultra 모델 (초고화질)" highlight />
                        <FeatureItem text="이미지 생성 무제한" highlight />
                        <FeatureItem text="고속 전용 서버 (Fast Lane)" highlight />
                        <FeatureItem text="심화 리서치 & PDF 다운로드" />
                        <FeatureItem text="매월 1,000 CR 추가 지급" icon={<Crown size={16} className="text-yellow-400" />} />
                        <FeatureItem text="닉네임 'Pro' 황금 뱃지" icon={<Star size={16} className="text-yellow-400" />} />
                    </div>
                </div>

                {/* Enterprise/Invest Plan */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-slate-600 transition-all opacity-80 hover:opacity-100">
                    <h3 className="text-xl font-bold text-slate-300">Whale</h3>
                    <div className="my-6">
                        <span className="text-4xl font-black">Contact</span>
                    </div>
                    <p className="text-slate-400 text-sm mb-8 min-h-[40px]">전용 에이전트 개발 및 대규모 API 사용을 위한 기업용 플랜</p>
                    <button className="w-full py-3 rounded-xl border border-slate-600 font-bold hover:bg-slate-700 transition" onClick={() => alert('준비 중입니다.')}>
                        문의하기
                    </button>
                    <div className="mt-8 space-y-4">
                        <FeatureItem text="전용 AI 모델 파인튜닝" />
                        <FeatureItem text="무제한 API 호출" />
                        <FeatureItem text="전담 매니저 배정" />
                        <FeatureItem text="SLA 99.9% 보장" />
                    </div>
                </div>
            </div>

            {/* FAQ */}
            <div className="max-w-3xl mx-auto mt-20">
                <h2 className="text-2xl font-bold text-center mb-8">자주 묻는 질문</h2>
                <div className="space-y-4">
                    <FAQItem q="언제든지 해지할 수 있나요?" a="네, 물론입니다. 마이페이지에서 언제든지 구독을 취소할 수 있으며, 남은 기간 동안은 혜택이 유지됩니다." />
                    <FAQItem q="연간 결제 시 혜택이 있나요?" a="연간 결제 시 약 20% 할인된 가격으로 이용하실 수 있습니다." />
                    <FAQItem q="크레딧(CR)은 어떻게 지급되나요?" a="Pro 회원은 매월 갱신일마다 1,000 CR이 자동으로 지갑에 충전됩니다." />
                </div>
            </div>
        </div>
    );
};

const FeatureItem = ({ text, highlight, icon }: { text: string, highlight?: boolean, icon?: React.ReactNode }) => (
    <div className={`flex items-center gap-3 ${highlight ? 'text-white font-medium' : 'text-slate-400'}`}>
        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${highlight ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-500'}`}>
            {icon || <Check size={12} />}
        </div>
        <span className="text-sm">{text}</span>
    </div>
);

const FAQItem = ({ q, a }: { q: string, a: string }) => (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h4 className="font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-indigo-400">Q.</span> {q}
        </h4>
        <p className="text-slate-400 text-sm pl-6">{a}</p>
    </div>
);

export default PricingPage;
