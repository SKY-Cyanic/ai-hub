/**
 * AI Curator Dashboard - Phase 4
 * 큐레이터 관리 UI
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CuratorService, CuratorConfig, CuratorLog } from '../services/curatorService';
import { getCuratorScheduler } from '../services/curatorScheduler';
import { Bot, Play, Square, Settings, Activity, Clock, TrendingUp, CheckCircle, XCircle, SkipForward, ExternalLink } from 'lucide-react';

const CuratorDashboard: React.FC = () => {
    const { user } = useAuth();
    const [config, setConfig] = useState<CuratorConfig>(CuratorService.loadConfig());
    const [logs, setLogs] = useState<CuratorLog[]>([]);
    const [schedulerStatus, setSchedulerStatus] = useState<any>({ isRunning: false, lastRun: 0, nextRun: 0 });
    const [isManualRunning, setIsManualRunning] = useState(false);

    // 페이지 로드 시 설정 및 로그 로드
    useEffect(() => {
        loadData();

        // 1초마다 상태 갱신
        const interval = setInterval(() => {
            if (user) {
                const scheduler = getCuratorScheduler(user.id);
                setSchedulerStatus(scheduler.getStatus());
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [user]);

    const loadData = () => {
        setConfig(CuratorService.loadConfig());
        setLogs(CuratorService.getLogs());

        if (user) {
            const scheduler = getCuratorScheduler(user.id);
            setSchedulerStatus(scheduler.getStatus());
        }
    };

    const handleToggle = () => {
        const newConfig = { ...config, enabled: !config.enabled };
        setConfig(newConfig);
        CuratorService.saveConfig(newConfig);

        if (user) {
            const scheduler = getCuratorScheduler(user.id);

            if (newConfig.enabled) {
                scheduler.start(newConfig);
            } else {
                scheduler.stop();
            }
        }
    };

    const handleConfigChange = (key: keyof CuratorConfig, value: any) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        CuratorService.saveConfig(newConfig);

        // 스케줄러가 실행 중이면 재시작
        if (config.enabled && user) {
            const scheduler = getCuratorScheduler(user.id);
            scheduler.stop();
            scheduler.start(newConfig);
        }
    };

    const handleManualRun = async () => {
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        setIsManualRunning(true);

        try {
            const scheduler = getCuratorScheduler(user.id);
            await scheduler.runNow(config);
            alert('수동 큐레이션이 완료되었습니다!');
            loadData(); // 로그 갱신
        } catch (error) {
            alert('큐레이션 실패: ' + error);
        } finally {
            setIsManualRunning(false);
        }
    };

    const formatTime = (timestamp: number) => {
        if (!timestamp) return '없음';
        return new Date(timestamp).toLocaleString('ko-KR');
    };

    const getTimeRemaining = (nextRun: number) => {
        if (!nextRun) return '없음';

        const remaining = nextRun - Date.now();
        if (remaining < 0) return '곧 실행';

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}시간 ${minutes}분 후`;
    };

    const todayPostCount = CuratorService.getTodayPostCount();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="container mx-auto px-4 max-w-6xl">
                {/* 헤더 */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-3">
                        <Bot className="w-10 h-10 text-blue-600" />
                        AI Curator Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        자동 트렌딩 토픽 수집 & 게시 관리
                    </p>
                </div>

                {/* 상태 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {/* 스케줄러 상태 */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">스케줄러</h3>
                            <Activity className={`w-6 h-6 ${schedulerStatus.isRunning ? 'text-green-500' : 'text-gray-400'}`} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">상태:</span>
                                <span className={`font-semibold ${schedulerStatus.isRunning ? 'text-green-600' : 'text-gray-500'}`}>
                                    {schedulerStatus.isRunning ? 'ON' : 'OFF'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">마지막 실행:</span>
                                <span className="text-gray-900 dark:text-white text-xs">
                                    {formatTime(schedulerStatus.lastRun)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">다음 실행:</span>
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                    {getTimeRemaining(schedulerStatus.nextRun)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 오늘 게시 현황 */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">오늘 게시</h3>
                            <TrendingUp className="w-6 h-6 text-purple-500" />
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                                {todayPostCount} / {config.maxPostsPerDay}
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-purple-600 h-2 rounded-full transition-all"
                                    style={{ width: `${(todayPostCount / config.maxPostsPerDay) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 성공률 */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">성공률</h3>
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                        <div className="text-center">
                            {(() => {
                                const total = logs.length;
                                const success = logs.filter(l => l.status === 'success').length;
                                const rate = total > 0 ? Math.round((success / total) * 100) : 0;
                                return (
                                    <>
                                        <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                                            {rate}%
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {success} / {total} 성공
                                        </p>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* 설정 패널 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
                    <div className="flex items-center gap-2 mb-6">
                        <Settings className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white">설정</h3>
                    </div>

                    <div className="space-y-6">
                        {/* ON/OFF */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">큐레이터 활성화</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">자동 큐레이션 시작/중지</p>
                            </div>
                            <button
                                onClick={handleToggle}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${config.enabled ? 'bg-green-600' : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {/* 실행 주기 */}
                        <div>
                            <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                                실행 주기: {config.intervalHours}시간마다
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="24"
                                value={config.intervalHours}
                                onChange={(e) => handleConfigChange('intervalHours', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            />
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                                <span>1시간</span>
                                <span>24시간</span>
                            </div>
                        </div>

                        {/* 최대 게시 수 */}
                        <div>
                            <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                                최대 게시 수/일: {config.maxPostsPerDay}개
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={config.maxPostsPerDay}
                                onChange={(e) => handleConfigChange('maxPostsPerDay', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            />
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                                <span>1개</span>
                                <span>10개</span>
                            </div>
                        </div>

                        {/* 수동 실행 버튼 */}
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleManualRun}
                                disabled={isManualRunning || !user}
                                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {isManualRunning ? (
                                    <>
                                        <Clock className="w-5 h-5 animate-spin" />
                                        실행 중...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-5 h-5" />
                                        지금 실행
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                                트렌딩 토픽을 즉시 수집하고 게시합니다
                            </p>
                        </div>
                    </div>
                </div>

                {/* 큐레이션 로그 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white">큐레이션 로그</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">시간</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">토픽</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">출처</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">상태</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">링크</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            아직 큐레이션 기록이 없습니다
                                        </td>
                                    </tr>
                                ) : (
                                    logs.slice(0, 20).map((log) => (
                                        <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                                                {formatTime(log.timestamp)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                                                {log.topic}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded">
                                                    {(log.source || 'unknown').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {log.status === 'success' && (
                                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                                                        <CheckCircle className="w-4 h-4" />
                                                        성공
                                                    </span>
                                                )}
                                                {log.status === 'failed' && (
                                                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                                                        <XCircle className="w-4 h-4" />
                                                        실패
                                                    </span>
                                                )}
                                                {log.status === 'skipped' && (
                                                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm">
                                                        <SkipForward className="w-4 h-4" />
                                                        건너뜀
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {log.postId && (
                                                    <a
                                                        href={`/post/${log.postId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        보기
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CuratorDashboard;
