import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bot, Send, Loader2, Sparkles, Settings, X, AlertTriangle } from 'lucide-react';
import { initWebLLM, generateResponse, createPersonaPrompt, checkWebGPUSupport, ChatMessage, getLastError, PERSONAS, PersonaType } from '../services/webllm';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

interface PersonaMemory {
    nickname: string;
    interests: string[];
    persona_type: PersonaType;
    conversation_summary: string;
    last_updated?: any;
}

const PersonaPage: React.FC = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; timestamp: Date }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState({ progress: 0, text: '준비 중...' });
    const [engineReady, setEngineReady] = useState(false);
    const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
    const [memory, setMemory] = useState<PersonaMemory>({
        nickname: '',
        interests: [],
        persona_type: 'trendy_yuna',
        conversation_summary: ''
    });
    const [showSettings, setShowSettings] = useState(false);
    const [showNicknameModal, setShowNicknameModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // 스크롤 자동 이동
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // WebGPU 지원 확인 및 메모리 로드
    useEffect(() => {
        const init = async () => {
            const supported = await checkWebGPUSupport();
            setWebGPUSupported(supported);

            if (user) {
                await loadMemory();
            }
        };
        init();
    }, [user]);

    // 메모리 로드
    const loadMemory = async () => {
        if (!user) return;
        try {
            const memoryDoc = await getDoc(doc(db, 'persona_memory', user.id));
            if (memoryDoc.exists()) {
                setMemory(memoryDoc.data() as PersonaMemory);
            } else {
                setShowNicknameModal(true);
            }
        } catch (e) {
            console.error('Memory load error:', e);
        }
    };

    // 메모리 저장
    const saveMemory = async (newMemory: Partial<PersonaMemory>) => {
        if (!user) return;
        const updated = { ...memory, ...newMemory, last_updated: serverTimestamp() };
        setMemory(updated);
        try {
            await setDoc(doc(db, 'persona_memory', user.id), updated);
        } catch (e) {
            console.error('Memory save error:', e);
        }
    };

    // 엔진 초기화
    const handleInitEngine = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        const success = await initWebLLM((progress, text) => {
            setLoadingProgress({ progress, text });
        });
        setEngineReady(success);
        setIsLoading(false);

        if (success) {
            // 인사 메시지 (페르소나별로 다르게)
            const greetings: Record<PersonaType, string> = {
                trendy_yuna: `헤이 ${memory.nickname}~! 오늘 뭐 했어?? 💖`,
                workout_minho: `오 ${memory.nickname}! 오늘 운동했어? 💪`,
                chill_jiwon: `안녕 ${memory.nickname}~ 오늘 하루 어땠어? ☕`,
                sassy_zoe: `${memory.nickname} 왔네 ㅋㅋ 오늘 할 말 있어?`
            };
            setMessages([{ role: 'assistant', content: greetings[memory.persona_type], timestamp: new Date() }]);
        } else {
            // 에러 메시지 표시
            setErrorMessage(getLastError() || 'AI 엔진 초기화에 실패했습니다.');
        }
    };

    // 메시지 전송
    const handleSend = async () => {
        if (!input.trim() || !engineReady || isTyping) return;

        const userMessage = input.trim();
        setInput('');

        setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
        setIsTyping(true);

        try {
            const systemPrompt = createPersonaPrompt(
                memory.persona_type,
                memory.nickname,
                memory.interests,
                memory.conversation_summary
            );

            const chatMessages: ChatMessage[] = [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: userMessage }
            ];

            let assistantMessage = '';
            setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date() }]);

            await generateResponse(chatMessages, (chunk) => {
                assistantMessage += chunk;
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: assistantMessage, timestamp: new Date() };
                    return updated;
                });
            });

        } catch (error) {
            console.error('Response error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '앗, 잠깐 생각이 멈췄어... 다시 말해줄래? 🙈',
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    // 페르소나 아이콘 및 색상
    const personaStyles: Record<PersonaType, { icon: string; color: string }> = {
        trendy_yuna: { icon: '💖', color: 'text-pink-400' },
        workout_minho: { icon: '🔥', color: 'text-orange-500' },
        chill_jiwon: { icon: '☕', color: 'text-amber-600' },
        sassy_zoe: { icon: '💅', color: 'text-purple-500' }
    };

    // WebGPU 미지원
    if (webGPUSupported === false) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-md">
                    <div className="text-6xl mb-4">😢</div>
                    <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">WebGPU를 지원하지 않아요</h2>
                    <p className="text-gray-500 text-sm mb-4">
                        이 브라우저에서는 온디바이스 AI를 사용할 수 없어요.<br />
                        Chrome 또는 Edge 최신 버전을 사용해주세요.
                    </p>
                    <a href="https://www.google.com/chrome/" target="_blank" rel="noopener noreferrer"
                        className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">
                        Chrome 다운로드
                    </a>
                </div>
            </div>
        );
    }

    // 닉네임 설정 모달
    if (showNicknameModal) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-1 rounded-3xl shadow-2xl animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md">
                        <div className="text-center mb-6">
                            <div className="inline-flex p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
                                <Sparkles className="text-white" size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 dark:text-white">AI 친구 만들기</h2>
                            <p className="text-gray-500 text-sm mt-2">나만의 AI 친구가 너를 기억할 거야!</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2">뭐라고 부를까?</label>
                                <input
                                    type="text"
                                    value={memory.nickname}
                                    onChange={e => setMemory({ ...memory, nickname: e.target.value })}
                                    placeholder="닉네임 입력"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-purple-500 outline-none transition-all text-gray-800 dark:text-white font-bold"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2">어떤 친구가 좋아?</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(PERSONAS) as PersonaType[]).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setMemory({ ...memory, persona_type: type })}
                                            className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${memory.persona_type === type
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                                                }`}
                                        >
                                            <span className="text-xl">{personaStyles[type].icon}</span>
                                            <div className="text-left">
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 block">{PERSONAS[type].name}</span>
                                                <span className="text-[10px] text-gray-400">{PERSONAS[type].description}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    if (!memory.nickname.trim()) return;
                                    await saveMemory(memory);
                                    setShowNicknameModal(false);
                                }}
                                disabled={!memory.nickname.trim()}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                시작하기 ✨
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 모델 로딩 전
    if (!engineReady) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="relative inline-block mb-6">
                        <div className="w-32 h-32 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full flex items-center justify-center animate-pulse">
                            <Bot className="text-white" size={48} />
                        </div>
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="text-white animate-spin" size={80} />
                            </div>
                        )}
                    </div>

                    <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">
                        {isLoading ? 'AI 친구 연결 중...' : `${memory.nickname}의 AI 친구`}
                    </h2>

                    {isLoading ? (
                        <div className="space-y-3">
                            <p className="text-gray-500 text-sm">{loadingProgress.text}</p>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                    style={{ width: `${loadingProgress.progress * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400">첫 실행 시 모델 다운로드(~800MB)가 필요해요</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {errorMessage ? (
                                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
                                        <div>
                                            <h3 className="font-bold text-red-700 dark:text-red-400 mb-1">연결 실패</h3>
                                            <p className="text-sm text-red-600 dark:text-red-300 mb-3">{errorMessage}</p>
                                            {errorMessage.includes('저장 공간') && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                    <p className="font-bold mb-1">해결 방법:</p>
                                                    <ol className="list-decimal ml-4 space-y-1">
                                                        <li>Chrome 설정 → 개인정보 보호 → 인터넷 사용 기록 삭제</li>
                                                        <li>"캐시된 이미지 및 파일" 선택 후 삭제</li>
                                                        <li>페이지 새로고침 후 다시 시도</li>
                                                    </ol>
                                                </div>
                                            )}
                                            <button
                                                onClick={handleInitEngine}
                                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all"
                                            >
                                                다시 시도
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-gray-500 text-sm">
                                        내 기기에서 직접 AI가 작동해요!<br />
                                        대화 내용은 서버로 전송되지 않아요 🔒
                                    </p>
                                    <button
                                        onClick={handleInitEngine}
                                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                                    >
                                        <span className="flex items-center gap-2 justify-center">
                                            <Sparkles size={20} />
                                            대화 시작하기
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 로그인 필요
    if (!user) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔐</div>
                    <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">로그인이 필요해요</h2>
                    <p className="text-gray-500 text-sm">AI 친구와 대화하려면 로그인해주세요</p>
                </div>
            </div>
        );
    }

    // 채팅 UI
    return (
        <div className="h-[calc(100vh-160px)] flex flex-col bg-gradient-to-b from-purple-900/20 to-gray-900/20 dark:from-purple-950 dark:to-gray-950 rounded-3xl overflow-hidden border border-purple-500/20">
            {/* 헤더 */}
            <div className="p-4 bg-white/10 dark:bg-black/20 backdrop-blur-xl border-b border-purple-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl">
                        {personaStyles[memory.persona_type].icon}
                    </div>
                    <div>
                        <h3 className="font-black text-gray-800 dark:text-white text-lg">{PERSONAS[memory.persona_type].name}</h3>
                        <p className="text-xs text-gray-500">{PERSONAS[memory.persona_type].description}</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <Settings size={20} className="text-gray-400" />
                </button>
            </div>

            {/* 설정 패널 */}
            {showSettings && (
                <div className="p-4 bg-purple-500/10 border-b border-purple-500/20 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">페르소나 변경</span>
                        <button onClick={() => setShowSettings(false)}>
                            <X size={16} className="text-gray-400" />
                        </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {(Object.keys(PERSONAS) as PersonaType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => saveMemory({ persona_type: type })}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${memory.persona_type === type
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-white/20'
                                    }`}
                            >
                                {personaStyles[type].icon} {PERSONAS[type].name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 메시지 영역 */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-br-sm'
                            : 'bg-white/20 dark:bg-gray-800/80 text-gray-800 dark:text-white rounded-bl-sm backdrop-blur-sm'
                            }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-white/20 dark:bg-gray-800/80 p-4 rounded-2xl rounded-bl-sm backdrop-blur-sm">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 입력 영역 */}
            <div className="p-4 bg-white/10 dark:bg-black/20 backdrop-blur-xl border-t border-purple-500/20">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="메시지를 입력하세요..."
                        disabled={isTyping}
                        className="flex-1 px-4 py-3 bg-white/20 dark:bg-gray-800/50 rounded-2xl border border-purple-500/30 focus:border-purple-500 outline-none transition-all text-gray-800 dark:text-white placeholder-gray-400"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-bold disabled:opacity-50 hover:shadow-lg transition-all active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PersonaPage;
