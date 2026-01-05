import React from 'react';
import { Sparkles } from 'lucide-react';

const SystemStatus: React.FC = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-indigo-600 dark:text-cyan-400 uppercase flex items-center gap-2">
                    <Sparkles size={14} /> System Status
                </h3>
                <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">Running</span>
            </div>
            <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <h4 className="font-bold text-xs dark:text-white mb-1">📢 v2.0 NEXUS MARKET 오픈</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                        - 🌈 무지개 닉네임 & 👾 글리치 효과 추가<br />
                        - 🎁 미스테리 박스 & 🎟️ 주간 복권 시스템<br />
                        - 📚 위키 개편 (나무위키 스타일 & 다국어 지원)
                    </p>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <h4 className="font-bold text-xs text-indigo-700 dark:text-indigo-300 mb-1">💎 희귀 뱃지를 찾아라!</h4>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 leading-relaxed">
                        미스테리 박스에서만 나오는 레전더리 뱃지[💎]를 획득해보세요.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SystemStatus;
