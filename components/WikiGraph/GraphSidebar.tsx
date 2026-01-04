import React, { useState, useEffect } from 'react';
import { X, Mic, StopCircle, Clipboard, Save, HelpCircle, ExternalLink, Activity, Folder, Image as ImageIcon, FileText } from 'lucide-react';
import { SidebarData, TabType } from './types';
import { COLORS } from './parameters';

interface GraphSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    data: SidebarData | null;
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    onSearch: (query: string) => void;
    isMobile: boolean;
}

const GraphSidebar: React.FC<GraphSidebarProps> = ({ isOpen, onClose, data, activeTab, onTabChange, onSearch, isMobile }) => {
    const [note, setNote] = useState('');
    const [ttsActive, setTtsActive] = useState(false);
    const [galleryImages, setGalleryImages] = useState<{ url: string, thumb: string }[]>([]);
    const [loadingGallery, setLoadingGallery] = useState(false);

    // --- Effects ---
    useEffect(() => {
        if (data) {
            // Load saved note
            const savedNotes = JSON.parse(localStorage.getItem('wg_notes') || '{}');
            setNote(savedNotes[data.title] || '');

            // If media tab, fetch images (Mock logic for now or simple Wiki API)
            if (activeTab === 'media') {
                // fetchImages(data.title);
            }
        }
    }, [data, activeTab]);

    // --- Handlers ---
    const handleSaveNote = () => {
        if (!data) return;
        const savedNotes = JSON.parse(localStorage.getItem('wg_notes') || '{}');
        savedNotes[data.title] = note;
        localStorage.setItem('wg_notes', JSON.stringify(savedNotes));
        alert('노트가 저장되었습니다.');
    };

    const handleSpeak = (text: string) => {
        if ('speechSynthesis' in window) {
            if (ttsActive) {
                window.speechSynthesis.cancel();
                setTtsActive(false);
                return;
            }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            utterance.rate = 1.0;
            utterance.onend = () => setTtsActive(false);
            window.speechSynthesis.speak(utterance);
            setTtsActive(true);
        }
    };

    // --- Renderers ---
    const renderInfo = () => {
        if (!data) return <div className="text-slate-500 text-center mt-10">데이터 없음</div>;
        const thumb = data.thumbnail?.source;
        const intro = data.extract || "내용 없음";

        return (
            <div className="space-y-6 animate-fade-in">
                {thumb && (
                    <div className="rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-slate-800">
                        <img src={thumb} className="w-full h-48 object-cover" alt={data.title} />
                    </div>
                )}

                <div>
                    <h2 className="text-2xl font-bold leading-tight text-white">{data.title}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20 font-bold uppercase">
                            Citation Index: {data.citationCount || 0}
                        </span>
                    </div>
                </div>

                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col gap-2">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Mic size={10} /> Audio Docent</span>
                    </div>
                    <button
                        onClick={() => handleSpeak(intro)}
                        className={`w-full py-2 ${ttsActive ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 border border-transparent`}
                    >
                        {ttsActive ? <><StopCircle size={14} /> 중지</> : <><Mic size={14} /> 설명 듣기</>}
                    </button>
                </div>

                <div className="text-slate-300 text-sm leading-relaxed text-justify whitespace-pre-wrap">
                    {intro}
                </div>

                <a href={`https://ko.wikipedia.org/wiki/${encodeURIComponent(data.title)}`} target="_blank" rel="noreferrer" className="block text-center text-xs bg-slate-800 text-slate-400 py-3 rounded-lg border border-slate-700 hover:bg-slate-700 transition flex items-center justify-center gap-2">
                    <ExternalLink size={12} /> Wikipedia 원문 보기
                </a>
            </div>
        );
    };

    const renderAI = () => {
        if (!data) return null;
        const sentences = (data.extract || "").split('.').filter(s => s.length > 10).slice(0, 3);
        return (
            <div className="space-y-4 animate-fade-in">
                <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 p-4 rounded-xl border border-blue-500/20">
                    <h3 className="font-bold flex items-center gap-2 mb-1 text-blue-400">
                        <Activity size={18} /> AI 지식 맵 분석
                    </h3>
                    <p className="text-xs text-slate-400">문서의 핵심 맥락과 연대학적 정보를 분석합니다.</p>
                </div>
                <div className="space-y-2 border-b border-slate-800 pb-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">핵심 요약</h4>
                    {sentences.map((sent, i) => (
                        <div key={i} className="bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                            <p className="text-sm text-slate-300 leading-relaxed">{sent}.</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderNotes = () => (
        <div className="space-y-4 animate-fade-in h-full flex flex-col">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-200">개인 지식 노트</h3>
                <span className="text-[10px] text-slate-500">Local Storage</span>
            </div>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="flex-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 outline-none focus:border-blue-500 resize-none min-h-[200px]"
                placeholder="이 주제에 대한 생각을 기록하세요..."
            />
            <div className="flex gap-2">
                <button onClick={handleSaveNote} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2">
                    <Save size={14} /> 저장하기
                </button>
                <button onClick={() => { navigator.clipboard.writeText(note); alert('복사됨'); }} className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:text-white transition text-slate-400">
                    <Clipboard size={16} />
                </button>
            </div>
        </div>
    );

    const renderCluster = () => {
        const cats = data?.categories || [];
        return (
            <div className="space-y-4 animate-fade-in">
                <h3 className="font-bold text-slate-200 flex items-center gap-2"><Folder size={16} /> 지식 분류 (Categories)</h3>
                {cats.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {cats.map((c, i) => {
                            const name = c.title.replace('분류:', '').replace('Category:', '');
                            return (
                                <button key={i} onClick={() => onSearch(name)} className="px-2 py-1 bg-blue-900/30 text-blue-400 border border-blue-900/50 rounded text-xs hover:bg-blue-900/50 transition">
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                ) : <p className="text-slate-500 text-sm">분류 정보가 없습니다.</p>}
            </div>
        );
    };

    const renderMedia = () => (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
            <p>이미지 검색 기능 준비 중...</p>
        </div>
    );

    // --- Layout ---
    // Mobile: Bottom Sheet (Fixed), Desktop: Right Sidebar (Absolute)
    const containerClasses = isMobile
        ? `fixed bottom-0 left-0 right-0 h-[60vh] bg-slate-900/95 backdrop-blur-xl border-t border-slate-700 z-50 rounded-t-3xl shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-[110%]'}`
        : `absolute top-0 right-0 bottom-0 w-96 bg-slate-900/90 backdrop-blur-md border-l border-slate-800 z-40 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`;

    return (
        <aside className={containerClasses}>
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-3xl md:rounded-none">
                <h2 className="font-bold text-slate-200 flex items-center gap-2">
                    <Activity className="text-blue-500" size={18} /> 정보 패널
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                    <X size={20} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900/30 overflow-x-auto no-scrollbar">
                {[
                    { id: 'info', label: '정보', icon: HelpCircle },
                    { id: 'ai', label: 'AI 분석', icon: Activity },
                    { id: 'notes', label: '메모', icon: FileText },
                    { id: 'media', label: '미디어', icon: ImageIcon },
                    { id: 'cluster', label: '그룹', icon: Folder },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id as TabType)}
                        className={`flex-none px-4 py-3 text-sm font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${activeTab === tab.id ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-blue-300'}`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 pb-20 md:pb-5 custom-scrollbar h-[calc(100%-110px)]">
                {activeTab === 'info' && renderInfo()}
                {activeTab === 'ai' && renderAI()}
                {activeTab === 'notes' && renderNotes()}
                {activeTab === 'media' && renderMedia()}
                {activeTab === 'cluster' && renderCluster()}
            </div>
        </aside>
    );
};

export default GraphSidebar;
