import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { WikiPage as WikiPageType } from '../types';
import { Book, Edit3, Save, ArrowLeft, Globe, Clock, User as UserIcon, Network, FileText, Share2, Maximize, X } from 'lucide-react';
import WikiGraphView from '../components/WikiGraph/WikiGraphView';
import SystemStatus from '../components/SystemStatus';

const WikiPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [page, setPage] = useState<WikiPageType | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'text' | 'graph'>('text');
    const [sourceTab, setSourceTab] = useState<'community' | 'wikipedia'>('community');
    const [wikiLang, setWikiLang] = useState<'ko' | 'en'>('ko');
    const [wikiContent, setWikiContent] = useState<string>('');
    const [wikiLoading, setWikiLoading] = useState(false);

    const fetchWikipedia = async (title: string, lang: 'ko' | 'en') => {
        // Skip fetch for new document slugs
        if (title.startsWith('new-')) {
            setWikiContent('새 문서는 위키백과 검색이 지원되지 않습니다.');
            return;
        }
        setWikiLoading(true);
        setWikiContent('');
        try {
            const endpoint = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                let html = `<h2>${data.title}</h2><p>${data.extract || '요약 정보가 없습니다.'}</p>`;
                if (data.content_urls?.desktop?.page) {
                    html += `<p class="mt-4"><a href="${data.content_urls.desktop.page}" target="_blank" class="text-blue-600 hover:underline">위키백과에서 전체 문서 보기 →</a></p>`;
                }
                setWikiContent(html);
            } else {
                setWikiContent('');
            }
        } catch (e) {
            setWikiContent('');
        } finally {
            setWikiLoading(false);
        }
    };

    useEffect(() => {
        if (slug) {
            loadPage(slug);
        } else {
            setViewMode('text');
        }
    }, [slug]);

    const loadPage = async (pageSlug: string) => {
        setLoading(true);
        const p = await storage.getWikiPage(pageSlug);
        if (p) {
            setPage(p);
            setEditContent(p.content);
            setEditTitle(p.title);
        } else {
            setPage(null);
            setEditTitle(pageSlug);
            setEditContent('# ' + pageSlug + '\n\n문서를 작성해주세요.');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!user) return alert('로그인이 필요합니다.');
        if (!editTitle) return alert('제목을 입력해주세요.');

        const newPage: WikiPageType = {
            slug: slug || editTitle.toLowerCase().replace(/\s+/g, '-'),
            title: editTitle,
            content: editContent,
            last_updated: new Date().toISOString(),
            last_editor: user.username,
            is_external: false
        };

        await storage.saveWikiPage(newPage);
        setPage(newPage);
        setIsEditing(false);
        setViewMode('text');

        if (!slug) {
            navigate(`/wiki/${newPage.slug}`);
        }
    };

    const handleNodeSelect = (nodeSlug: string) => {
        navigate(`/wiki/${nodeSlug}`);
    };

    if (!slug) {
        return (
            <div className="space-y-6 w-full animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><Globe size={200} /></div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-3"><Book size={36} /> NEXUS WIKI</h1>
                            <p className="text-indigo-200 text-sm md:text-base max-w-xl">AI-Hub의 집단지성 데이터베이스. 지식을 공유하고 탐험하세요.</p>
                        </div>
                        <button onClick={() => navigate(`/wiki/new-${Date.now()}`)} className="px-5 py-2.5 bg-white text-indigo-900 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg flex items-center gap-2 text-sm">
                            <Edit3 size={16} /> 새 문서
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Wiki Document List - Show FIRST on mobile */}
                    <main className="w-full lg:w-3/4 space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-5">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 text-lg flex items-center gap-2"><FileText size={18} /> 최근 문서</h3>
                            <div className="space-y-3">
                                {/* TODO: Fetch and display recent wiki pages */}
                                {['인공지능', '머신러닝', '딥러닝', '자연어 처리'].map(title => (
                                    <button key={title} onClick={() => navigate(`/wiki/${title}`)} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors group flex justify-between items-center">
                                        <span className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{title}</span>
                                        <span className="text-xs text-gray-400">보기 →</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-5">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 text-lg flex items-center gap-2"><Network size={18} /> 추천 탐색 경로</h3>
                            <div className="flex flex-wrap gap-2">
                                {['컴퓨터 비전', '로보틱스', 'GPT', 'LLM', 'Stable Diffusion', 'Transformer'].map(tag => (
                                    <button key={tag} onClick={() => navigate(`/wiki/${tag}`)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition font-medium">
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </main>

                    {/* Right: Sidebar (Graph + Status) */}
                    <aside className="w-full lg:w-1/4 space-y-6 order-1 lg:order-2">
                        <SystemStatus />
                        <div className="bg-slate-900 rounded-2xl p-1 shadow-xl overflow-hidden aspect-square border border-gray-700 relative group">
                            <div className="absolute top-2 left-2 z-10 bg-slate-800/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur">KNOWLEDGE GRAPH</div>
                            <WikiGraphView onNodeSelect={handleNodeSelect} mini={true} />
                        </div>
                    </aside>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button onClick={() => navigate('/wiki')} className="text-gray-500 hover:text-indigo-600 flex items-center gap-2 font-bold transition-colors">
                    <ArrowLeft size={18} /> 위키 홈
                </button>

                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('text')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'text' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        <FileText size={16} /> 문서 뷰
                    </button>
                    <button
                        onClick={() => setViewMode('graph')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'graph' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        <Network size={16} /> 그래프 뷰
                    </button>
                </div>

                {!isEditing && (
                    <div className="flex gap-2">
                        <button className="p-2 text-gray-400 hover:text-indigo-500 transition-colors" title="공유">
                            <Share2 size={18} />
                        </button>
                        <button
                            onClick={() => { setViewMode('text'); setIsEditing(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold hover:bg-indigo-200 transition-colors"
                        >
                            <Edit3 size={16} /> 편집
                        </button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* Main Content (Text) */}
                <div className="w-full lg:w-3/4 order-2 lg:order-1">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden min-h-[70vh] flex flex-col border border-gray-100 dark:border-gray-700">
                        {isEditing ? (
                            <div className="p-6 flex-1 flex flex-col space-y-4">
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="text-3xl font-black w-full bg-transparent border-b-2 border-gray-100 dark:border-gray-700 pb-2 focus:border-indigo-500 outline-none text-gray-800 dark:text-white transition-colors"
                                    placeholder="문서 제목"
                                />
                                <div className="flex-1 relative">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full h-full bg-gray-50 dark:bg-gray-900 rounded-xl p-4 resize-none outline-none focus:ring-2 focus:ring-indigo-500 dark:text-gray-200 font-mono text-sm leading-relaxed min-h-[500px]"
                                        placeholder="마크다운 내용을 입력하세요..."
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">취소</button>
                                    <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-all flex items-center gap-2">
                                        <Save size={18} /> 저장하기
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                                    <div className="flex justify-between items-start mb-4">
                                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight">{page?.title || slug}</h1>
                                        {!isEditing && (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-colors text-sm shadow"
                                            >
                                                <Edit3 size={16} /> 편집
                                            </button>
                                        )}
                                    </div>
                                    {page && (
                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                            <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"><UserIcon size={12} /> {page.last_editor}</span>
                                            <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"><Clock size={12} /> {new Date(page.last_updated).toLocaleString()}</span>
                                            {page.is_external && <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-2 py-1 rounded font-bold">위키백과 출처</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Source Tabs: Community Wiki vs Wikipedia */}
                                <div className="border-b border-gray-200 dark:border-gray-700 px-6 pt-4">
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setSourceTab('community')}
                                            className={`px-4 py-2.5 font-bold text-sm rounded-t-lg border-b-2 transition-colors ${sourceTab === 'community' ? 'bg-white dark:bg-gray-700 border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                        >
                                            📝 커뮤니티 위키
                                        </button>
                                        <button
                                            onClick={() => { setSourceTab('wikipedia'); fetchWikipedia(slug || '', wikiLang); }}
                                            className={`px-4 py-2.5 font-bold text-sm rounded-t-lg border-b-2 transition-colors ${sourceTab === 'wikipedia' ? 'bg-white dark:bg-gray-700 border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                        >
                                            🌐 위키백과
                                        </button>
                                    </div>
                                </div>

                                {/* Tab Content */}
                                <div className="p-6 prose dark:prose-invert max-w-none min-h-[400px]">
                                    {sourceTab === 'community' ? (
                                        page ? (
                                            <div className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                                                {page.content}
                                            </div>
                                        ) : (
                                            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                                <h3 className="text-xl font-bold text-gray-400 mb-2">아직 작성되지 않은 문서입니다.</h3>
                                                <p className="text-gray-500 mb-6 text-sm">이 문서의 첫 번째 작성자가 되어주세요.</p>
                                                <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-lg transition-all flex items-center gap-2 mx-auto">
                                                    <Edit3 size={18} /> 문서 작성 시작
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                        <div>
                                            {/* Language Toggle for Wikipedia */}
                                            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                                <Globe size={16} className="text-blue-500" />
                                                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">언어:</span>
                                                <button
                                                    onClick={() => { setWikiLang('ko'); fetchWikipedia(slug || '', 'ko'); }}
                                                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${wikiLang === 'ko' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                                                >
                                                    🇰🇷 한국어
                                                </button>
                                                <button
                                                    onClick={() => { setWikiLang('en'); fetchWikipedia(slug || '', 'en'); }}
                                                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${wikiLang === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                                                >
                                                    🇺🇸 English
                                                </button>
                                            </div>
                                            {wikiLoading ? (
                                                <div className="text-center py-10 text-gray-400 animate-pulse">위키백과에서 불러오는 중...</div>
                                            ) : wikiContent ? (
                                                <div className="text-gray-700 dark:text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: wikiContent }} />
                                            ) : (
                                                <div className="text-center py-10 text-gray-400">위키백과에서 해당 문서를 찾을 수 없습니다.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Sidebar (Graph & Info) */}
                <aside className="w-full lg:w-1/4 space-y-6 order-1 lg:order-2">
                    {/* System Status */}
                    <SystemStatus />

                    {/* Mini Graph Map */}
                    <div className="bg-slate-900 rounded-3xl p-1 shadow-xl overflow-hidden aspect-square border border-gray-700 relative group">
                        <div className="absolute top-3 left-3 z-10 bg-slate-800/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur">
                            KNOWLEDGE GRAPH
                        </div>
                        <button
                            onClick={() => setViewMode('graph')}
                            className="absolute top-3 right-3 z-10 bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="전체 화면으로 보기"
                        >
                            <Maximize size={14} />
                        </button>
                        <WikiGraphView initialSlug={slug} onNodeSelect={handleNodeSelect} mini={true} />
                    </div>

                    {/* Related Tags */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold text-gray-500 mb-3 uppercase text-xs tracking-wider flex items-center gap-2">
                            <Network size={14} /> Related Nodes
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {['인공지능', '머신러닝', '딥러닝'].map(tag => (
                                <button key={tag} onClick={() => navigate(`/wiki/${tag}`)} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-600 dark:text-gray-400 rounded-md text-xs transition border border-transparent hover:border-indigo-200">
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Full Screen Graph Modal */}
            {viewMode === 'graph' && (
                <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full h-full max-w-7xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-700 flex flex-col relative">
                        <button
                            onClick={() => setViewMode('text')}
                            className="absolute top-6 right-6 z-20 bg-slate-800 text-white p-2 rounded-full hover:bg-slate-700 border border-gray-600 shadow-lg"
                        >
                            <X size={24} />
                        </button>
                        <div className="flex-1 relative">
                            <WikiGraphView initialSlug={slug} onNodeSelect={(s) => { handleNodeSelect(s); setViewMode('text'); }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WikiPage;
