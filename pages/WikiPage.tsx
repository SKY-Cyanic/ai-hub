import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { WikiPage as WikiPageType, User } from '../types';
import { Book, Edit3, Save, ArrowLeft, Globe, Clock, User as UserIcon, Network, FileText, Share2, Maximize, X, Sparkles, Loader } from 'lucide-react';
import WikiGraphView from '../components/WikiGraph/WikiGraphView';
import SystemStatus from '../components/SystemStatus';
import ReactMarkdown from 'react-markdown';

const WikiPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [page, setPage] = useState<WikiPageType | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'text' | 'graph' | 'history' | 'discussion'>('text');
    const [sourceTab, setSourceTab] = useState<'community' | 'wikipedia'>('community');
    const [wikiLang, setWikiLang] = useState<'ko' | 'en'>('ko');
    const [wikiContent, setWikiContent] = useState<string>('');
    const [wikiLoading, setWikiLoading] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summaryContent, setSummaryContent] = useState<string>('');
    const [pageHistory, setPageHistory] = useState<WikiPageType['history']>([]);
    const [topContributors, setTopContributors] = useState<User[]>([]);
    const [stubs, setStubs] = useState<WikiPageType[]>([]);
    const [dashLoading, setDashLoading] = useState(false);

    useEffect(() => {
        if (!slug) {
            loadDashboard();
        }
    }, [slug]);

    const loadDashboard = async () => {
        setDashLoading(true);
        try {
            // Note: These methods might not exist yet if storage.ts update fails, 
            // but we'll try to call them anyway.
            const [top, stubList] = await Promise.all([
                storage.getWikiTopContributors(5),
                storage.getWikiStubs(5)
            ]);
            setTopContributors(top);
            setStubs(stubList);
        } catch (e) {
            console.error('Dash load error:', e);
        } finally {
            setDashLoading(false);
        }
    };

    // Helper: Convert [[wiki links]] and [1] references to internal links
    const processWikiLinks = (content: string): string => {
        // Convert [[Link Text]] to markdown links
        let processed = content.replace(/\[\[([^\]]+)\]\]/g, (_, linkText) => {
            return `[${linkText}](/wiki/${encodeURIComponent(linkText)})`;
        });
        // Convert [number] references to wiki links (e.g., [1] -> link to related topic)
        processed = processed.replace(/\[([1-9]\d*)\]/g, (_, num) => {
            return `<sup class="text-blue-500 cursor-pointer hover:underline" title="참조 ${num}">[${num}]</sup>`;
        });
        return processed;
    };

    const fetchWikipedia = async (title: string, lang: 'ko' | 'en') => {
        // Skip fetch for new document slugs
        if (title.startsWith('new-')) {
            setWikiContent('새 문서는 위키백과 검색이 지원되지 않습니다.');
            return;
        }
        setWikiLoading(true);
        setWikiContent('');
        try {
            // Fetch summary first
            const summaryRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);

            // Fetch full article HTML
            const htmlRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`);

            if (summaryRes.ok) {
                const summaryData = await summaryRes.ok ? await summaryRes.json() : null;
                if (!summaryData) return;

                let content = '';

                // Title and thumbnail
                content += `<div class="wiki-article">`;
                content += `<h1 class="text-2xl font-black text-gray-800 dark:text-white mb-4">${summaryData.title}</h1>`;

                // Thumbnail image if exists
                if (summaryData.thumbnail?.source) {
                    content += `<div class="float-right ml-4 mb-4 max-w-[200px]">`;
                    content += `<img src="${summaryData.thumbnail.source}" alt="${summaryData.title}" class="rounded-lg shadow-lg w-full" />`;
                    content += `</div>`;
                }

                // Summary/Extract
                content += `<p class="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-base">${summaryData.extract || '요약 정보가 없습니다.'}</p>`;

                // Full content if available
                if (htmlRes.ok) {
                    const htmlText = await htmlRes.text();
                    // Parse and extract main content sections
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlText, 'text/html');

                    // Get all section headings and content
                    const sections = doc.querySelectorAll('section[data-mw-section-id]');
                    sections.forEach((section, idx) => {
                        if (idx > 0 && idx < 6) { // Skip lead, limit sections
                            const heading = section.querySelector('h2, h3');
                            const paragraphs = section.querySelectorAll('p');
                            if (heading && paragraphs.length > 0) {
                                content += `<h2 class="text-lg font-bold text-gray-800 dark:text-gray-200 mt-6 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">${heading.textContent}</h2>`;
                                paragraphs.forEach(p => {
                                    if (p.textContent && p.textContent.trim().length > 20) {
                                        // Get paragraph HTML and convert wiki links to internal links
                                        let pHtml = p.innerHTML || p.textContent;
                                        // Convert Wikipedia internal links to our wiki links
                                        pHtml = pHtml.replace(/<a[^>]*href="\/wiki\/([^"#]+)[^"]*"[^>]*>([^<]+)<\/a>/g,
                                            (_, linkTarget, linkText) => {
                                                const decoded = decodeURIComponent(linkTarget);
                                                return `<a href="/wiki/${encodeURIComponent(decoded)}" class="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" data-internal="true">${linkText}</a>`;
                                            }
                                        );
                                        // Remove external link formatting [1] etc and style them
                                        pHtml = pHtml.replace(/\[(\d+)\]/g, '<sup class="text-blue-500 text-xs">[$1]</sup>');
                                        content += `<p class="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">${pHtml}</p>`;
                                    }
                                });
                            }
                        }
                    });
                }

                // Related Links Section
                content += `<div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">`;
                content += `<h3 class="text-sm font-black text-gray-500 uppercase tracking-wider mb-3">🔗 관련 링크</h3>`;
                content += `<div class="flex flex-wrap gap-2">`;

                // Wikipedia link
                if (summaryData.content_urls?.desktop?.page) {
                    content += `<a href="${summaryData.content_urls.desktop.page}" target="_blank" class="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition">📖 Wikipedia</a>`;
                }

                // YouTube search link
                content += `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(title)}" target="_blank" class="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium hover:bg-red-200 dark:hover:bg-red-800 transition">🎬 YouTube</a>`;

                // Google Scholar link
                content += `<a href="https://scholar.google.com/scholar?q=${encodeURIComponent(title)}" target="_blank" class="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium hover:bg-green-200 dark:hover:bg-green-800 transition">📚 Scholar</a>`;

                // Namu Wiki link (Korean)
                if (lang === 'ko') {
                    content += `<a href="https://namu.wiki/w/${encodeURIComponent(title)}" target="_blank" class="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-800 transition">🌿 나무위키</a>`;
                }

                content += `</div></div>`;
                content += `</div>`;

                setWikiContent(content);
            } else {
                setWikiContent('<div class="text-center py-10 text-gray-400">위키백과에서 해당 문서를 찾을 수 없습니다.</div>');
            }
        } catch (e) {
            console.error('Wikipedia fetch error:', e);
            setWikiContent('<div class="text-center py-10 text-gray-400">위키백과 로드 중 오류가 발생했습니다.</div>');
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
            setPageHistory(p.history || []);
        } else {
            setPage(null);
            setEditTitle(pageSlug);
            setEditContent('# ' + pageSlug + '\n\n문서를 작성해주세요.');
            setPageHistory([]);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!user) return alert('접근 코드가 필요합니다. (로그인 필요)');
        if (!editTitle) return alert('제목을 입력해주세요.');

        const newPage: WikiPageType = {
            slug: slug || editTitle.toLowerCase().replace(/\s+/g, '-'),
            title: editTitle,
            content: editContent,
            last_updated: new Date().toISOString(),
            last_editor: user.username,
            last_editor_id: user.id,
            is_external: false
        };

        const success = await storage.saveWikiPage(newPage);

        if (success) {
            // 활동 기록 (Phase 8.2)
            storage.logActivity({
                type: 'wiki',
                user_id: user.id,
                user_name: user.nickname,
                content: `위키 문서 [${newPage.title}]을(를) 편집했습니다.`,
                link: `/wiki/${newPage.slug}`
            });

            // Re-load to get updated history from server
            const updated = await storage.getWikiPage(newPage.slug);
            if (updated) {
                setPage(updated);
                setPageHistory(updated.history || []);
            } else {
                setPage(newPage);
            }

            setIsEditing(false);
            setViewMode('text');

            if (!slug) {
                navigate(`/wiki/${newPage.slug}`);
            }
        } else {
            alert('문서 저장 중 오류가 발생했습니다.');
        }
    };

    const handleNodeSelect = (nodeSlug: string) => {
        navigate(`/wiki/${nodeSlug}`);
    };

    if (!slug) {
        return (
            <div className="space-y-4 md:space-y-6 w-full animate-fade-in">
                {/* Header - 나무위키 스타일 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-3xl p-4 md:p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <Book size={24} className="text-indigo-600" /> NEXUS WIKI
                            </h1>
                            <button onClick={() => navigate(`/wiki/new-${Date.now()}`)} className="px-3 py-2 md:px-5 md:py-2.5 bg-indigo-600 text-white rounded-lg md:rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 text-xs md:text-sm">
                                <Edit3 size={14} /> 새 문서
                            </button>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">지식을 공유하고 탐험하세요.</p>
                        {/* 검색창 - 나무위키 스타일 */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="문서 검색..."
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                                        navigate(`/wiki/${(e.target as HTMLInputElement).value}`);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Dashboard & Stub List */}
                    <main className="w-full lg:w-3/4 space-y-6">
                        {/* Contributor Ranking Dashboard */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-black text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <Sparkles className="text-yellow-500" /> 지식 기여 랭킹
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {topContributors.length > 0 ? (
                                    topContributors.slice(0, 3).map((u, idx) => (
                                        <div key={u.id} className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${idx === 0 ? 'bg-yellow-50/50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-600'}`}>
                                            <div className="relative">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-md ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                                                    {idx + 1}
                                                </div>
                                                {u.avatar_url && <img src={u.avatar_url} className="absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-sm" alt="avatar" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800 dark:text-gray-100 truncate w-24">{u.nickname}</div>
                                                <div className="text-xs text-gray-500 font-medium">{u.wiki_contributions || 0}회 기여</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-4 text-center text-gray-400 text-sm">기여자 데이터가 없습니다.</div>
                                )}
                            </div>
                        </div>

                        {/* Stubs / Empty Pages Browser */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                                    <FileText className="text-indigo-500" /> 도움의 손길이 필요한 문서
                                </h3>
                                <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">+50 CR 보상</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {stubs.length > 0 ? (
                                    stubs.map(item => (
                                        <button
                                            key={item.slug}
                                            onClick={() => navigate(`/wiki/${item.slug}`)}
                                            className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-600 text-left hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group"
                                        >
                                            <div className="font-bold text-gray-800 dark:text-gray-200 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{item.title}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {item.content ? `${item.content.substring(0, 50)}...` : '내용이 아직 없습니다.'}
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                <Clock size={10} /> {new Date(item.last_updated).toLocaleDateString()}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="col-span-full py-8 text-center text-gray-400">내용이 부족한 문서가 없습니다. 감사합니다!</div>
                                )}
                            </div>
                        </div>

                        {/* Quick Navigation Path */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><Network size={18} /> 추천 탐색 경로</h3>
                            <div className="flex flex-wrap gap-2">
                                {['컴퓨터 비전', '로보틱스', 'GPT', 'LLM', 'Stable Diffusion', 'Transformer', 'Web3', 'Metaverse'].map(tag => (
                                    <button key={tag} onClick={() => navigate(`/wiki/${tag}`)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-indigo-600 hover:text-white text-gray-700 dark:text-gray-300 rounded-xl text-sm transition font-bold shadow-sm">
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </main>

                    {/* Right: Sidebar (Graph + Status) - 모바일에서 숨김 */}
                    <aside className="hidden lg:block w-full lg:w-1/4 space-y-6">
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
                        <FileText size={16} /> 문서
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'history' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        <Clock size={16} /> 역사
                    </button>
                    <button
                        onClick={() => setViewMode('discussion')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'discussion' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        <Share2 size={16} /> 토론
                    </button>
                    <button
                        onClick={() => { console.log('Graph view clicked'); setViewMode('graph'); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'graph' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        <Network size={16} /> 그래프
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

                                {viewMode === 'text' ? (
                                    <>
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

                                        <div className="p-6 prose dark:prose-invert max-w-none min-h-[400px]">
                                            {sourceTab === 'community' ? (
                                                page ? (
                                                    <div className="wiki-content">
                                                        <div className="flex justify-end mb-4">
                                                            <button
                                                                onClick={async () => {
                                                                    setIsSummarizing(true);
                                                                    try {
                                                                        const sentences = page.content.split(/[.!?]\s+/).filter(s => s.length > 20);
                                                                        const summary = sentences.slice(0, Math.min(5, sentences.length)).join('. ') + '.';
                                                                        setSummaryContent(summary);
                                                                    } catch (e) {
                                                                        setSummaryContent('요약 생성에 실패했습니다.');
                                                                    }
                                                                    setIsSummarizing(false);
                                                                }}
                                                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-800 transition"
                                                                disabled={isSummarizing}
                                                            >
                                                                {isSummarizing ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                                AI 요약
                                                            </button>
                                                        </div>

                                                        {summaryContent && (
                                                            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                                                <h4 className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                                                                    <Sparkles size={14} /> AI 요약
                                                                </h4>
                                                                <p className="text-sm text-purple-600 dark:text-purple-400 leading-relaxed">{summaryContent}</p>
                                                            </div>
                                                        )}

                                                        <ReactMarkdown
                                                            components={{
                                                                a: ({ href, children }) => {
                                                                    if (href?.startsWith('/wiki/')) {
                                                                        return <Link to={href} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{children}</Link>;
                                                                    }
                                                                    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{children}</a>;
                                                                },
                                                                h1: ({ children }) => <h1 className="text-2xl font-black text-gray-800 dark:text-white mb-4 mt-6">{children}</h1>,
                                                                h2: ({ children }) => <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3 mt-5 border-b border-gray-200 dark:border-gray-700 pb-2">{children}</h2>,
                                                                h3: ({ children }) => <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-2 mt-4">{children}</h3>,
                                                                p: ({ children }) => <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{children}</p>,
                                                                ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300">{children}</ul>,
                                                                ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300">{children}</ol>,
                                                                code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600 dark:text-pink-400">{children}</code>,
                                                                blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4">{children}</blockquote>,
                                                            }}
                                                        >
                                                            {processWikiLinks(page.content)}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-16 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                                        <h3 className="text-xl font-bold text-gray-400 mb-2">아직 작성되지 않은 문서입니다.</h3>
                                                        <p className="text-gray-500 mb-6 text-sm">이 문서의 첫 번째 작성자가 되어주세요.</p>
                                                        <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-lg transition-all flex items-center gap-2 mx-auto"><Edit3 size={18} /> 문서 작성 시작</button>
                                                    </div>
                                                )
                                            ) : (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                                        <Globe size={16} className="text-blue-500" />
                                                        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">언어:</span>
                                                        <button onClick={() => { setWikiLang('ko'); fetchWikipedia(slug || '', 'ko'); }} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${wikiLang === 'ko' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>🇰🇷 한국어</button>
                                                        <button onClick={() => { setWikiLang('en'); fetchWikipedia(slug || '', 'en'); }} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${wikiLang === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>🇺🇸 English</button>
                                                    </div>
                                                    {wikiLoading ? (
                                                        <div className="text-center py-10 text-gray-400 animate-pulse">위키백과에서 불러오는 중...</div>
                                                    ) : wikiContent ? (
                                                        <div>
                                                            <div className="text-gray-700 dark:text-gray-300 leading-relaxed" onClick={(e) => {
                                                                const target = e.target as HTMLAnchorElement;
                                                                if (target.tagName === 'A' && target.getAttribute('data-internal') === 'true') {
                                                                    e.preventDefault();
                                                                    const href = target.getAttribute('href');
                                                                    if (href) navigate(href);
                                                                }
                                                            }} dangerouslySetInnerHTML={{ __html: wikiContent }} />
                                                            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                                <button onClick={() => {
                                                                    const tempDiv = document.createElement('div'); tempDiv.innerHTML = wikiContent;
                                                                    const plainText = tempDiv.textContent || tempDiv.innerText || '';
                                                                    setEditContent(`# ${slug}\n\n${plainText.substring(0, 3000)}...\n\n---\n*위키백과에서 가져온 내용입니다. 자유롭게 수정해주세요.*`);
                                                                    setEditTitle(slug || ''); setSourceTab('community'); setIsEditing(true);
                                                                }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"><Edit3 size={16} /> 커뮤니티 위키로 가져오기</button>
                                                            </div>
                                                        </div>
                                                    ) : <div className="text-center py-10 text-gray-400">위키백과에서 해당 문서를 찾을 수 없습니다.</div>}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : viewMode === 'history' ? (
                                    <div className="p-6">
                                        <h3 className="text-xl font-black text-gray-800 dark:text-white mb-6 flex items-center gap-2"><Clock className="text-indigo-500" /> 편집 역사</h3>
                                        <div className="space-y-4">
                                            {pageHistory.length > 0 ? (
                                                pageHistory.map((item, idx) => (
                                                    <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600 flex justify-between items-center group hover:border-indigo-300 transition-all">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-200">
                                                                <span className="text-indigo-600 dark:text-indigo-400">v.{pageHistory.length - idx}</span>
                                                                <span>{item.editor_name}</span>
                                                                <span className="text-xs font-normal text-gray-400">{new Date(item.timestamp).toLocaleString()}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 italic font-mono truncate max-w-md">"{item.content_preview}"</p>
                                                        </div>
                                                        <button onClick={() => { setEditContent(item.content_preview); setEditTitle(page?.title || ''); setIsEditing(true); }} className="px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg text-xs font-bold text-gray-500 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100">이 버전으로 되돌리기</button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 text-gray-400">기록된 편집 역사가 없습니다.</div>
                                            )}
                                        </div>
                                    </div>
                                ) : viewMode === 'discussion' ? (
                                    <div className="p-6">
                                        <div className="text-center py-16 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border-2 border-dashed border-indigo-200 dark:border-indigo-800">
                                            <Share2 size={48} className="mx-auto text-indigo-300 mb-4" />
                                            <h3 className="text-xl font-black text-indigo-900 dark:text-indigo-100 mb-2">"{page?.title || slug}" 토론장</h3>
                                            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">이 지식에 대해 더 깊은 논의가 필요하신가요? 커뮤니티 게시판에서 토론을 시작해보세요.</p>
                                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                                <button onClick={() => navigate(`/forum?search=${encodeURIComponent(page?.title || slug)}`)} className="px-6 py-3 bg-white dark:bg-gray-800 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-300 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-md">관련 토론 찾기</button>
                                                <button onClick={() => navigate(`/write?board=free&title=${encodeURIComponent(`[토론] ${page?.title || slug}에 대하여`)}`)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl">새 토론 시작하기</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
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

            {/* Full Screen Graph Modal - Using Portal */}
            {viewMode === 'graph' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full h-full max-w-7xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-700 flex flex-col relative">
                        <button
                            onClick={() => setViewMode('text')}
                            className="absolute top-6 right-6 z-20 bg-slate-800 text-white p-2 rounded-full hover:bg-slate-700 border border-gray-600 shadow-lg"
                        >
                            <X size={24} />
                        </button>
                        <div className="flex-1 relative min-h-[500px]">
                            <WikiGraphView initialSlug={slug} onNodeSelect={handleNodeSelect} />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default WikiPage;
