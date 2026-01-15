import React, { useState, useEffect } from 'react';
import { Bug, X, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BugReportWidget: React.FC = () => {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    // 하루 동안 보지 않기 체크
    useEffect(() => {
        const hideUntil = localStorage.getItem('bugReportHideUntil');
        if (hideUntil) {
            const hideDate = new Date(hideUntil);
            if (new Date() < hideDate) {
                setIsVisible(false);
            } else {
                localStorage.removeItem('bugReportHideUntil');
            }
        }
    }, []);

    const handleHideForDay = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        localStorage.setItem('bugReportHideUntil', tomorrow.toISOString());
        setIsVisible(false);
    };

    const handleReport = () => {
        // 버그 신고 페이지로 이동 (특별 파라미터 포함)
        navigate('/write?type=bug_report');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed right-4 bottom-40 z-40 transition-all duration-300">
            {isExpanded ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-red-200 dark:border-red-800 w-64 overflow-hidden animate-fade-in">
                    {/* 헤더 */}
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bug size={18} />
                            <span className="font-bold text-sm">버그/오류 신고</span>
                        </div>
                        <button onClick={() => setIsExpanded(false)} className="hover:bg-white/20 rounded p-1">
                            <ChevronDown size={16} />
                        </button>
                    </div>

                    {/* 본문 */}
                    <div className="p-4 space-y-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            문제가 발생했나요? 버그나 오류를 신고해주세요!<br />
                            <span className="text-green-600 font-medium">💎 크레딧 소모 없음</span>
                        </p>

                        <button
                            onClick={handleReport}
                            className="w-full py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            <AlertCircle size={16} />
                            문제 신고하기
                        </button>

                        <button
                            onClick={handleHideForDay}
                            className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            오늘 하루 보지 않기
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="group flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                    <Bug size={18} />
                    <span className="text-sm font-bold hidden group-hover:inline">버그 신고</span>
                    <ChevronUp size={14} className="group-hover:hidden" />
                </button>
            )}
        </div>
    );
};

export default BugReportWidget;
