import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ResearchService, ResearchReport, SearchProgress, DEEP_ANALYSIS_COST } from '../services/researchService';
import { PostIntegrationService, PostDraft } from '../services/postIntegrationService';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, ExternalLink, TrendingUp, AlertCircle, CheckCircle, Loader2, Share2, Send, Sparkles, Zap, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ResearchPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isResearching, setIsResearching] = useState(false);
    const [currentReport, setCurrentReport] = useState<ResearchReport | null>(null);
    const [progress, setProgress] = useState<SearchProgress[]>([]);
    const [error, setError] = useState<string | null>(null);
    // Trending Topics
    const [trendingTopics, setTrendingTopics] = useState<any[]>([]);

    // Missing States Restored
    const [recentReports, setRecentReports] = useState<ResearchReport[]>([]);
    const [isDeepAnalysis, setIsDeepAnalysis] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [postDraft, setPostDraft] = useState<PostDraft | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);

    React.useEffect(() => {
        // 최근 리포트 로드
        setRecentReports(ResearchService.getReports().slice(0, 5));

        // 트렌딩 토픽 로드
        loadTrending();
    }, []);

    const loadTrending = async () => {
        try {
            const { TrendingService } = await import('../services/trendingService');
            const topics = await TrendingService.getTechTrending();
            setTrendingTopics(topics);
        } catch (e) {
            console.error('Failed to load trending:', e);
        }
    };

    const handleResearch = async (searchQuery?: string) => {
        const queryToUse = searchQuery || query;
        if (!queryToUse.trim() || isResearching) return;
        if (!user) {
            setError('로그인이 필요합니다.');
            return;
        }

        setIsResearching(true);
        setError(null);
        setProgress([]);
        setCurrentReport(null);
        if (searchQuery) setQuery(searchQuery);

        try {
            const report = await ResearchService.performResearch(
                queryToUse,
                (progressUpdate) => {
                    setProgress(prev => [...prev.filter(p => p.step !== progressUpdate.step), progressUpdate]);
                },
                {
                    isDeepAnalysis,
                    userId: user?.id
                }
            );

            setCurrentReport(report);
            setRecentReports(ResearchService.getReports().slice(0, 5));
        } catch (err: any) {
            console.error('Research error:', err);
            setError(err.message || '리서치 중 오류가 발생했습니다.');
        } finally {
            setIsResearching(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleResearch();
        }
    };

    const getProgressIcon = (status: SearchProgress['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle size={16} className="text-green-500" />;
            case 'in-progress':
                return <Loader2 size={16} className="animate-spin text-blue-500" />;
            case 'failed':
                return <AlertCircle size={16} className="text-red-500" />;
            default:
                return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
        }
    };

    // 게시하기 버튼 클릭
    const handlePublish = async () => {
        if (!currentReport || !user) return;

        try {
            const draft = await PostIntegrationService.convertReportToPost(currentReport, user.id);
            setPostDraft(draft);
            setShowPostModal(true);
        } catch (err: any) {
            console.error('Draft creation error:', err);
            setError(err.message || '게시물 변환 중 오류가 발생했습니다.');
        }
    };

    // 게시 확정
    const handlePublishConfirm = async () => {
        if (!postDraft || !user) return;

        setIsPublishing(true);
        try {
            const postId = await PostIntegrationService.publishPost(postDraft, user.id);
            setShowPostModal(false);
            // 게시물 페이지로 이동
            navigate(`/board/${postDraft.boardId}`);
            alert('게시물이 성공적으로 발행되었습니다!');
        } catch (err: any) {
            console.error('Publish error:', err);
            setError(err.message || '게시 중 오류가 발생했습니다.');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 overflow-x-hidden">
            <div className="max-w-6xl mx-auto">
                {/* 헤더 */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                        🔍 AI Research Agent
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        궁금한 것을 검색하고, AI가 분석한 리포트를 받아보세요
                    </p>
                </div>

                {/* 검색 입력 */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="예: 양자컴퓨터의 최신 동향은?"
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isResearching}
                            style={{ fontSize: '16px' }}
                        />
                        <button
                            onClick={() => handleResearch()}
                            disabled={!query.trim() || isResearching}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        >
                            {isResearching ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    리서치중...
                                </>
                            ) : (
                                <>
                                    <Search size={20} />
                                    검색
                                </>
                            )}
                        </button>
                    </div>

                    {/* 심화 분석 토글 */}
                    <div className="mt-4 flex items-center gap-3">
                        <button
                            onClick={() => setIsDeepAnalysis(!isDeepAnalysis)}
                            className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all ${isDeepAnalysis
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Zap size={18} />
                            심화 분석
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isDeepAnalysis ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                }`}>
                                {DEEP_ANALYSIS_COST}CR
                            </span>
                        </button>
                        {isDeepAnalysis && (
                            <span className="text-sm text-amber-600 dark:text-amber-400">
                                ⚡ 더 깊이 있는 분석과 더 많은 출처를 검토합니다
                            </span>
                        )}
                    </div>

                    {/* 추천 질문 */}
                    {!isResearching && !currentReport && (
                        <div className="mt-4">
                            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">AI Research Agent</h1>
                            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                                최신 AI 모델과 실시간 웹 검색을 통해 심도 있는 기술 리포트를 작성합니다.
                            </p>

                            {/* Trending Keywords */}
                            {trendingTopics.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-3xl mx-auto">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mr-2 bg-cyan-950/30 px-2 py-1 rounded backdrop-blur-sm border border-cyan-900/50">
                                        <TrendingUp size={12} /> GLOBAL TRENDS
                                    </div>
                                    {trendingTopics.slice(0, 5).map((topic, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleResearch(topic.title)}
                                            className="px-3 py-1 bg-gray-800/50 hover:bg-indigo-600/50 border border-gray-700/50 hover:border-indigo-500 text-gray-300 hover:text-white text-xs rounded-full transition-all flex items-center gap-1 group"
                                        >
                                            <span className="opacity-50 text-[10px] group-hover:text-indigo-300">#{i + 1}</span>
                                            {topic.title.length > 20 ? topic.title.substring(0, 20) + '...' : topic.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <p className="text-sm text-gray-500 mb-2">💡 추천 질문:</p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    '양자컴퓨터의 최신 동향은?',
                                    'NFT 시장 전망은?',
                                    '탄소중립 기술 현황',
                                    '메타버스의 미래'
                                ].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => setQuery(q)}
                                        className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 에러 표시 */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                {/* 검색 진행 상황 */}
                {isResearching && progress.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-500" />
                            검색 진행 상황
                        </h3>
                        <div className="space-y-3">
                            {progress.map((p, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    {getProgressIcon(p.status)}
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{p.step}</p>
                                        {p.details && (
                                            <p className="text-xs text-gray-500 mt-1">{p.details}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 리포트 표시 */}
                {currentReport && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-black">{currentReport.query}</h2>
                            <button
                                onClick={handlePublish}
                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                            >
                                <Share2 size={16} />
                                게시하기
                            </button>
                        </div>

                        {/* AI 모델 정보 */}
                        <div className="mb-4 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center gap-2 text-sm">
                            <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                                Powered by Groq GPT-oss-120B
                            </span>
                        </div>

                        {/* 심화 분석 배지 */}
                        {currentReport.isDeepAnalysis && (
                            <div className="mb-4 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center gap-2 text-sm">
                                <Zap size={16} className="text-amber-600 dark:text-amber-400" />
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                    ⚡ 심화 분석 리포트 (50CR 소모)
                                </span>
                            </div>
                        )}

                        {/* 전체 리포트 (한 번만 표시) */}
                        <div className="mb-6">
                            <div className="prose dark:prose-invert max-w-none prose-headings:text-blue-600 dark:prose-headings:text-blue-400 prose-strong:text-gray-900 dark:prose-strong:text-gray-100">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentReport.detailedAnalysis}</ReactMarkdown>
                            </div>
                        </div>

                        {/* 후속 질문 */}
                        {currentReport.followUpQuestions && currentReport.followUpQuestions.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <MessageCircle size={20} />
                                    이어서 물어보기
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {currentReport.followUpQuestions.map((fq, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setQuery(fq);
                                                setCurrentReport(null);
                                            }}
                                            className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"
                                        >
                                            <span>💬</span>
                                            {fq}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 출처 */}
                        <div className="mb-6">
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <FileText size={20} />
                                출처 ({currentReport.sources.length})
                            </h3>
                            <div className="space-y-2">
                                {currentReport.sources.map((source, idx) => (
                                    <a
                                        key={idx}
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm text-blue-600 dark:text-blue-400">{source.title}</p>
                                                <p className="text-xs text-gray-500 mt-1">{source.snippet}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs text-gray-400">{source.domain}</span>
                                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                                                        신뢰도: {source.trustScore}
                                                    </span>
                                                </div>
                                            </div>
                                            <ExternalLink size={16} className="text-gray-400 flex-shrink-0" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* 관련 주제 */}
                        {currentReport.relatedTopics.length > 0 && (
                            <div>
                                <h3 className="font-bold text-lg mb-2">🔗 관련 주제</h3>
                                <div className="flex flex-wrap gap-2">
                                    {currentReport.relatedTopics.map((topic, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { setQuery(topic); handleResearch(); }}
                                            className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                                        >
                                            {topic.replace(/\*\*/g, '')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 최근 리포트 */}
                {!isResearching && !currentReport && recentReports.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
                        <h3 className="font-bold text-lg mb-4">📚 최근 리포트</h3>
                        <div className="space-y-3">
                            {recentReports.map((report) => (
                                <button
                                    key={report.id}
                                    onClick={() => setCurrentReport(report)}
                                    className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <p className="font-medium">{report.query}</p>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{report.summary}</p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        {new Date(report.createdAt).toLocaleDateString('ko-KR')} • {report.sources.length}개 출처
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 게시 미리보기 모달 */}
                {showPostModal && postDraft && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPostModal(false)}>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-black">게시물 미리보기</h3>
                                <button onClick={() => setShowPostModal(false)} className="text-gray-400 hover:text-gray-600">
                                    ✕
                                </button>
                            </div>

                            {/* 게시판 & 태그 */}
                            <div className="mb-4 flex items-center gap-2 flex-wrap">
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                                    📌 {postDraft.boardId} 게시판
                                </span>
                                {postDraft.tags.map((tag, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            {/* 제목 */}
                            <h4 className="text-xl font-bold mb-4">{postDraft.title}</h4>

                            {/* 본문 미리보기 */}
                            <div className="prose dark:prose-invert max-w-none mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl max-h-96 overflow-y-auto">
                                <ReactMarkdown>{postDraft.content}</ReactMarkdown>
                            </div>

                            {/* 버튼 */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowPostModal(false)}
                                    className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold hover:opacity-90 transition-opacity"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handlePublishConfirm}
                                    disabled={isPublishing}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPublishing ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            발행 중...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={20} />
                                            게시하기
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResearchPage;
