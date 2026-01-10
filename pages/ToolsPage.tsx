
import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Bomb, ImageOff, EyeOff, Vote, Code, Shuffle, Stamp, Play,
    Copy, Check, AlertTriangle, Lock, Image, Users, FileCode,
    Fingerprint, Download, Upload, Trash2, RefreshCw, UserPlus, BarChart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';

// ========== TOOL COMPONENTS ==========

// 휘발성 메모장 (로그인 필수)
const SelfDestructNote: React.FC = () => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [expiry, setExpiry] = useState<'instant' | '5min' | '1hour' | '24hour'>('5min');
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 로그인 체크
    if (!user) {
        return (
            <div className="text-center py-8 space-y-4">
                <Lock size={48} className="mx-auto text-gray-300" />
                <p className="text-gray-500 dark:text-gray-400 font-bold">로그인이 필요합니다</p>
                <p className="text-xs text-gray-400">휘발성 메모 기능은 회원만 사용할 수 있습니다.</p>
            </div>
        );
    }

    const handleGenerate = async () => {
        if (!content.trim()) return;
        setIsLoading(true);
        try {
            const noteId = await storage.createVolatileNote(content, expiry);
            setGeneratedUrl(`${window.location.origin}/tools/note/${noteId}`);
        } catch (e) {
            alert('메모 생성 실패. 다시 시도해주세요.');
        }
        setIsLoading(false);
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
            <button onClick={handleGenerate} disabled={isLoading} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                <Bomb size={18} /> {isLoading ? '생성 중...' : '휘발성 링크 생성'}
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
        setNickname(`${adj} ${noun}`);
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

// 익명 투표 (Firebase 기반, 로그인 필수)
const AnonVote: React.FC = () => {
    const { user } = useAuth();
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [created, setCreated] = useState(false);
    const [voteId, setVoteId] = useState('');
    const [viewId, setViewId] = useState('');
    const [activeVote, setActiveVote] = useState<any>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 로그인 체크
    if (!user) {
        return (
            <div className="text-center py-8 space-y-4">
                <Lock size={48} className="mx-auto text-gray-300" />
                <p className="text-gray-500 dark:text-gray-400 font-bold">로그인이 필요합니다</p>
                <p className="text-xs text-gray-400">익명 투표 기능은 회원만 사용할 수 있습니다.</p>
            </div>
        );
    }

    // 고유 투표자 ID 생성
    const getVoterId = () => user.id;

    const addOption = () => setOptions([...options, '']);
    const removeOption = (idx: number) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== idx));
    };
    const updateOption = (idx: number, val: string) => {
        const newOpts = [...options];
        newOpts[idx] = val;
        setOptions(newOpts);
    };

    const createVote = async () => {
        if (!question.trim() || options.filter(o => o.trim()).length < 2) {
            alert('질문과 최소 2개의 선택지를 입력해주세요.');
            return;
        }
        setIsLoading(true);
        try {
            const id = await storage.createAnonVote(question, options.filter(o => o.trim()));
            setVoteId(id);
            setCreated(true);
        } catch (e) {
            alert('투표 생성 실패. 다시 시도해주세요.');
        }
        setIsLoading(false);
    };

    const copyVoteId = () => {
        navigator.clipboard.writeText(voteId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const loadVote = async () => {
        if (!viewId.trim()) {
            alert('투표 ID를 입력해주세요.');
            return;
        }
        setIsLoading(true);
        const data = await storage.getAnonVote(viewId.trim());
        if (data) {
            setActiveVote(data);
            setHasVoted(data.voters?.includes(getVoterId()) || false);
        } else {
            alert('투표를 찾을 수 없습니다.');
        }
        setIsLoading(false);
    };

    const castVote = async (optIdx: number) => {
        if (!activeVote || hasVoted) return;
        setIsLoading(true);
        const result = await storage.castAnonVote(activeVote.id, optIdx, getVoterId());
        if (result.success) {
            // 실시간 업데이트된 데이터 다시 가져오기
            const updated = await storage.getAnonVote(activeVote.id);
            if (updated) setActiveVote(updated);
            setHasVoted(true);
        } else {
            alert(result.message);
        }
        setIsLoading(false);
    };

    if (activeVote) {
        const total = Object.values(activeVote.votes || {}).reduce((a: any, b: any) => a + b, 0) as number;

        return (
            <div className="space-y-4">
                <button onClick={() => { setActiveVote(null); setHasVoted(false); }} className="text-xs text-cyan-600 font-bold hover:underline">← 뒤로가기</button>

                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl p-4 text-white">
                    <h3 className="font-bold text-lg">{activeVote.question}</h3>
                    <p className="text-cyan-100 text-xs mt-1">총 {total}표 참여</p>
                </div>

                {hasVoted && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                        <Check size={20} className="inline text-green-500 mr-2" />
                        <span className="text-green-600 dark:text-green-400 text-sm font-bold">투표 완료! 결과를 확인하세요.</span>
                    </div>
                )}

                <div className="space-y-2">
                    {activeVote.options?.map((opt: string, idx: number) => {
                        const count = activeVote.votes?.[idx] || 0;
                        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                            <button
                                key={idx}
                                onClick={() => castVote(idx)}
                                disabled={hasVoted || isLoading}
                                className={`w-full p-4 rounded-xl border text-left relative overflow-hidden transition-all ${hasVoted
                                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-default'
                                    : 'border-cyan-200 dark:border-cyan-800 bg-white dark:bg-gray-800 hover:border-cyan-400 hover:shadow-md cursor-pointer'
                                    }`}
                            >
                                <div className="absolute inset-y-0 left-0 bg-cyan-100 dark:bg-cyan-900/30 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                <div className="relative flex justify-between items-center">
                                    <span className="font-medium dark:text-white">{opt}</span>
                                    <span className="text-cyan-600 dark:text-cyan-400 font-bold text-sm">{count}표 ({percent}%)</span>
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
            {/* 투표 참여 섹션 */}
            <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-xl border border-cyan-200 dark:border-cyan-800">
                <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 mb-2 uppercase tracking-wider">🗳️ 투표 참여하기</p>
                <div className="flex gap-2">
                    <input
                        value={viewId}
                        onChange={(e) => setViewId(e.target.value)}
                        placeholder="투표 ID 입력..."
                        className="flex-1 p-2.5 text-sm border border-cyan-200 dark:border-cyan-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-cyan-400 outline-none"
                    />
                    <button onClick={loadVote} disabled={isLoading} className="px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50">
                        {isLoading ? '...' : '참여'}
                    </button>
                </div>
                <p className="text-[10px] text-cyan-500 dark:text-cyan-400 mt-2">🌐 어디서든 투표 ID만 있으면 참여할 수 있습니다</p>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700"></div>

            {/* 투표 생성 섹션 */}
            {!created ? (
                <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">✨ 새 투표 만들기</p>
                    <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="투표 질문을 입력하세요"
                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-cyan-400 outline-none"
                    />
                    <div className="space-y-2">
                        {options.map((opt, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    value={opt}
                                    onChange={(e) => updateOption(idx, e.target.value)}
                                    placeholder={`선택지 ${idx + 1}`}
                                    className="flex-1 p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                                />
                                {options.length > 2 && (
                                    <button onClick={() => removeOption(idx)} className="px-3 text-red-400 hover:text-red-600 font-bold">×</button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button onClick={addOption} className="text-cyan-600 text-sm font-bold hover:underline">+ 선택지 추가</button>
                    <button onClick={createVote} disabled={isLoading} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                        <Vote size={18} /> {isLoading ? '생성 중...' : '익명 투표 생성'}
                    </button>
                </div>
            ) : (
                <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <Check className="text-green-500" size={32} />
                    </div>
                    <div>
                        <p className="font-bold text-lg dark:text-white mb-1">투표가 생성되었습니다!</p>
                        <p className="text-xs text-gray-400">아래 ID를 공유해서 다른 사람에게 참여를 요청하세요</p>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 flex items-center justify-between">
                        <code className="text-sm font-mono text-cyan-600 dark:text-cyan-400 select-all">{voteId}</code>
                        <button onClick={copyVoteId} className="px-3 py-1 bg-cyan-600 text-white text-xs font-bold rounded-lg hover:bg-cyan-700">
                            {copied ? '복사됨!' : '복사'}
                        </button>
                    </div>
                    <button onClick={() => { setViewId(voteId); loadVote(); }} className="text-cyan-600 text-sm font-bold hover:underline">
                        내 투표 보러가기 →
                    </button>
                </div>
            )}
        </div>
    );
};

// 스테가노그래피 (이미지 기반)
const Steganography: React.FC = () => {
    const [mode, setMode] = useState<'encode' | 'decode'>('encode');
    const [message, setMessage] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [extractedMessage, setExtractedMessage] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [copied, setCopied] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setImage(ev.target?.result as string);
            setResultImage(null);
            setExtractedMessage('');
        };
        reader.readAsDataURL(file);
    };

    // LSB 인코딩: 메시지를 이미지의 최하위 비트에 숨김
    const encodeMessage = () => {
        if (!image || !message || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new window.Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);

            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            if (!imageData) return;

            // 메시지를 바이너리로 변환 (UTF-16)
            const msgBinary = message.split('').map(c => c.charCodeAt(0).toString(2).padStart(16, '0')).join('') + '0000000000000000'; // 종결자

            // 최대 저장 가능 문자 수 체크
            const maxChars = Math.floor(imageData.data.length * 3 / 4 / 16);
            if (message.length > maxChars) {
                alert(`이미지가 너무 작습니다. 최대 ${maxChars}자까지 저장 가능합니다.`);
                return;
            }

            // LSB에 메시지 삽입
            let bitIndex = 0;
            for (let i = 0; i < imageData.data.length && bitIndex < msgBinary.length; i += 4) {
                for (let j = 0; j < 3 && bitIndex < msgBinary.length; j++) {
                    imageData.data[i + j] = (imageData.data[i + j] & 0xFE) | parseInt(msgBinary[bitIndex]);
                    bitIndex++;
                }
            }

            ctx?.putImageData(imageData, 0, 0);
            setResultImage(canvas.toDataURL('image/png'));
        };
        img.src = image;
    };

    // LSB 디코딩
    const decodeMessage = () => {
        if (!image || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new window.Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);

            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            if (!imageData) return;

            // LSB 추출
            let binary = '';
            for (let i = 0; i < imageData.data.length; i += 4) {
                for (let j = 0; j < 3; j++) {
                    binary += (imageData.data[i + j] & 1).toString();
                }
            }

            // 16비트씩 문자로 변환
            let decoded = '';
            for (let i = 0; i < binary.length; i += 16) {
                const charCode = parseInt(binary.slice(i, i + 16), 2);
                if (charCode === 0) break; // 종결자
                decoded += String.fromCharCode(charCode);
            }

            setExtractedMessage(decoded || '메시지를 찾을 수 없습니다.');
        };
        img.src = image;
    };

    const downloadImage = () => {
        if (!resultImage) return;
        const a = document.createElement('a');
        a.href = resultImage;
        a.download = 'steganography_encoded.png';
        a.click();
    };

    const copyMessage = () => {
        navigator.clipboard.writeText(extractedMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4">
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-2">
                <button onClick={() => { setMode('encode'); setResultImage(null); setExtractedMessage(''); }}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm ${mode === 'encode' ? 'bg-slate-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    🔒 이미지에 숨기기
                </button>
                <button onClick={() => { setMode('decode'); setResultImage(null); setExtractedMessage(''); }}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm ${mode === 'decode' ? 'bg-slate-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    🔓 이미지에서 추출
                </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="steg-upload" />
                <label htmlFor="steg-upload" className="cursor-pointer">
                    {image ? (
                        <img src={image} alt="Uploaded" className="max-h-40 mx-auto rounded-lg" />
                    ) : (
                        <div className="py-8">
                            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">이미지 업로드 (PNG 권장)</p>
                        </div>
                    )}
                </label>
            </div>

            {mode === 'encode' && (
                <>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="숨길 비밀 메시지 입력..."
                        className="w-full h-24 p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white resize-none"
                    />
                    <button onClick={encodeMessage} disabled={!image || !message}
                        className="w-full py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                        <EyeOff size={18} /> 메시지 숨기기
                    </button>
                    {resultImage && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl space-y-3">
                            <p className="text-xs text-green-600 font-bold">✅ 메시지가 이미지에 숨겨졌습니다!</p>
                            <img src={resultImage} alt="Result" className="max-h-40 mx-auto rounded-lg border" />
                            <button onClick={downloadImage} className="w-full py-2 bg-green-600 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2">
                                <Download size={16} /> 이미지 다운로드
                            </button>
                        </div>
                    )}
                </>
            )}

            {mode === 'decode' && (
                <>
                    <button onClick={decodeMessage} disabled={!image}
                        className="w-full py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                        <EyeOff size={18} /> 메시지 추출
                    </button>
                    {extractedMessage && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-xs text-blue-600 font-bold">🔓 추출된 메시지</p>
                                <button onClick={copyMessage} className="text-xs text-blue-500 hover:underline">
                                    {copied ? '복사됨!' : '복사'}
                                </button>
                            </div>
                            <p className="font-mono text-sm dark:text-white p-3 bg-white dark:bg-gray-800 rounded-lg">{extractedMessage}</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// 디지털 인장 (시각적 인장 생성)
const DigitalStamp: React.FC = () => {
    const { user } = useAuth();
    const [text, setText] = useState('');
    const [stampStyle, setStampStyle] = useState<'circle' | 'square' | 'badge'>('circle');
    const [stampColor, setStampColor] = useState('#b91c1c');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stampUrl, setStampUrl] = useState<string | null>(null);

    const generateStamp = () => {
        if (!text || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 200;
        canvas.height = 200;
        ctx.clearRect(0, 0, 200, 200);

        // 해시 생성
        let hashNum = 0;
        for (const char of text) hashNum = ((hashNum << 5) - hashNum) + char.charCodeAt(0);
        const hash = Math.abs(hashNum).toString(16).slice(0, 8).toUpperCase();
        const date = new Date().toLocaleDateString('ko-KR');

        ctx.fillStyle = stampColor;
        ctx.strokeStyle = stampColor;
        ctx.lineWidth = 4;

        if (stampStyle === 'circle') {
            // 원형 인장
            ctx.beginPath();
            ctx.arc(100, 100, 90, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(100, 100, 80, 0, Math.PI * 2);
            ctx.stroke();

            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(text.slice(0, 8), 100, 75);
            ctx.font = 'bold 24px monospace';
            ctx.fillText(hash, 100, 110);
            ctx.font = '12px sans-serif';
            ctx.fillText(date, 100, 140);
        } else if (stampStyle === 'square') {
            // 사각형 인장
            ctx.strokeRect(10, 10, 180, 180);
            ctx.strokeRect(20, 20, 160, 160);

            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(text.slice(0, 8), 100, 70);
            ctx.font = 'bold 28px monospace';
            ctx.fillText(hash, 100, 115);
            ctx.font = '12px sans-serif';
            ctx.fillText(date, 100, 150);
            ctx.font = '10px sans-serif';
            ctx.fillText(user?.nickname || 'VERIFIED', 100, 175);
        } else {
            // 배지 스타일
            ctx.beginPath();
            for (let i = 0; i < 12; i++) {
                const angle = (i * 30 - 90) * Math.PI / 180;
                const r = i % 2 === 0 ? 90 : 75;
                const x = 100 + r * Math.cos(angle);
                const y = 100 + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();

            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(text.slice(0, 10), 100, 85);
            ctx.font = 'bold 20px monospace';
            ctx.fillText(hash, 100, 115);
            ctx.font = '11px sans-serif';
            ctx.fillText(date, 100, 145);
        }

        setStampUrl(canvas.toDataURL('image/png'));
    };

    const downloadStamp = () => {
        if (!stampUrl) return;
        const a = document.createElement('a');
        a.href = stampUrl;
        a.download = `stamp_${Date.now()}.png`;
        a.click();
    };

    return (
        <div className="space-y-4">
            <canvas ref={canvasRef} className="hidden" />

            <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="인장에 표시할 텍스트 (예: 계약서, 원본증명...)"
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            />

            <div className="flex gap-2">
                <select value={stampStyle} onChange={(e) => setStampStyle(e.target.value as any)}
                    className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white text-sm">
                    <option value="circle">⭕ 원형</option>
                    <option value="square">⬜ 사각형</option>
                    <option value="badge">⭐ 배지</option>
                </select>
                <input type="color" value={stampColor} onChange={(e) => setStampColor(e.target.value)}
                    className="w-12 h-10 rounded-lg cursor-pointer" />
            </div>

            <button onClick={generateStamp} disabled={!text}
                className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                <Fingerprint size={18} /> 디지털 인장 생성
            </button>

            {stampUrl && (
                <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center space-y-4">
                    <img src={stampUrl} alt="Stamp" className="mx-auto w-40 h-40" />
                    <button onClick={downloadStamp}
                        className="px-6 py-2 bg-amber-600 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 mx-auto">
                        <Download size={16} /> 인장 다운로드
                    </button>
                    <p className="text-xs text-amber-500">문서에 첨부하여 원본 증명에 사용하세요</p>
                </div>
            )}
        </div>
    );
};

// 워터마크 제거기
const WatermarkRemover: React.FC = () => {
    const [image, setImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setImage(ev.target?.result as string);
            setProcessedImage(null);
        };
        reader.readAsDataURL(file);
    };

    // 간단한 워터마크 약화 처리 (실제로는 AI 모델 필요)
    const processImage = () => {
        if (!image || !canvasRef.current) return;
        setIsProcessing(true);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new window.Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);

            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            if (!imageData) return;

            // 간단한 대비 증가 및 밝은 영역 처리 (워터마크 약화 시뮬레이션)
            for (let i = 0; i < imageData.data.length; i += 4) {
                // 밝은 반투명 영역 감지 및 처리
                const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
                if (avg > 200) {
                    // 밝은 영역을 더 밝게
                    imageData.data[i] = Math.min(255, imageData.data[i] * 1.1);
                    imageData.data[i + 1] = Math.min(255, imageData.data[i + 1] * 1.1);
                    imageData.data[i + 2] = Math.min(255, imageData.data[i + 2] * 1.1);
                } else {
                    // 대비 약간 증가
                    const factor = 1.05;
                    imageData.data[i] = Math.min(255, Math.max(0, (imageData.data[i] - 128) * factor + 128));
                    imageData.data[i + 1] = Math.min(255, Math.max(0, (imageData.data[i + 1] - 128) * factor + 128));
                    imageData.data[i + 2] = Math.min(255, Math.max(0, (imageData.data[i + 2] - 128) * factor + 128));
                }
            }

            ctx?.putImageData(imageData, 0, 0);
            setProcessedImage(canvas.toDataURL('image/png'));
            setIsProcessing(false);
        };
        img.src = image;
    };

    const downloadImage = () => {
        if (!processedImage) return;
        const a = document.createElement('a');
        a.href = processedImage;
        a.download = 'watermark_removed.png';
        a.click();
    };

    return (
        <div className="space-y-4">
            <canvas ref={canvasRef} className="hidden" />

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 rounded-lg p-3 text-xs text-yellow-700 dark:text-yellow-300">
                ⚠️ 이 도구는 간단한 워터마크 약화 처리만 지원합니다. 복잡한 워터마크 제거는 전문 AI 도구가 필요합니다.
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="watermark-upload" />
                <label htmlFor="watermark-upload" className="cursor-pointer">
                    {image ? (
                        <img src={image} alt="Uploaded" className="max-h-40 mx-auto rounded-lg" />
                    ) : (
                        <div className="py-8">
                            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">워터마크가 있는 이미지 업로드</p>
                        </div>
                    )}
                </label>
            </div>

            <button onClick={processImage} disabled={!image || isProcessing}
                className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                <ImageOff size={18} /> {isProcessing ? '처리 중...' : '워터마크 제거 시도'}
            </button>

            {processedImage && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl space-y-3">
                    <p className="text-xs text-purple-600 font-bold">✅ 처리 완료</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">원본</p>
                            <img src={image!} alt="Original" className="max-h-32 mx-auto rounded-lg border" />
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">결과</p>
                            <img src={processedImage} alt="Processed" className="max-h-32 mx-auto rounded-lg border" />
                        </div>
                    </div>
                    <button onClick={downloadImage} className="w-full py-2 bg-purple-600 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2">
                        <Download size={16} /> 결과 다운로드
                    </button>
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
                { id: 'steganography', name: '스테가노그래피', icon: EyeOff, color: 'bg-slate-100 dark:bg-slate-900/30 text-slate-600', desc: '이미지에 비밀 메시지 숨기기', component: Steganography },
                { id: 'digital-stamp', name: '디지털 인장', icon: Fingerprint, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600', desc: '시각적 원본 증명 인장', component: DigitalStamp },
            ]
        },
        {
            catId: 'image',
            name: '🖼️ 이미지 도구',
            desc: '이미지 편집 및 프라이버시',
            tools: [
                { id: 'exif-cleaner', name: 'Exif 제거기', icon: ImageOff, color: 'bg-green-100 dark:bg-green-900/30 text-green-600', desc: '사진 메타데이터 삭제', component: ExifCleaner },
                { id: 'watermark-remover', name: '워터마크 제거', icon: Trash2, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600', desc: '이미지 워터마크 약화', component: WatermarkRemover },
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
        },
        {
            catId: 'ai',
            name: '🤖 AI 도구',
            desc: '인공지능 활용 유틸리티',
            tools: [
                { id: 'ai-analyzer', name: 'AI 모델 분석기', icon: BarChart, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600', desc: '모델 성능/비용 분석', link: '/tools/ai-analysis' },
                { id: 'mock-invest', name: '모의투자 시뮬레이션', icon: BarChart, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600', desc: '실시간 모의투자', link: '/tools/mock-invest' },
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
