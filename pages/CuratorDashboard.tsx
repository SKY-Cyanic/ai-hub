/**
 * AI Curator Dashboard - Phase 4 Enhanced
 * 자동 매시 큐레이션 관리 UI + 분석 대시보드
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CuratorService, CuratorConfig, CuratorLog } from '../services/curatorService';
import { getAutoCuratorScheduler, initAutoCurator } from '../services/curatorScheduler';
import { ResearchAnalyticsService, UsageStats } from '../services/researchAnalyticsService';
import { CuratorAnalyticsService, PerformanceReport, DailyStats } from '../services/curatorAnalyticsService';
import { Bot, Play, Settings, Activity, Clock, TrendingUp, CheckCircle, BarChart3, Target, Zap, AlertTriangle, XCircle, SkipForward, ExternalLink, StopCircle, RefreshCw, PieChart, Calendar, Award, TrendingDown } from 'lucide-react';


const CuratorDashboard: React.FC = () => {
    const { user } = useAuth();
    const [config, setConfig] = useState<CuratorConfig>(CuratorService.loadConfig());
    const [logs, setLogs] = useState<CuratorLog[]>([]);
    const [schedulerStatus, setSchedulerStatus] = useState<any>({
        isRunning: false,
        lastRunHour: -1,
        lastRunDate: '',
        nextRunHour: -1,
        isProcessing: false,
        emergencyStop: false
    });
    const [isManualRunning, setIsManualRunning] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // 📊 D3: Research Analytics
    const [analyticsStats, setAnalyticsStats] = useState<UsageStats | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);

    // 페이지 로드 시 자동 스케줄러 시작
    useEffect(() => {
        if (user) {
            // 자동 스케줄러 초기화 (매시 정각 자동 실행)
            initAutoCurator(user.id);
        }
        loadData();

        // 1초마다 상태 갱신
        const interval = setInterval(() => {
            setCurrentTime(new Date());
            if (user) {
                const scheduler = getAutoCuratorScheduler(user.id);
                setSchedulerStatus(scheduler.getStatus());
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [user]);

    const loadData = () => {
        setConfig(CuratorService.loadConfig());
        setLogs(CuratorService.getLogs());

        // 📊 Analytics 데이터 로드
        try {
            setAnalyticsStats(ResearchAnalyticsService.getUsageStats());
        } catch (e) {
            console.error('Analytics load failed:', e);
        }

        if (user) {
            const scheduler = getAutoCuratorScheduler(user.id);
            setSchedulerStatus(scheduler.getStatus());
        }
    };

    // 긴급 중단 토글
    const handleEmergencyStop = () => {
        if (!user) return;
        const scheduler = getAutoCuratorScheduler(user.id);

        if (schedulerStatus.emergencyStop) {
            scheduler.clearEmergencyStop();
            scheduler.startAutoScheduler();
        } else {
            scheduler.emergencyStopNow();
        }
        loadData();
    };

    const handleConfigChange = (key: keyof CuratorConfig, value: any) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        CuratorService.saveConfig(newConfig);
    };

    const handleManualRun = async () => {
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        setIsManualRunning(true);

        try {
            const scheduler = getAutoCuratorScheduler(user.id);
            await scheduler.runNow();
            alert('수동 큐레이션이 완료되었습니다!');
            loadData();
        } catch (error) {
            alert('큐레이션 실패: ' + error);
        } finally {
            setIsManualRunning(false);
        }
    };

    // 시간 포맷
    const formatHour = (hour: number) => {
        if (hour < 0) return '--:00';
        return `${hour.toString().padStart(2, '0')}:00`;
    };

    const getTimeUntilNextRun = () => {
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();
        const nextHour = schedulerStatus.nextRunHour;

        if (nextHour < 0) return '대기 중';

        let hoursUntil = nextHour - currentHour;
        if (hoursUntil <= 0) hoursUntil += 24;

        const minutesUntil = 60 - currentMinute;
        if (minutesUntil === 60) {
            return `${hoursUntil}시간 후`;
        }
        return `${hoursUntil - 1}시간 ${minutesUntil}분 후`;
    };

    // 타임스탬프 포맷
    const formatTime = (timestamp: number) => {
        if (!timestamp) return '없음';
        return new Date(timestamp).toLocaleString('ko-KR');
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* 현재 시간 */}
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-lg">현재 시간</h3>
                            <Clock className="w-6 h-6" />
                        </div>
                        <div className="text-3xl font-mono font-bold">
                            {currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <p className="text-sm text-blue-100 mt-1">
                            매시 정각 자동 실행
                        </p>
                    </div>

                    {/* 스케줄러 상태 */}
                    <div className={`rounded-xl shadow-lg p-6 ${schedulerStatus.emergencyStop
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : 'bg-white dark:bg-gray-800'
                        }`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">스케줄러</h3>
                            {schedulerStatus.isProcessing ? (
                                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                            ) : schedulerStatus.emergencyStop ? (
                                <StopCircle className="w-6 h-6 text-red-500" />
                            ) : (
                                <Activity className={`w-6 h-6 ${schedulerStatus.isRunning ? 'text-green-500' : 'text-gray-400'}`} />
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">상태:</span>
                                <span className={`font-semibold ${schedulerStatus.emergencyStop ? 'text-red-600' :
                                    schedulerStatus.isRunning ? 'text-green-600' : 'text-gray-500'
                                    }`}>
                                    {schedulerStatus.emergencyStop ? '긴급 중단' :
                                        schedulerStatus.isProcessing ? '처리 중...' :
                                            schedulerStatus.isRunning ? '자동 실행' : 'OFF'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">마지막:</span>
                                <span className="text-gray-900 dark:text-white">
                                    {schedulerStatus.lastRunHour >= 0
                                        ? `${formatHour(schedulerStatus.lastRunHour)} (${schedulerStatus.lastRunDate?.slice(5)})`
                                        : '없음'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">다음:</span>
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                    {formatHour(schedulerStatus.nextRunHour)} ({getTimeUntilNextRun()})
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
                        {/* 🕐 자동 실행 정보 */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-green-600" />
                                <h4 className="font-semibold text-gray-900 dark:text-white">자동 매시 실행</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                매시 정각(00분~05분)에 자동으로 트렌딩 토픽을 수집하고 리서치 게시물을 생성합니다.
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs">
                                {Array.from({ length: 24 }, (_, i) => (
                                    <span
                                        key={i}
                                        className={`px-2 py-1 rounded ${i === currentTime.getHours()
                                            ? 'bg-green-600 text-white'
                                            : 'bg-white/50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        {i.toString().padStart(2, '0')}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* 🚨 긴급 중단 */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <StopCircle className="w-5 h-5 text-red-500" />
                                    긴급 중단
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {schedulerStatus.emergencyStop
                                        ? '중단됨 - 클릭하여 재개'
                                        : '클릭하면 모든 자동 실행 중단'}
                                </p>
                            </div>
                            <button
                                onClick={handleEmergencyStop}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all ${schedulerStatus.emergencyStop
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                    }`}
                            >
                                {schedulerStatus.emergencyStop ? '재개하기' : '긴급 중단'}
                            </button>
                        </div>

                        {/* 최대 게시 수 */}
                        <div>
                            <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                                최대 게시 수/일: {config.maxPostsPerDay}개
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="24"
                                value={config.maxPostsPerDay}
                                onChange={(e) => handleConfigChange('maxPostsPerDay', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            />
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                                <span>1개</span>
                                <span>24개 (매시간)</span>
                            </div>
                        </div>

                        {/* 📊 품질 & 다양성 설정 (정보 표시) */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Target className="w-5 h-5 text-indigo-600" />
                                품질 & 다양성 기준
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-gray-600 dark:text-gray-400">최소 품질: 6/10점</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-gray-600 dark:text-gray-400">신뢰 출처: 60%+</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-gray-600 dark:text-gray-400">중복 제한: 70%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-gray-600 dark:text-gray-400">연속 카테고리 방지</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-gray-600 dark:text-gray-400">키워드 50% 제한</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-gray-600 dark:text-gray-400">출처 균형 유지</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                * 기준 미충족 시 자동 건너뜀
                            </p>
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

                {/* 📊 D3: Research Analytics 패널 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-indigo-600" />
                            <h3 className="font-bold text-xl text-gray-900 dark:text-white">Research Analytics</h3>
                        </div>
                        <button
                            onClick={() => setShowAnalytics(!showAnalytics)}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            {showAnalytics ? '접기' : '펼치기'}
                        </button>
                    </div>

                    {showAnalytics && analyticsStats && (
                        <div className="space-y-6">
                            {/* 핵심 지표 */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target className="w-5 h-5 text-blue-600" />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">총 검색</span>
                                    </div>
                                    <div className="text-2xl font-bold text-blue-600">{analyticsStats.totalSearches}</div>
                                </div>

                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-5 h-5 text-purple-600" />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">심화 분석</span>
                                    </div>
                                    <div className="text-2xl font-bold text-purple-600">{analyticsStats.deepAnalysisCount}</div>
                                </div>

                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">캐시 히트</span>
                                    </div>
                                    <div className="text-2xl font-bold text-green-600">{(analyticsStats.cacheHitRate * 100).toFixed(1)}%</div>
                                </div>

                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-5 h-5 text-amber-600" />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">평균 응답</span>
                                    </div>
                                    <div className="text-2xl font-bold text-amber-600">{(analyticsStats.avgResponseTime / 1000).toFixed(1)}s</div>
                                </div>
                            </div>

                            {/* 에러율 경고 */}
                            {analyticsStats.errorRate > 0.1 && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span>에러율이 높습니다: {(analyticsStats.errorRate * 100).toFixed(1)}%</span>
                                </div>
                            )}

                            {/* 인기 검색어 */}
                            {analyticsStats.topQueries.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">🔥 인기 검색어</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {analyticsStats.topQueries.slice(0, 5).map((q, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                                            >
                                                {q.query.substring(0, 20)}... ({q.count})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 일별 사용량 */}
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">📈 일별 사용량 (최근 7일)</h4>
                                <div className="flex items-end gap-1 h-20">
                                    {analyticsStats.dailyUsage.map((day, i) => {
                                        const maxCount = Math.max(...analyticsStats.dailyUsage.map(d => d.count), 1);
                                        const height = (day.count / maxCount) * 100;
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center">
                                                <div
                                                    className="w-full bg-indigo-500 rounded-t"
                                                    style={{ height: `${Math.max(height, 5)}%` }}
                                                    title={`${day.date}: ${day.count}건`}
                                                />
                                                <span className="text-xs text-gray-500 mt-1">
                                                    {new Date(day.date).getDate()}일
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {!showAnalytics && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            클릭하여 리서치 사용 통계를 확인하세요
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CuratorDashboard;
