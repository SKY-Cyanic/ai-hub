import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { WikiPage as WikiPageType } from '../types';
import { Book, Edit3, Save, ArrowLeft, Globe, Clock, User as UserIcon, Network, FileText, Share2 } from 'lucide-react';
import WikiGraphView from '../components/WikiGraph/WikiGraphView';

const WikiPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [page, setPage] = useState<WikiPageType | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'text' | 'graph'>('graph');

    useEffect(() => {
        if (slug) {
            loadPage(slug);
        } else {
            setViewMode('graph');
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
                <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><Globe size={200} /></div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div>
                            <h1 className="text-4xl font-black mb-4 flex items-center gap-3"><Book size={40} /> NEXUS WIKI</h1>
                            <p className="text-indigo-200 text-lg max-w-2xl">
                                AI-Hub의 집단지성 데이터베이스<br />
                                <span className="text-sm opacity-75">지식 그래프를 통해 관련된 개념들을 탐험하세요.</span>
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => navigate(`/wiki/new-${Date.now()}`)} className="px-6 py-3 bg-white text-indigo-900 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg flex items-center gap-2">
                                <Edit3 size={18} /> 새 문서
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 rounded-2xl overflow-hidden shadow-2xl border-4 border-indigo-800/50 w-full bg-slate-900" style={{ height: '800px' }}>
                        <WikiGraphView onNodeSelect={handleNodeSelect} />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold text-gray-500 mb-4 uppercase text-xs tracking-wider">추천 탐색 경로</h3>
                        <div className="flex flex-wrap gap-2">
                            {['인공지능', '머신러닝', '딥러닝', '자연어 처리', '컴퓨터 비전', '로보틱스'].map(tag => (
                                <button key={tag} onClick={() => navigate(`/wiki/${tag}`)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition">
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold text-gray-500 mb-4 uppercase text-xs tracking-wider">Recent Updates</h3>
                        <div className="text-center py-4 text-gray-400 text-sm">
                            최근 업데이트된 문서가 없습니다.
                        </div>
                    </div>
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
            <div className={`bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden w-full ${viewMode === 'graph' ? 'bg-slate-900 border-none' : 'min-h-[70vh] flex flex-col'}`}>

                {viewMode === 'graph' && (
                    <div className="w-full relative bg-slate-900 p-1" style={{ height: '800px' }}>
                        <div className="h-full w-full relative rounded-2xl overflow-hidden">
                            <WikiGraphView initialSlug={slug} onNodeSelect={handleNodeSelect} />
                        </div>
                    </div>
                )}

                {viewMode === 'text' && (
                    <>
                        {isEditing ? (
                            <div className="p-6 flex-1 flex flex-col space-y-4">
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="text-3xl font-black w-full bg-transparent border-b-2 border-gray-100 dark:border-gray-700 pb-2 focus:border-indigo-500 outline-none text-gray-800 dark:text-white transition-colors"
                                    placeholder="문서 제목"
                                />
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="flex-1 w-full bg-gray-50 dark:bg-gray-900 rounded-xl p-4 resize-none outline-none focus:ring-2 focus:ring-indigo-500 dark:text-gray-200 font-mono text-sm leading-relaxed min-h-[400px]"
                                    placeholder="마크다운 내용을 입력하세요..."
                                />
                                <div className="flex justify-end gap-3 pt-2">
                                    <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">취소</button>
                                    <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-all flex items-center gap-2">
                                        <Save size={18} /> 저장하기
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
                                    <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">{page?.title || slug}</h1>
                                    {page && (
                                        <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                                            <span className="flex items-center gap-1"><UserIcon size={12} /> {page.last_editor}</span>
                                            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(page.last_updated).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-8 prose dark:prose-invert max-w-none">
                                    {page ? (
                                        <div className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                                            {page.content}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20">
                                            <h3 className="text-xl font-bold text-gray-400 mb-2">작성된 내용이 없습니다.</h3>
                                            <p className="text-gray-500 mb-6">지식을 공유하고 기여해보세요.</p>
                                            <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition-all">
                                                문서 시작하기
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default WikiPage;
