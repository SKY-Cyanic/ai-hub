import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PERSONAS, PersonaType } from '../constants/personas';
import { Send, Sparkles, Settings, X, AlertTriangle, Zap, Plus, Save, ShoppingBag } from 'lucide-react';
import { MemoryService, UserPersonaProfile, ConversationMessage } from '../services/memory';
import { getGroqClient, ChatMessage } from '../services/groqClient';
import { UsageService, UsageInfo } from '../services/usageService';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// <think> 태그 제거 함수
const removeThinkTags = (text: string): string => {
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '');
    if (cleaned.includes('<think>')) {
        cleaned = cleaned.replace(/<think>[\s\S]*/g, '');
    }
    return cleaned.trim();
};

const DEFAULT_PERSONA: PersonaType = 'trendy_yuna';
const getPersona = (type: string | undefined) => {
    if (type && PERSONAS[type as PersonaType]) {
        return PERSONAS[type as PersonaType];
    }
    return PERSONAS[DEFAULT_PERSONA];
};

const PersonaPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showCustomCreate, setShowCustomCreate] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [profile, setProfile] = useState<UserPersonaProfile | null>(null);
    const [localNickname, setLocalNickname] = useState('');
    const [localPersonaType, setLocalPersonaType] = useState<PersonaType | 'custom'>(DEFAULT_PERSONA);

    const [customName, setCustomName] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    const [customPrompt, setCustomPrompt] = useState('');

    const [conversationContext, setConversationContext] = useState('');

    // 사용량 관리
    const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
    const [userCredits, setUserCredits] = useState(0);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const groqClient = getGroqClient();

    const currentPersona = localPersonaType === 'custom'
        ? {
            id: 'custom' as any,
            name: profile?.customPersonaName || customName || '커스텀',
            icon: '✨',
            description: profile?.customPersonaDescription || customDescription || '나만의 AI 친구',
            greeting: `안녕 ${localNickname}! 반가워~ ✨`,
            color: 'text-cyan-400',
            systemPromptMixin: profile?.customPersonaPrompt || customPrompt || '친근하고 따뜻한 친구처럼 대화해.'
        }
        : getPersona(localPersonaType);

    // 자동 스크롤
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 사용량 로드
    const loadUsageInfo = useCallback(async () => {
        const info = await UsageService.getUsageInfo(user?.id);
        setUsageInfo(info);
        if (user) {
            const credits = await UsageService.getUserCredits(user.id);
            setUserCredits(credits);
        }
    }, [user]);

    // 프로필 및 대화 기록 로드
    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                const p = await MemoryService.getUserProfile(user.id);
                setProfile(p);
                await loadUsageInfo();

                const context = await MemoryService.getConversationContext(user.id);
                setConversationContext(context);

                const prevMessages = await MemoryService.loadConversation(user.id);
                if (prevMessages.length > 0) {
                    setMessages(prevMessages.map(m => ({
                        role: m.role,
                        content: m.content,
                        timestamp: new Date(m.timestamp)
                    })));
                }

                if (!p.nickname) {
                    setShowOnboarding(true);
                } else {
                    setLocalNickname(p.nickname);

                    if (p.customPersonaName) {
                        setLocalPersonaType('custom');
                        setCustomName(p.customPersonaName);
                        setCustomDescription(p.customPersonaDescription || '');
                        setCustomPrompt(p.customPersonaPrompt || '');
                    } else {
                        const validType = PERSONAS[p.personaType as PersonaType] ? p.personaType as PersonaType : DEFAULT_PERSONA;
                        setLocalPersonaType(validType);
                    }

                    if (prevMessages.length === 0) {
                        const persona = p.customPersonaName
                            ? { greeting: `안녕 ${p.nickname}! 반가워~ ✨` }
                            : getPersona(p.personaType);
                        setMessages([{
                            role: 'assistant',
                            content: persona.greeting.replace('~', ` ${p.nickname}~`),
                            timestamp: new Date()
                        }]);
                    }
                }
            } catch (e) {
                console.error('Load error:', e);
            }
        };

        loadData();
    }, [user, loadUsageInfo]);

    const buildSystemPrompt = useCallback((): string => {
        const persona = currentPersona;
        const interests = profile?.interests?.join(',') || '';
        const lastSummary = profile?.lastConversationSummary || '';

        let prompt = `역할:${persona.name}/말투:20대 반말+이모지
${persona.systemPromptMixin}
이름:${localNickname}`;

        if (interests) prompt += `/관심사:${interests}`;
        if (lastSummary) prompt += `/기억:${lastSummary}`;
        if (conversationContext) prompt += `/최근대화:${conversationContext}`;

        prompt += `
규칙:
1. 1~3문장으로 짧게 대답해
2. 자연스럽고 친근하게
3. <think> 태그 절대 사용 금지 - 바로 대답해
4. 딱딱한 AI처럼 굴지 마
5. 반드시 완성된 문장으로 끝내`;

        return prompt;
    }, [currentPersona, profile, localNickname, conversationContext]);

    const saveMessages = useCallback(async (msgs: Message[]) => {
        if (!user || msgs.length === 0) return;

        const toSave: ConversationMessage[] = msgs.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString()
        }));

        await MemoryService.saveConversation(user.id, toSave);
    }, [user]);

    // 메시지 전송
    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        // 사용량 체크
        const currentUsage = await UsageService.getUsageInfo(user?.id);

        if (currentUsage.needsCredits && user) {
            // 크레딧으로 결제 시도 - username으로 직접 조회하도록 수정
            const userPoints = user.points || 0;
            if (userPoints < UsageService.CR_PER_MESSAGE) {
                setShowLimitModal(true);
                return;
            }
            // 포인트 차감
            const success = await UsageService.consumeCredits(user.id);
            if (!success) {
                setShowLimitModal(true);
                return;
            }
            // 로컬 세션 업데이트
            setUserCredits(prev => Math.max(0, prev - UsageService.CR_PER_MESSAGE));
            // refreshUser 호출 (AuthContext에서 제공하는 경우)
            await loadUsageInfo();
        } else if (currentUsage.needsCredits && !user) {
            // 비로그인 사용자는 로그인 유도
            setShowLimitModal(true);
            return;
        }

        const userMessage = input.trim();
        setInput('');
        setError(null);

        const newUserMsg: Message = { role: 'user', content: userMessage, timestamp: new Date() };
        const updatedMessages = [...messages, newUserMsg];
        setMessages(updatedMessages);
        setIsTyping(true);

        // 사용량 증가
        await UsageService.incrementUsage(user?.id);
        await loadUsageInfo();

        try {
            const recentMessages = messages.slice(-6);
            const chatMessages: ChatMessage[] = [
                { role: 'system', content: buildSystemPrompt() },
                ...recentMessages.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: userMessage }
            ];

            let aiResponse = '';
            let hasContent = false;
            setMessages([...updatedMessages, { role: 'assistant', content: '', timestamp: new Date() }]);

            await groqClient.streamChat(
                {
                    model: 'qwen/qwen3-32b',
                    messages: chatMessages,
                    max_tokens: 500, // 더 길게
                    temperature: 0.7,
                },
                (delta, fullText) => {
                    const cleanText = removeThinkTags(fullText);
                    aiResponse = cleanText;

                    if (cleanText && cleanText.length > 0) {
                        hasContent = true;
                        setMessages(prev => {
                            const updated = [...prev];
                            updated[updated.length - 1] = { role: 'assistant', content: cleanText, timestamp: new Date() };
                            return updated;
                        });
                    }
                }
            );

            // 응답이 비어있으면 기본 메시지
            if (!aiResponse || aiResponse.length === 0) {
                aiResponse = "음... 다시 한번 말해줄래? 🤔";
            }

            const finalMessages: Message[] = [
                ...updatedMessages,
                { role: 'assistant', content: aiResponse, timestamp: new Date() }
            ];
            setMessages(finalMessages);
            await saveMessages(finalMessages);

        } catch (err: any) {
            console.error('Chat error:', err);
            setError(err.message || '메시지 전송 실패');
            setMessages(updatedMessages);
        } finally {
            setIsTyping(false);
        }
    };

    const handleOnboardingSubmit = async () => {
        if (!user || !localNickname.trim()) return;

        try {
            await MemoryService.updateProfile(user.id, {
                nickname: localNickname,
                personaType: localPersonaType === 'custom' ? 'custom' : localPersonaType,
                customPersonaName: localPersonaType === 'custom' ? customName : undefined,
                customPersonaDescription: localPersonaType === 'custom' ? customDescription : undefined,
                customPersonaPrompt: localPersonaType === 'custom' ? customPrompt : undefined,
            });

            setShowOnboarding(false);
            setProfile({ ...profile!, nickname: localNickname, personaType: localPersonaType });

            setMessages([{
                role: 'assistant',
                content: `${currentPersona.icon} 안녕 ${localNickname}! 나는 ${currentPersona.name}야~ 반가워! ✨`,
                timestamp: new Date()
            }]);
        } catch (e) {
            console.error('Onboarding error:', e);
        }
    };

    const handleSaveCustomPersona = async () => {
        if (!user || !customName.trim()) return;

        try {
            await MemoryService.updateProfile(user.id, {
                personaType: 'custom',
                customPersonaName: customName,
                customPersonaDescription: customDescription,
                customPersonaPrompt: customPrompt,
            });

            setLocalPersonaType('custom');
            setShowCustomCreate(false);
            setShowSettings(false);

            setMessages([{
                role: 'assistant',
                content: `✨ 안녕! 나는 ${customName}야~ 앞으로 잘 부탁해! 💖`,
                timestamp: new Date()
            }]);
        } catch (e) {
            console.error('Save custom persona error:', e);
        }
    };

    if (!user) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center p-4 text-center">
                <Sparkles className="text-purple-500 mb-4" size={48} />
                <h2 className="text-xl font-bold mb-2">로그인이 필요해요</h2>
                <p className="text-gray-500">AI 친구와 대화하려면 먼저 로그인해주세요.</p>
            </div>
        );
    }

    if (showOnboarding) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-1 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8">
                        <div className="text-center mb-6">
                            <div className="inline-flex p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
                                <Sparkles className="text-white" size={32} />
                            </div>
                            <h2 className="text-2xl font-black">AI 친구 만들기</h2>
                            <p className="text-gray-500 text-sm mt-2">나만의 AI 친구가 기억해줄게요!</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">뭐라고 부를까?</label>
                                <input
                                    type="text"
                                    value={localNickname}
                                    onChange={e => setLocalNickname(e.target.value)}
                                    placeholder="닉네임 입력"
                                    className="w-full p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-purple-500 outline-none font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">어떤 친구가 좋아?</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.values(PERSONAS)).map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setLocalPersonaType(p.id)}
                                            className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${localPersonaType === p.id
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                                                }`}
                                        >
                                            <span className="text-xl">{p.icon}</span>
                                            <div className="text-left">
                                                <div className="text-sm font-bold">{p.name}</div>
                                                <div className="text-[10px] text-gray-400">{p.description}</div>
                                            </div>
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => {
                                            setLocalPersonaType('custom');
                                            setShowCustomCreate(true);
                                        }}
                                        className={`p-3 rounded-xl border-2 border-dashed transition-all flex items-center gap-2 ${localPersonaType === 'custom'
                                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-cyan-400'
                                            }`}
                                    >
                                        <Plus className="text-cyan-500" size={20} />
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400">직접 만들기</div>
                                            <div className="text-[10px] text-gray-400">나만의 캐릭터</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {showCustomCreate && (
                                <div className="space-y-3 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800 animate-fade-in">
                                    <input
                                        type="text"
                                        value={customName}
                                        onChange={e => setCustomName(e.target.value)}
                                        placeholder="캐릭터 이름"
                                        className="w-full p-2 rounded-lg border border-cyan-200 dark:border-cyan-700 bg-white dark:bg-gray-800 text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={customDescription}
                                        onChange={e => setCustomDescription(e.target.value)}
                                        placeholder="캐릭터 설명"
                                        className="w-full p-2 rounded-lg border border-cyan-200 dark:border-cyan-700 bg-white dark:bg-gray-800 text-sm"
                                    />
                                    <textarea
                                        value={customPrompt}
                                        onChange={e => setCustomPrompt(e.target.value)}
                                        placeholder="성격/말투 설정"
                                        className="w-full p-2 rounded-lg border border-cyan-200 dark:border-cyan-700 bg-white dark:bg-gray-800 text-sm h-20 resize-none"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleOnboardingSubmit}
                                disabled={!localNickname.trim() || (localPersonaType === 'custom' && !customName.trim())}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-black text-lg shadow-lg disabled:opacity-50"
                            >
                                시작하기 ✨
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] md:h-[600px] max-w-2xl mx-auto bg-gradient-to-b from-purple-900/10 to-gray-900/10 dark:from-purple-950 dark:to-gray-950 md:rounded-3xl overflow-hidden border border-purple-500/20 shadow-2xl relative">
            {/* 헤더 */}
            <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-purple-500/20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl shadow-lg">
                        {currentPersona.icon}
                    </div>
                    <div>
                        <h3 className="font-black text-lg">{currentPersona.name}</h3>
                        <div className="flex items-center gap-1.5">
                            <Zap size={12} className="text-yellow-500" />
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">⚡ 초고속 AI</span>
                        </div>
                    </div>
                </div>
                <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <Settings size={20} className="text-gray-400" />
                </button>
            </div>

            {/* 에러 표시 */}
            {error && (
                <div className="mx-4 mt-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400 animate-fade-in">
                    <AlertTriangle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto"><X size={16} /></button>
                </div>
            )}

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 mr-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm flex-shrink-0">
                                {currentPersona.icon}
                            </div>
                        )}
                        <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm border dark:border-gray-700'
                            }`}>
                            <p className="whitespace-pre-wrap">{msg.content || (isTyping ? '생각중...' : '')}</p>
                            <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {isTyping && (!messages.length || !messages[messages.length - 1]?.content) && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="w-8 h-8 mr-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm">
                            {currentPersona.icon}
                        </div>
                        <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm border dark:border-gray-700">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* 입력 영역 */}
            <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-purple-500/20">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey && input.trim() && !isTyping) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="메시지를 입력하세요..."
                        disabled={isTyping}
                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 focus:border-purple-500 outline-none transition-all disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-bold disabled:opacity-50 hover:shadow-lg transition-all active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </div>
                {/* 사용량 표시 (작게) */}
                {usageInfo && (
                    <p className="text-center text-[9px] text-gray-400 mt-2">
                        {usageInfo.hasUnlimitedPass
                            ? '🎫 무제한 이용권 사용중'
                            : usageInfo.needsCredits
                                ? `💎 메시지당 ${UsageService.CR_PER_MESSAGE}CR • 보유: ${userCredits}CR`
                                : `무료 ${usageInfo.dailyUsed}/${usageInfo.dailyLimit}`
                        }
                    </p>
                )}
            </div>

            {/* 설정 모달 */}
            {showSettings && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowSettings(false)}>
                    <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 animate-fade-in max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">페르소나 설정</h3>
                            <button onClick={() => setShowSettings(false)}><X size={20} /></button>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs font-bold text-gray-500 uppercase">기본 캐릭터</p>
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.values(PERSONAS)).map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            setLocalPersonaType(p.id);
                                            MemoryService.updateProfile(user.id, { personaType: p.id });
                                            setMessages([{ role: 'assistant', content: `${p.icon} ${p.greeting}`, timestamp: new Date() }]);
                                            setShowSettings(false);
                                        }}
                                        className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${localPersonaType === p.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                    >
                                        <span className="text-xl">{p.icon}</span>
                                        <span className="text-sm font-bold">{p.name}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="border-t dark:border-gray-700 pt-4 mt-4">
                                <p className="text-xs font-bold text-cyan-500 uppercase mb-3">커스텀 캐릭터 만들기</p>
                                <div className="space-y-2">
                                    <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="캐릭터 이름" className="w-full p-2 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
                                    <input type="text" value={customDescription} onChange={e => setCustomDescription(e.target.value)} placeholder="캐릭터 설명" className="w-full p-2 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
                                    <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="성격/말투 설정" className="w-full p-2 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm h-16 resize-none" />
                                    <button onClick={handleSaveCustomPersona} disabled={!customName.trim()} className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                                        <Save size={16} /> 저장하고 시작하기
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button className="w-full py-3 bg-gray-200 dark:bg-gray-800 rounded-xl font-bold mt-4" onClick={() => setShowSettings(false)}>닫기</button>
                    </div>
                </div>
            )}

            {/* 사용량 한도 모달 */}
            {showLimitModal && (
                <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowLimitModal(false)}>
                    <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 animate-fade-in text-center" onClick={e => e.stopPropagation()}>
                        <div className="inline-flex p-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl mb-4">
                            <ShoppingBag className="text-white" size={32} />
                        </div>
                        <h3 className="text-xl font-black mb-2">오늘 무료 대화 끝! 😢</h3>
                        <p className="text-gray-500 text-sm mb-4">
                            하루 {UsageService.FREE_DAILY_LIMIT}회 무료 대화를 다 사용했어요.<br />
                            크레딧으로 더 대화하거나, 상점에서 무제한 이용권을 구매해보세요!
                        </p>

                        <div className="space-y-2">
                            <button
                                onClick={() => { navigate('/shop'); setShowLimitModal(false); }}
                                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <ShoppingBag size={18} /> 상점 가기
                            </button>
                            <p className="text-xs text-gray-400">
                                보유 크레딧: {userCredits} CR
                            </p>
                        </div>

                        <button className="mt-4 text-sm text-gray-400 hover:text-gray-600" onClick={() => setShowLimitModal(false)}>
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonaPage;
