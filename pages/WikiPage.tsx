import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { WikiPage as WikiPageType } from '../types';
import { Book, Edit3, Save, ArrowLeft, Globe, Clock, User as UserIcon } from 'lucide-react';

const WikiPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [page, setPage] = useState<WikiPageType | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [loading, setLoading] = useState(false);

    // List of all pages (Mock for now, normally would query storage)
    // Since storage doesn't have getAllWikiPages, we'll implement a basic list or just handling slug.
    // For this version, if no slug, we show a "Wiki Home" with some featured links.

    useEffect(() => {
        if (slug) {
            loadPage(slug);
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
            // New Page Mode
            setPage(null);
            setEditTitle(pageSlug);
            setEditContent('# ' + pageSlug + '\n\n문서를 작성해주세요.');
            setIsEditing(true);
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

        if (!slug) {
            navigate(`/wiki/${newPage.slug}`);
        }
    };

    if (!slug) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><Globe size={200} /></div>
                    <h1 className="text-4xl font-black mb-4 flex items-center gap-3"><Book size={40} /> NEXUS WIKI</h1>
                    <p className="text-indigo-200 text-lg max-w-2xl">
                        AI-Hub의 집단지성 데이터베이스에 오신 것을 환영합니다.<br />
                        모든 정보 요원들은 문서를 열람하고 기여할 수 있습니다.
                    </p>
                    <div className="mt-8 flex gap-4">
                        <button onClick={() => navigate('/wiki/alpha-master')} className="px-6 py-3 bg-white text-indigo-900 rounded-xl font-bold hover:bg-gray-100 transition-all">
                            Alpha Master 문서 보기
                        </button>
                        <button onClick={() => navigate(`/wiki/new-${Date.now()}`)} className="px-6 py-3 bg-indigo-700 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all border border-indigo-500">
                            새 문서 작성
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-500 mb-4 uppercase text-xs tracking-wider">Recent Updates</h3>
                    <div className="text-center py-10 text-gray-400 text-sm">
                        최근 업데이트된 문서가 없습니다.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button onClick={() => navigate('/wiki')} className="text-gray-500 hover:text-indigo-600 flex items-center gap-2 font-bold transition-colors">
                    <ArrowLeft size={18} /> 위키 홈으로
                </button>
                {page && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold hover:bg-indigo-200 transition-colors"
                    >
                        <Edit3 size={16} /> 문서 편집
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden min-h-[60vh] flex flex-col">
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
                            className="flex-1 w-full bg-gray-50 dark:bg-gray-900 rounded-xl p-4 resize-none outline-none focus:ring-2 focus:ring-indigo-500 dark:text-gray-200 font-mono text-sm leading-relaxed"
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
                                    <h3 className="text-xl font-bold text-gray-400 mb-2">문서가 존재하지 않습니다.</h3>
                                    <p className="text-gray-500 mb-6">이 주제에 대한 첫 번째 기여자가 되어보세요.</p>
                                    <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition-all">
                                        문서 생성하기
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default WikiPage;
