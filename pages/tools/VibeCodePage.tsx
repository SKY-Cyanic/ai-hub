import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getGroqClient, ChatMessage } from '../../services/groqClient';
import { UsageService, UsageInfo } from '../../services/usageService';
import { db } from '../../services/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-markup';
import {
    Code2, Send, Play, Copy, Check, Trash2,
    FileCode, Loader2, AlertTriangle, Zap,
    Maximize2, Minimize2, Download, ShoppingBag, Share2, Gamepad2, RefreshCw
} from 'lucide-react';

type Language = 'html' | 'css' | 'javascript' | 'react' | 'python';

interface ChatMsg {
    role: 'user' | 'assistant';
    content: string;
}

const LANGUAGE_OPTIONS: { id: Language; label: string; icon: string; prism: string }[] = [
    { id: 'html', label: 'HTML', icon: '🌐', prism: 'markup' },
    { id: 'css', label: 'CSS', icon: '🎨', prism: 'css' },
    { id: 'javascript', label: 'JS', icon: '⚡', prism: 'javascript' },
    { id: 'react', label: 'React', icon: '⚛️', prism: 'jsx' },
    { id: 'python', label: 'Python', icon: '🐍', prism: 'python' },
];

const EXAMPLE_PROMPTS = [
    "클릭하면 색 바뀌는 버튼",
    "다크모드 토글",
    "카운터 앱",
    "간단한 계산기",
    "TODO 리스트",
];

// think 태그 제거
const removeThinkTags = (text: string): string => {
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '');
    if (cleaned.includes('<think>')) {
        cleaned = cleaned.replace(/<think>[\s\S]*/g, '');
    }
    return cleaned.trim();
};

// 코드 블록만 추출
const extractCodeFromResponse = (text: string): string => {
    const codeMatch = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
    return codeMatch ? codeMatch[1].trim() : '';
};

const VibeCodePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [code, setCode] = useState<string>('');
    const [language, setLanguage] = useState<Language>('html');
    const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [publishTitle, setPublishTitle] = useState('');
    const [publishType, setPublishType] = useState<'community' | 'game'>('community');
    const [isPublishing, setIsPublishing] = useState(false);
    const [previewKey, setPreviewKey] = useState(0); // 미리보기 강제 새로고침용

    const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
    const [userCredits, setUserCredits] = useState(0);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const codeDisplayRef = useRef<HTMLPreElement>(null);
    const groqClient = getGroqClient();

    // 사용량 로드
    const loadUsageInfo = useCallback(async () => {
        const info = await UsageService.getUsageInfo(user?.id);
        setUsageInfo(info);
        if (user) {
            const credits = await UsageService.getUserCredits(user.id);
            setUserCredits(credits);
        }
    }, [user]);

    useEffect(() => {
        loadUsageInfo();
    }, [loadUsageInfo]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // 구문 강조 적용
    useEffect(() => {
        if (codeDisplayRef.current && code) {
            const langOption = LANGUAGE_OPTIONS.find(l => l.id === language);
            try {
                const highlighted = Prism.highlight(
                    code,
                    Prism.languages[langOption?.prism || 'javascript'] || Prism.languages.javascript,
                    langOption?.prism || 'javascript'
                );
                codeDisplayRef.current.innerHTML = highlighted;
            } catch (e) {
                codeDisplayRef.current.textContent = code;
            }
        }
    }, [code, language]);

    // 미리보기 업데이트
    const updatePreview = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe || !code.trim()) return;

        try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) return;

            let htmlContent = code;

            // HTML이 아닌 경우 래핑
            if (language === 'css') {
                htmlContent = `
          <style>${code}</style>
          <div class="demo">
            <h2>CSS 데모</h2>
            <button class="btn">버튼</button>
            <p>텍스트 예시</p>
          </div>
        `;
            } else if (language === 'javascript') {
                htmlContent = `
          <div id="app"></div>
          <script>
            try { ${code} } catch(e) { document.body.innerHTML = '<p style="color:red">Error: ' + e.message + '</p>'; }
          </script>
        `;
            }

            const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', system-ui, sans-serif;
      margin: 0; padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; color: white;
    }
    button { 
      padding: 12px 24px; border: none; border-radius: 12px;
      background: white; color: #667eea; font-weight: bold;
      cursor: pointer; transition: all 0.3s; margin: 5px;
    }
    button:hover { transform: scale(1.05); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    input, textarea { 
      padding: 12px; border: 2px solid rgba(255,255,255,0.3);
      border-radius: 12px; background: rgba(255,255,255,0.1);
      color: white; margin: 5px; outline: none;
    }
    input:focus, textarea:focus { border-color: white; }
    .demo { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 16px; }
    h1, h2, h3 { margin: 0 0 15px 0; }
    ul, ol { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`;

            doc.open();
            doc.write(fullHtml);
            doc.close();
        } catch (e) {
            console.error('Preview error:', e);
        }
    }, [code, language]);

    // 코드 변경시 미리보기 업데이트
    useEffect(() => {
        const timer = setTimeout(updatePreview, 300);
        return () => clearTimeout(timer);
    }, [code, language, previewKey, updatePreview]);

    // 시스템 프롬프트 - 효율적인 코드 생성
    const buildSystemPrompt = (): string => {
        return `You are an expert ${language.toUpperCase()} developer. Create EFFICIENT, WORKING code.

CRITICAL RULES:
1. Return ONLY a code block - no explanations
2. Code must be COMPLETE and RUNNABLE
3. For HTML: include ALL necessary CSS and JavaScript inline
4. Make it VISUALLY IMPRESSIVE with:
   - Gradient backgrounds
   - Smooth animations/transitions
   - Modern rounded corners
   - Hover effects
5. Write EFFICIENT code - not too short, not bloated
6. NEVER use placeholder comments like "// add more here"
7. Every feature must WORK
8. NO <think> tags ever

Example quality for "버튼 클릭시 색 변경":
\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #1a1a2e, #16213e); }
    .btn { padding: 20px 40px; font-size: 18px; border: none; border-radius: 15px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; cursor: pointer; transition: all 0.3s; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4); }
    .btn:hover { transform: translateY(-3px); box-shadow: 0 15px 40px rgba(102, 126, 234, 0.6); }
  </style>
</head>
<body>
  <button class="btn" onclick="this.style.background = 'linear-gradient(135deg, #' + Math.floor(Math.random()*16777215).toString(16) + ', #' + Math.floor(Math.random()*16777215).toString(16) + ')'">클릭해서 색상 변경!</button>
</body>
</html>
\`\`\`

Current language: ${language}`;
    };

    // 코드 생성
    const handleGenerate = async () => {
        if (!input.trim() || isGenerating) return;

        const currentUsage = await UsageService.getUsageInfo(user?.id);

        if (currentUsage.needsCredits && user) {
            const success = await UsageService.consumeCredits(user.id, 3);
            if (!success) { setShowLimitModal(true); return; }
            setUserCredits(prev => prev - 3);
        } else if (currentUsage.needsCredits && !user) {
            setShowLimitModal(true); return;
        }

        const userMessage = input.trim();
        setInput('');
        setError(null);

        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsGenerating(true);

        await UsageService.incrementUsage(user?.id);
        await loadUsageInfo();

        try {
            const messages: ChatMessage[] = [
                { role: 'system', content: buildSystemPrompt() },
                { role: 'user', content: userMessage }
            ];

            setChatMessages(prev => [...prev, { role: 'assistant', content: '🔨 코드 생성중...' }]);

            let fullResponse = '';
            await groqClient.streamChat(
                {
                    model: 'openai/gpt-oss-120b',
                    messages,
                    max_tokens: 4000,
                    temperature: 0.3,
                },
                (delta, fullText) => {
                    const cleanText = removeThinkTags(fullText);
                    fullResponse = cleanText;
                    const extractedCode = extractCodeFromResponse(cleanText);
                    if (extractedCode) setCode(extractedCode);
                }
            );

            const finalCode = extractCodeFromResponse(fullResponse);
            if (finalCode) {
                setCode(finalCode);
                setPreviewKey(k => k + 1);
                setChatMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: '✅ 완료! 미리보기를 확인하세요.' };
                    return updated;
                });
            } else {
                setChatMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: '❌ 실패. 다시 시도해주세요.' };
                    return updated;
                });
            }
        } catch (err: any) {
            console.error('Generate error:', err);
            setError(err.message || '코드 생성 실패');
            setChatMessages(prev => prev.slice(0, -1));
        } finally {
            setIsGenerating(false);
        }
    };

    // 게시
    const handlePublish = async () => {
        if (!user || !code.trim() || !publishTitle.trim()) return;
        setIsPublishing(true);
        try {
            const postData = {
                title: publishTitle,
                code: code,
                language: language,
                authorId: user.id,
                authorName: user.nickname || user.email?.split('@')[0] || '익명',
                createdAt: Timestamp.now(),
                plays: 0,
                likes: 0,
                views: 0,
            };

            if (publishType === 'game') {
                await addDoc(collection(db, 'user_games'), postData);
                alert('게임이 업로드되었습니다! 🎮');
            } else {
                await addDoc(collection(db, 'vibe_code_gallery'), postData);
                alert('코드가 게시되었습니다! 🎉');
            }
            setShowPublishModal(false);
            setPublishTitle('');
        } catch (err) {
            console.error('Publish error:', err);
            alert('게시 실패');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const ext = language === 'react' ? 'jsx' : language;
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vibe-code.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        setCode('');
        setChatMessages([]);
        setError(null);
        setPreviewKey(k => k + 1);
    };

    if (!user) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center p-4 text-center">
                <Code2 className="text-indigo-500 mb-4" size={48} />
                <h2 className="text-xl font-bold mb-2">로그인이 필요해요</h2>
                <p className="text-gray-500">바이브 코딩을 시작하려면 먼저 로그인해주세요.</p>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-3">
            {/* 왼쪽: 코드 + 미리보기 */}
            <div className="flex-1 flex flex-col gap-3">
                {/* 헤더 */}
                <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-3 rounded-2xl border dark:border-gray-800 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                            <Code2 className="text-white" size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-black">바이브 코딩</h1>
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-yellow-400 text-yellow-900 rounded">BETA</span>
                            </div>
                            <p className="text-[10px] text-gray-500">🧠 AI가 코드를 만들어줘요</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                            {LANGUAGE_OPTIONS.slice(0, 3).map(lang => (
                                <button
                                    key={lang.id}
                                    onClick={() => setLanguage(lang.id)}
                                    className={`px-2 py-1 text-xs rounded transition-all ${language === lang.id ? 'bg-white dark:bg-gray-700 shadow font-bold' : 'text-gray-500'}`}
                                >
                                    {lang.icon}
                                </button>
                            ))}
                        </div>
                        {code && (
                            <button onClick={() => setShowPublishModal(true)} className="px-2 py-1 bg-green-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1">
                                <Share2 size={12} /> 게시
                            </button>
                        )}
                    </div>
                </div>

                {/* 코드 에디터 */}
                <div className="bg-[#1d1f21] rounded-2xl overflow-hidden border border-gray-800 shadow-lg">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#2d2f31] border-b border-gray-700">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            </div>
                            <span className="text-[10px] font-mono text-gray-500">code.{language}</span>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={handleCopy} disabled={!code} className="p-1 text-gray-500 hover:text-white disabled:opacity-30" title="복사">
                                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                            </button>
                            <button onClick={handleDownload} disabled={!code} className="p-1 text-gray-500 hover:text-blue-400 disabled:opacity-30" title="다운로드">
                                <Download size={12} />
                            </button>
                            <button onClick={handleClear} className="p-1 text-gray-500 hover:text-red-400" title="초기화">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                    <div className="relative h-48 lg:h-56 overflow-auto">
                        <pre ref={codeDisplayRef} className="absolute inset-0 p-3 font-mono text-xs pointer-events-none whitespace-pre-wrap" style={{ color: '#c5c8c6' }} />
                        <textarea
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            placeholder="// AI가 코드를 생성합니다..."
                            className="absolute inset-0 w-full h-full p-3 bg-transparent text-transparent caret-white font-mono text-xs resize-none outline-none"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* 미리보기 - 항상 표시 (HTML/CSS/JS만) */}
                {(language === 'html' || language === 'css' || language === 'javascript') && (
                    <div className={`bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-lg flex-1 ${isPreviewExpanded ? 'fixed inset-4 z-50' : ''}`}>
                        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700">
                            <div className="flex items-center gap-2">
                                <Play size={12} className="text-green-400" />
                                <span className="text-[10px] font-bold text-gray-400">미리보기</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setPreviewKey(k => k + 1)} className="p-1 text-gray-500 hover:text-white" title="새로고침">
                                    <RefreshCw size={12} />
                                </button>
                                <button onClick={() => setIsPreviewExpanded(!isPreviewExpanded)} className="p-1 text-gray-500 hover:text-white">
                                    {isPreviewExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                </button>
                            </div>
                        </div>
                        <iframe
                            key={previewKey}
                            ref={iframeRef}
                            title="Preview"
                            className={`w-full ${isPreviewExpanded ? 'h-[calc(100%-32px)]' : 'h-48 lg:h-64'}`}
                            sandbox="allow-scripts allow-modals allow-forms"
                            style={{ background: '#1a1a2e' }}
                        />
                    </div>
                )}
            </div>

            {/* 오른쪽: 채팅 */}
            <div className="w-full lg:w-72 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 shadow-lg overflow-hidden">
                <div className="p-2.5 border-b dark:border-gray-800 flex items-center gap-2">
                    <Zap className="text-yellow-500" size={16} />
                    <span className="font-bold text-sm">AI 어시스턴트</span>
                </div>

                {error && (
                    <div className="mx-2 mt-2 p-2 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-1 text-[10px] text-red-400">
                        <AlertTriangle size={12} />{error}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[150px]">
                    {chatMessages.length === 0 ? (
                        <div className="space-y-1.5">
                            <p className="text-[9px] text-gray-500 font-bold uppercase">예시</p>
                            {EXAMPLE_PROMPTS.map((p, i) => (
                                <button key={i} onClick={() => setInput(p)} className="block w-full text-left p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-[11px] text-gray-600 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all">
                                    {p}
                                </button>
                            ))}
                        </div>
                    ) : (
                        chatMessages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] px-2.5 py-1.5 rounded-xl text-[11px] ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                                    {m.content}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-2 border-t dark:border-gray-800">
                    <div className="flex gap-1.5">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && input.trim() && !isGenerating) { e.preventDefault(); handleGenerate(); } }}
                            placeholder="만들고 싶은 것?"
                            disabled={isGenerating}
                            className="flex-1 px-2.5 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs outline-none disabled:opacity-50"
                        />
                        <button onClick={handleGenerate} disabled={!input.trim() || isGenerating} className="px-2.5 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                    {usageInfo && (
                        <p className="text-center text-[8px] text-gray-500 mt-1">
                            {usageInfo.hasUnlimitedPass ? '🎫무제한' : usageInfo.needsCredits ? `💎3CR • ${userCredits}CR` : `${usageInfo.dailyUsed}/${usageInfo.dailyLimit}`}
                        </p>
                    )}
                </div>
            </div>

            {/* 모달들 */}
            {showLimitModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowLimitModal(false)}>
                    <div className="bg-white dark:bg-gray-900 w-full max-w-xs rounded-2xl p-5 text-center" onClick={e => e.stopPropagation()}>
                        <ShoppingBag className="mx-auto text-yellow-500 mb-2" size={36} />
                        <h3 className="font-black mb-1">무료 끝!</h3>
                        <p className="text-gray-500 text-xs mb-3">상점에서 크레딧을 구매하세요.</p>
                        <button onClick={() => { navigate('/shop'); setShowLimitModal(false); }} className="w-full py-2.5 bg-yellow-500 text-white rounded-xl font-bold text-sm">상점 가기</button>
                        <button className="mt-2 text-xs text-gray-400" onClick={() => setShowLimitModal(false)}>닫기</button>
                    </div>
                </div>
            )}

            {showPublishModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPublishModal(false)}>
                    <div className="bg-white dark:bg-gray-900 w-full max-w-xs rounded-2xl p-5" onClick={e => e.stopPropagation()}>
                        <h3 className="font-black mb-3 text-center">🎉 게시하기</h3>
                        <input value={publishTitle} onChange={e => setPublishTitle(e.target.value)} placeholder="제목" className="w-full p-2.5 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 mb-3 text-sm" />
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <button onClick={() => setPublishType('community')} className={`p-2.5 rounded-xl border-2 text-xs font-bold ${publishType === 'community' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
                                <Code2 size={16} className="mx-auto mb-1 text-indigo-500" />코드 갤러리
                            </button>
                            <button onClick={() => setPublishType('game')} className={`p-2.5 rounded-xl border-2 text-xs font-bold ${publishType === 'game' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
                                <Gamepad2 size={16} className="mx-auto mb-1 text-green-500" />게임
                            </button>
                        </div>
                        <p className="text-[9px] text-gray-400 text-center mb-2">⚠️ 규정 위반 콘텐츠는 삭제됩니다</p>
                        <button onClick={handlePublish} disabled={!publishTitle.trim() || isPublishing} className="w-full py-2.5 bg-green-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-1">
                            {isPublishing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />} 게시
                        </button>
                        <button className="w-full mt-2 py-2 text-xs text-gray-400" onClick={() => setShowPublishModal(false)}>취소</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VibeCodePage;
