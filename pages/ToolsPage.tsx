
import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Bomb, ImageOff, EyeOff, Vote, Code, Shuffle, Stamp, Play,
    Copy, Check, AlertTriangle, Lock, Image, Users, FileCode,
    Fingerprint, Download, Upload, Trash2, RefreshCw, UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';

// ========== TOOL COMPONENTS ==========

// 휘발성 메모장
const SelfDestructNote: React.FC = () => {
    const [content, setContent] = useState('');
    const [expiry, setExpiry] = useState<'instant' | '5min' | '1hour' | '24hour'>('5min');
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerate = () => {
        if (!content.trim()) return;
        const noteId = `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const noteData = { content, expiry, created: Date.now() };
        localStorage.setItem(noteId, JSON.stringify(noteData));
        setGeneratedUrl(`${window.location.origin}/tools/note/${noteId}`);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="비밀 메시지를 입력하세요..."
                className="w-full h-40 p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600 dark:text-gray-400">만료:</label>
                <select value={expiry} onChange={(e) => setExpiry(e.target.value as any)} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white text-sm">
                    <option value="instant">읽는 즉시 삭제</option>
                    <option value="5min">5분 후</option>
                    <option value="1hour">1시간 후</option>
                    <option value="24hour">24시간 후</option>
                </select>
            </div>
            <button onClick={handleGenerate} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                <Bomb size={18} /> 휘발성 링크 생성
            </button>
            {generatedUrl && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-500 mb-2 flex items-center gap-1"><AlertTriangle size={12} /> 이 링크는 한 번만 공유하세요!</p>
                    <div className="flex gap-2">
                        <input value={generatedUrl} readOnly className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border rounded-lg text-sm font-mono" />
                        <button onClick={handleCopy} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm">
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// 코드 스니펫
const CodeSnippet: React.FC = () => {
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white text-sm">
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
            </select>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="코드를 입력하세요..."
                className="w-full h-60 p-4 font-mono text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-900 text-green-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={handleCopy} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                {copied ? <Check size={18} /> : <Copy size={18} />} 코드 복사
            </button>
            {code && (
                <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                    <span className="text-xs text-gray-400 font-mono">{language}</span>
                    <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap mt-2">{code}</pre>
                </div>
            )}
        </div>
    );
};

// HTML 미리보기
const HtmlPreview: React.FC = () => {
    const [htmlCode, setHtmlCode] = useState('<h1 style="color: blue;">Hello World!</h1>\n<p>HTML을 작성해보세요.</p>');
    const [showPreview, setShowPreview] = useState(false);

    return (
        <div className="space-y-4">
            <textarea value={htmlCode} onChange={(e) => setHtmlCode(e.target.value)} placeholder="HTML 코드를 입력하세요..."
                className="w-full h-60 p-4 font-mono text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-900 text-orange-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button onClick={() => setShowPreview(!showPreview)} className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center gap-2">
                <Play size={18} /> {showPreview ? '미리보기 숨기기' : '미리보기 실행'}
            </button>
            {showPreview && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-orange-300 dark:border-orange-700 min-h-[200px]">
                    <div className="text-xs text-orange-500 mb-2 font-bold">📺 미리보기</div>
                    <div dangerouslySetInnerHTML={{ __html: htmlCode }} />
                </div>
            )}
        </div>
    );
};

// 랜덤 닉네임 생성기 (with profile apply)
const RandomNickname: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const adjectives = ['익명의', '그림자', '은밀한', '디지털', '사이버', '비밀', '암호화된', '숨겨진', '팬텀', '유령', '미스터리', '다크'];
    const nouns = ['요원', '해커', '탐정', '전사', '닌자', '스파이', '관찰자', '개발자', '마법사', '고양이', '늑대', '여우'];
    const [nickname, setNickname] = useState('');
    const [avatarSeed, setAvatarSeed] = useState('');
    const [copied, setCopied] = useState(false);
    const [applied, setApplied] = useState(false);

    const generate = () => {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 1000);
        setNickname(`${adj} ${noun}${num}`);
        setAvatarSeed(Date.now().toString());
        setApplied(false);
    };

    const copyNickname = () => {
        navigator.clipboard.writeText(nickname);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const applyAvatar = async () => {
        if (!user || !avatarSeed) return;
        const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`;
        const updatedUser = { ...user, avatar_url: avatarUrl };
        await storage.saveUser(updatedUser);
        storage.setSession(updatedUser);
        refreshUser();
        setApplied(true);
    };

    return (
        <div className="space-y-4 text-center">
            {nickname && (
                <div className="p-6 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-2xl">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`} alt="Avatar" className="w-24 h-24 mx-auto mb-4 rounded-full bg-white dark:bg-gray-800 p-2" />
                    <p className="text-2xl font-black text-violet-700 dark:text-violet-300">{nickname}</p>

                    <div className="mt-4 flex gap-2 justify-center">
                        {user ? (
                            <button onClick={applyAvatar} disabled={applied} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${applied ? 'bg-green-500 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'}`}>
                                {applied ? <><Check size={16} /> 적용됨!</> : <><UserPlus size={16} /> 아바타 적용</>}
                            </button>
                        ) : (
                            <button onClick={copyNickname} className="px-4 py-2 bg-white dark:bg-gray-700 rounded-lg font-bold text-sm text-violet-600 dark:text-violet-300 flex items-center gap-2 border border-violet-200 dark:border-violet-700">
                                {copied ? <><Check size={16} /> 복사됨!</> : <><Copy size={16} /> 닉네임 복사</>}
                            </button>
                        )}
                    </div>
                    {!user && <p className="text-xs text-gray-400 mt-2">로그인하면 아바타를 바로 적용할 수 있어요</p>}
                </div>
            )}
            <button onClick={generate} className="w-full py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors flex items-center justify-center gap-2">
                <Shuffle size={18} /> 랜덤 생성
            </button>
        </div>
    );
};

// Exif 제거기
const ExifCleaner: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>('');
    const [cleaned, setCleaned] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
            setCleaned(false);
        }
    };

    const cleanExif = () => {
        if (!selectedFile || !canvasRef.current) return;
        const img = new window.Image();
        img.onload = () => {
            const canvas = canvasRef.current!;
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            setCleaned(true);
        };
        img.src = preview;
    };

    const downloadClean = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = `clean_${selectedFile?.name || 'image.png'}`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="exif-upload" />
                <label htmlFor="exif-upload" className="cursor-pointer">
                    <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-gray-500 dark:text-gray-400">이미지를 선택하세요</p>
                    <p className="text-xs text-gray-400 mt-1">EXIF 메타데이터가 자동 제거됩니다</p>
                </label>
            </div>
            {preview && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                    <img src={preview} alt="Preview" className="max-h-60 mx-auto rounded-lg" />
                    <p className="text-center text-sm text-gray-500 mt-2">{selectedFile?.name}</p>
                </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            {selectedFile && !cleaned && (
                <button onClick={cleanExif} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    <Trash2 size={18} /> 메타데이터 제거
                </button>
            )}
            {cleaned && (
                <button onClick={downloadClean} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Download size={18} /> 클린 이미지 다운로드
                </button>
            )}
        </div>
    );
};

// 익명 투표
const AnonVote: React.FC = () => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [created, setCreated] = useState(false);
    const [voteId, setVoteId] = useState('');
    const [viewId, setViewId] = useState('');
    const [activeVote, setActiveVote] = useState<any>(null);

    const addOption = () => setOptions([...options, '']);
    const updateOption = (idx: number, val: string) => {
        const newOpts = [...options];
        newOpts[idx] = val;
        setOptions(newOpts);
    };

    const createVote = () => {
        if (!question.trim() || options.filter(o => o.trim()).length < 2) return;
        const id = `vote-${Date.now()}`;
        const data = { question, options: options.filter(o => o.trim()), votes: {} };
        localStorage.setItem(id, JSON.stringify(data));
        setVoteId(id);
        setCreated(true);
    };

    const loadVote = () => {
        const saved = localStorage.getItem(viewId);
        if (saved) {
            setActiveVote({ id: viewId, ...JSON.parse(saved) });
        } else {
            alert('투표를 찾을 수 없습니다.');
        }
    };

    const castVote = (optIdx: number) => {
        if (!activeVote) return;
        const updated = { ...activeVote };
        updated.votes[optIdx] = (updated.votes[optIdx] || 0) + 1;
        localStorage.setItem(activeVote.id, JSON.stringify({ question: updated.question, options: updated.options, votes: updated.votes }));
        setActiveVote(updated);
        alert('투표 완료!');
    };

    if (activeVote) {
        return (
            <div className="space-y-4">
                <button onClick={() => setActiveVote(null)} className="text-xs text-cyan-600 font-bold">← 뒤로가기</button>
                <h3 className="font-bold text-lg dark:text-white">{activeVote.question}</h3>
                <div className="space-y-2">
                    {activeVote.options.map((opt: string, idx: number) => {
                        const count = activeVote.votes[idx] || 0;
                        const total = Object.values(activeVote.votes).reduce((a: any, b: any) => a + b, 0) as number;
                        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                            <button key={idx} onClick={() => castVote(idx)} className="w-full p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 transition-colors text-left relative overflow-hidden group">
                                <div className="absolute inset-y-0 left-0 bg-cyan-100 dark:bg-cyan-900/20 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                <div className="relative flex justify-between items-center text-sm font-medium">
                                    <span className="dark:text-white">{opt}</span>
                                    <span className="text-cyan-600 font-bold">{count}표 ({percent}%)</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">투표 참여하기</p>
                <div className="flex gap-2">
                    <input value={viewId} onChange={(e) => setViewId(e.target.value)} placeholder="투표 ID 입력..." className="flex-1 p-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white" />
                    <button onClick={loadVote} className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white text-sm font-bold rounded-lg hover:bg-gray-900 transition-colors">참여</button>
                </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700"></div>

            {!created ? (
                <>
                    <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="투표 질문을 입력하세요"
                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                    />
                    <div className="space-y-2">
                        {options.map((opt, idx) => (
                            <input key={idx} value={opt} onChange={(e) => updateOption(idx, e.target.value)} placeholder={`선택지 ${idx + 1}`}
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm"
                            />
                        ))}
                    </div>
                    <button onClick={addOption} className="text-cyan-600 text-sm font-bold">+ 선택지 추가</button>
                    <button onClick={createVote} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2">
                        <Vote size={18} /> 익명 투표 생성
                    </button>
                </>
            ) : (
                <div className="text-center py-8">
                    <Check className="mx-auto text-green-500 mb-4" size={48} />
                    <p className="font-bold text-lg dark:text-white mb-2">투표가 생성되었습니다!</p>
                    <p className="text-sm text-gray-500">ID: {voteId}</p>
                </div>
            )}
        </div>
    );
};

// 스테가노그래피
const Steganography: React.FC = () => {
    const [mode, setMode] = useState<'encode' | 'decode'>('encode');
    const [message, setMessage] = useState('');
    const [result, setResult] = useState('');

    const encode = () => {
        // 간단한 인코딩: 메시지를 유니코드 형태로 변환
        const encoded = message.split('').map(c => c.charCodeAt(0).toString(16).padStart(4, '0')).join('');
        setResult(`\u200B${encoded}\u200B`);
    };

    const decode = () => {
        const clean = message.replace(/[\u200B]/g, '');
        const decoded = clean.match(/.{1,4}/g)?.map(hex => String.fromCharCode(parseInt(hex, 16))).join('') || '';
        setResult(decoded);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button onClick={() => setMode('encode')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${mode === 'encode' ? 'bg-slate-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>숨기기</button>
                <button onClick={() => setMode('decode')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${mode === 'decode' ? 'bg-slate-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>추출하기</button>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={mode === 'encode' ? '숨길 메시지 입력...' : '암호화된 텍스트 붙여넣기...'}
                className="w-full h-32 p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white resize-none"
            />
            <button onClick={mode === 'encode' ? encode : decode} className="w-full py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                <EyeOff size={18} /> {mode === 'encode' ? '메시지 숨기기' : '메시지 추출'}
            </button>
            {result && (
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl">
                    <p className="text-xs text-slate-500 mb-2">{mode === 'encode' ? '숨겨진 텍스트 (복사해서 사용)' : '추출된 메시지'}</p>
                    <p className="font-mono text-sm dark:text-white break-all">{result}</p>
                </div>
            )}
        </div>
    );
};

// 디지털 인장
const DigitalStamp: React.FC = () => {
    const [text, setText] = useState('');
    const [stamp, setStamp] = useState('');

    const generateStamp = () => {
        let hashNum = 0;
        for (const char of text) {
            hashNum = ((hashNum << 5) - hashNum) + char.charCodeAt(0);
        }
        const hash = hashNum.toString(16);
        const timestamp = Date.now().toString(36);
        setStamp(`[STAMP:${hash.slice(0, 8).toUpperCase()}-${timestamp.toUpperCase()}]`);
    };

    return (
        <div className="space-y-4">
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="인장을 생성할 텍스트 입력..."
                className="w-full h-32 p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white resize-none"
            />
            <button onClick={generateStamp} className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-2">
                <Fingerprint size={18} /> 디지털 인장 생성
            </button>
            {stamp && (
                <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center">
                    <p className="font-mono text-lg font-bold text-amber-700 dark:text-amber-300">{stamp}</p>
                    <p className="text-xs text-amber-500 mt-2">이 인장을 글에 첨부하여 원본 증명에 사용하세요</p>
                </div>
            )}
        </div>
    );
};

// ========== MAIN TOOLS PAGE ==========
const ToolsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const catFilter = searchParams.get('cat'); // anonymous, crypto, image, dev
    const [activeTool, setActiveTool] = useState<string | null>(null);

    // Reset active tool when category filter changes
    useEffect(() => {
        setActiveTool(null);
    }, [catFilter]);

    const categories = [
        {
            catId: 'anonymous',
            name: '👤 익명 도구',
            desc: '신원 보호 및 익명 커뮤니케이션',
            tools: [
                { id: 'destruct-note', name: '휘발성 메모장', icon: Bomb, color: 'bg-red-100 dark:bg-red-900/30 text-red-600', desc: '읽으면 사라지는 비밀 메시지', component: SelfDestructNote },
                { id: 'random-nick', name: '랜덤 닉네임', icon: Shuffle, color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600', desc: '익명 닉네임 & 아바타', component: RandomNickname },
                { id: 'anon-vote', name: '익명 투표', icon: Vote, color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600', desc: '완전 익명 투표 생성', component: AnonVote },
            ]
        },
        {
            catId: 'crypto',
            name: '🔐 암호화 도구',
            desc: '데이터 보호 및 암호화',
            tools: [
                { id: 'encoder', name: '인코더/디코더', icon: Lock, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600', desc: 'Base64, URL, 해시 변환', link: '/tools/encoder' },
                { id: 'steganography', name: '스테가노그래피', icon: EyeOff, color: 'bg-slate-100 dark:bg-slate-900/30 text-slate-600', desc: '텍스트에 메시지 숨기기', component: Steganography },
                { id: 'digital-stamp', name: '디지털 인장', icon: Fingerprint, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600', desc: '원본 증명 인장 생성', component: DigitalStamp },
            ]
        },
        {
            catId: 'image',
            name: '🖼️ 이미지 도구',
            desc: '이미지 편집 및 프라이버시',
            tools: [
                { id: 'exif-cleaner', name: 'Exif 제거기', icon: ImageOff, color: 'bg-green-100 dark:bg-green-900/30 text-green-600', desc: '사진 메타데이터 삭제', component: ExifCleaner },
                { id: 'image-studio', name: '이미지 스튜디오', icon: Image, color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600', desc: '이미지 편집 도구', link: '/tools/image-studio' },
            ]
        },
        {
            catId: 'dev',
            name: '💻 개발 도구',
            desc: '코드 공유 및 테스트',
            tools: [
                { id: 'code-snippet', name: '코드 스니펫', icon: Code, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600', desc: '코드 하이라이팅 & 공유', component: CodeSnippet },
                { id: 'html-preview', name: 'HTML 미리보기', icon: FileCode, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600', desc: 'HTML 실시간 프리뷰', component: HtmlPreview },
            ]
        }
    ];

    // Filter categories based on URL param
    const filteredCategories = catFilter
        ? categories.filter(c => c.catId === catFilter)
        : categories;

    const allTools = categories.flatMap(c => c.tools);
    const ActiveComponent = activeTool ? allTools.find(t => t.id === activeTool)?.component : null;

    // Header based on filter
    const headerTitle = catFilter
        ? filteredCategories[0]?.name || '🧰 도구 모음'
        : '🧰 도구 모음';
    const headerDesc = catFilter
        ? filteredCategories[0]?.desc || ''
        : '익명성, 암호화, 이미지, 개발을 위한 유틸리티';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black">{headerTitle}</h1>
                        <p className="text-gray-300 text-sm mt-1">{headerDesc}</p>
                    </div>
                    {catFilter && (
                        <Link to="/tools" className="text-sm text-gray-300 hover:text-white font-bold">← 전체 보기</Link>
                    )}
                </div>
            </div>

            {/* Active Tool View */}
            {activeTool && ActiveComponent && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold dark:text-white">{allTools.find(t => t.id === activeTool)?.name}</h2>
                        <button onClick={() => setActiveTool(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold">← 돌아가기</button>
                    </div>
                    <ActiveComponent />
                </div>
            )}

            {/* Category Grid */}
            {!activeTool && filteredCategories.map(cat => (
                <div key={cat.catId} className="space-y-4">
                    {!catFilter && (
                        <div>
                            <h2 className="text-lg font-black dark:text-white">{cat.name}</h2>
                            <p className="text-xs text-gray-400">{cat.desc}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {cat.tools.map(tool => (
                            tool.link ? (
                                <Link key={tool.id} to={tool.link} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all text-left group">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${tool.color} group-hover:scale-110 transition-transform`}>
                                        <tool.icon size={20} />
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-white text-sm">{tool.name}</h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{tool.desc}</p>
                                </Link>
                            ) : (
                                <button key={tool.id} onClick={() => setActiveTool(tool.id)} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all text-left group">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${tool.color} group-hover:scale-110 transition-transform`}>
                                        <tool.icon size={20} />
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-white text-sm">{tool.name}</h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{tool.desc}</p>
                                </button>
                            )
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ToolsPage;
