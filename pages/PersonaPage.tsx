import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PERSONAS, ENHANCED_PERSONAS, PersonaType, buildEnhancedSystemPrompt } from '../constants/personas';
import { Send, Sparkles, Settings, X, AlertTriangle, Zap, Plus, Save, ShoppingBag, RotateCcw, Image, Upload, Heart, Share2, Trash2, Users } from 'lucide-react';
import { MemoryService, UserPersonaProfile, ConversationMessage, CustomPersona } from '../services/memory';
import { getGroqClient, ChatMessage } from '../services/groqClient';
import { UsageService, UsageInfo } from '../services/usageService';
import { IntimacyService, QuestService, StreakService, Intimacy, DailyQuest, ConversationStreak } from '../services/intimacyService';
import { StatsService, RewardService, ConversationStats } from '../services/statsService';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    imageUrl?: string; // 이미지 첨부용
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

    // 이미지 업로드
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 내 커스텀 캐릭터
    const [myPersonas, setMyPersonas] = useState<CustomPersona[]>([]);
    const [showMyPersonas, setShowMyPersonas] = useState(false);
    const [showCommunity, setShowCommunity] = useState(false);
    const [communityPersonas, setCommunityPersonas] = useState<CustomPersona[]>([]);

    // 커스텀 캐릭터 프로필 이미지 (Pollinations.ai)
    const [customProfileImage, setCustomProfileImage] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    // 구독 체크
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    // 사이드바 & 채팅 기록
    const [showSidebar, setShowSidebar] = useState(false);
    const [chatSessions, setChatSessions] = useState<Array<{ id: string, title: string, lastMessage: string, timestamp: Date }>>([]);

    // Phase 3: 게이미피케이션
    const [intimacy, setIntimacy] = useState<Intimacy | null>(null);
    const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
    const [streak, setStreak] = useState<ConversationStreak | null>(null);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState(0);

    // Phase 5: 통계
    const [stats, setStats] = useState<ConversationStats | null>(null);
    const [showStats, setShowStats] = useState(false);

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
            bgGradient: 'from-cyan-500 to-blue-500',
            profileImage: customProfileImage,
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

                // URL 쿼리 파라미터 확인 (바로 모달 표시용)
                const searchParams = new URLSearchParams(location.search);
                const shouldShowUnlock = searchParams.get('showUnlock') === 'true';

                // 구독 상태 확인
                const sub = user.subscriptions?.ai_friend;
                if (sub) {
                    const expiresAt = new Date(sub.expires_at);
                    if (expiresAt > new Date()) {
                        setIsSubscribed(true);
                    } else {
                        setIsSubscribed(false);
                        setShowSubscriptionModal(true);
                    }
                } else {
                    setIsSubscribed(false);
                    // URL 파라미터가 있거나 구독이 없으면 모달 표시
                    if (shouldShowUnlock) {
                        setShowSubscriptionModal(true);
                    } else {
                        setShowSubscriptionModal(true); // 기본적으로 항상 표시
                    }
                }

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

                // Phase 3: 친밀도 & 퀘스트 로드
                if (localPersonaType !== 'custom') {
                    const intimacyData = await IntimacyService.getIntimacy(user.id, localPersonaType);
                    setIntimacy(intimacyData);
                }

                const quests = await QuestService.getTodayQuests(user.id);
                setDailyQuests(quests);

                const streakData = await StreakService.getStreak(user.id);
                setStreak(streakData);

                // 대화 세션 목록 로드
                const sessions = await MemoryService.getConversationList(user.id);
                setChatSessions(sessions.map(s => ({
                    id: s.id || '',
                    title: s.personaName || '대화',
                    lastMessage: s.messages[s.messages.length - 1]?.content.substring(0, 50) || '...',
                    timestamp: new Date(s.updatedAt)
                })));

                // Phase 5: 통계 로드
                if (localPersonaType !== 'custom') {
                    const statsData = await StatsService.getStats(user.id, localPersonaType);
                    setStats(statsData);
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
        // Enhanced Persona를 사용하는 경우
        const enhancedPersona = localPersonaType !== 'custom'
            ? (ENHANCED_PERSONAS as any)[localPersonaType]
            : null;

        if (enhancedPersona) {
            // Phase 2: 정교한 프롬프트 사용
            let prompt = buildEnhancedSystemPrompt(enhancedPersona, localNickname);

            // 추가 컨텍스트 (사용자 관심사, 대화 기억)
            const interests = profile?.interests?.join(',') || '';
            const lastSummary = profile?.lastConversationSummary || '';

            if (interests) {
                prompt += `\n\n추가 정보: 상대방이 ${interests}에 관심이 많아.`;
            }
            if (lastSummary) {
                prompt += `\n이전 대화 요약: ${lastSummary}`;
            }
            if (conversationContext) {
                prompt += `\n최근 대화 내용: ${conversationContext}`;
            }

            return prompt;
        }

        // 커스텀 캐릭터나 기본 페르소나는 기존 방식 유지
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
1. 2~4문장으로 대답하고 반드시 끝에 질문이나 제안을 추가해
2. 자연스럽고 친근하게, 호기심 가득하게 반응해
3. <think> 태그 절대 사용 금지 - 바로 대답해
4. 딱딱한 AI처럼 굴지 마, 진짜 친구처럼 해
5. 반드시 완성된 문장으로 끝내
6. 절대 작별인사 하지마 - "그럼 안녕", "다음에 봐", "나중에 얘기하자" 금지!
7. 대화가 끊기려고 하면 "아 참!", "그런데~", "갑자기 생각났는데" 등으로 새 화제 꺼내
8. 사용자의 말에 공감하고 더 깊이 파고들어
9. 재미있는 질문으로 호기심 자극해
10. 항상 대화를 이어갈 떡밥을 던져`;

        return prompt;
    }, [currentPersona, profile, localNickname, conversationContext, localPersonaType]);


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

            // Phase 3: 경험치 획득 & 퀘스트 업데이트
            if (user && localPersonaType !== 'custom') {
                try {
                    // 경험치 획득
                    const { intimacy: updatedIntimacy, leveledUp, newLevel: lvl } = await IntimacyService.addExp(user.id, localPersonaType, 1);
                    setIntimacy(updatedIntimacy);

                    // 레벨업 시 알림
                    if (leveledUp && lvl) {
                        setNewLevel(lvl);
                        setShowLevelUp(true);
                        setTimeout(() => setShowLevelUp(false), 3000);
                    }

                    // 퀘스트 진행도 업데이트
                    const updatedQuests = await QuestService.updateQuestProgress(user.id, 'chat_count', 1);
                    setDailyQuests(updatedQuests);

                    // 스트릭 체크
                    const { streak: updatedStreak, bonus } = await StreakService.checkTodayChat(user.id);
                    setStreak(updatedStreak);

                    if (bonus && bonus > 0) {
                        // TODO: 스트릭 보너스 지급
                        console.log(`스트릭 보너스: ${bonus} CR`);
                    }
                } catch (gameError) {
                    console.error('Gamification error:', gameError);
                }
            }
        }
    };

    const handleOnboardingSubmit = async () => {
        if (!user || !localNickname.trim()) return;

        try {
            // Firestore는 undefined 값을 허용하지 않으므로 조건부로 객체 구성
            const profileData: any = {
                nickname: localNickname,
                personaType: localPersonaType === 'custom' ? 'custom' : localPersonaType,
            };

            if (localPersonaType === 'custom') {
                profileData.customPersonaName = customName || '';
                profileData.customPersonaDescription = customDescription || '';
                profileData.customPersonaPrompt = customPrompt || '';
            }

            await MemoryService.updateProfile(user.id, profileData);

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
            // 프로필에 현재 캐릭터로 저장
            await MemoryService.updateProfile(user.id, {
                personaType: 'custom',
                customPersonaName: customName,
                customPersonaDescription: customDescription,
                customPersonaPrompt: customPrompt,
            });

            // 캐릭터 라이브러리에도 저장
            await MemoryService.saveCustomPersona(user.id, user.nickname, {
                name: customName,
                description: customDescription,
                prompt: customPrompt,
                icon: '✨'
            });

            // 내 캐릭터 목록 새로고침
            const personas = await MemoryService.getMyPersonas(user.id);
            setMyPersonas(personas);

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

    // 새 대화 시작
    const handleNewConversation = async () => {
        if (!user) return;

        try {
            // 현재 대화가 있으면 저장
            if (messages.length > 1) {
                const conversationMessages: ConversationMessage[] = messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp.toISOString()
                }));
                await MemoryService.saveConversation(user.id, conversationMessages);

                // 세션 목록 다시 로드
                const sessions = await MemoryService.getConversationList(user.id);
                setChatSessions(sessions.map(s => ({
                    id: s.id || '',
                    title: s.personaName || currentPersona.name,
                    lastMessage: s.messages[s.messages.length - 1]?.content.substring(0, 50) || '...',
                    timestamp: new Date(s.updatedAt)
                })));
            }

            // 새 대화 시작
            setMessages([{
                role: 'assistant',
                content: currentPersona.greeting || `새로운 대화를 시작합니다! 뭐 얘기해볼까? 😊`,
                timestamp: new Date()
            }]);
        } catch (e) {
            console.error('New conversation error:', e);
        }
    };

    // 이미지 첨부
    const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('이미지 크기는 5MB 이하만 가능합니다.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setAttachedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    // 클립보드 붙여넣기
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        setAttachedImage(reader.result as string);
                    };
                    reader.readAsDataURL(blob);
                }
                break;
            }
        }
    };

    // 커뮤니티 캐릭터 로드
    const loadCommunityPersonas = async () => {
        const personas = await MemoryService.getSharedPersonas();
        setCommunityPersonas(personas);
        setShowCommunity(true);
    };

    // 캐릭터 사용하기
    const usePersona = async (persona: CustomPersona) => {
        setCustomName(persona.name);
        setCustomDescription(persona.description);
        setCustomPrompt(persona.prompt);
        setLocalPersonaType('custom');
        setShowMyPersonas(false);
        setShowCommunity(false);
        setShowSettings(false);

        setMessages([{
            role: 'assistant',
            content: `${persona.icon || '✨'} 안녕! 나는 ${persona.name}야~ 무슨 얘기 해볼까? 💖`,
            timestamp: new Date()
        }]);
    };

    // 캐릭터 공유하기
    const sharePersona = async (personaId: string) => {
        await MemoryService.sharePersona(personaId);
        const personas = await MemoryService.getMyPersonas(user!.id);
        setMyPersonas(personas);
        alert('캐릭터가 커뮤니티에 공유되었습니다!');
    };

    // 캐릭터 삭제
    const deletePersona = async (personaId: string) => {
        if (!window.confirm('이 캐릭터를 삭제하시겠습니까?')) return;
        await MemoryService.deleteCustomPersona(personaId);
        const personas = await MemoryService.getMyPersonas(user!.id);
        setMyPersonas(personas);
    };

    // Pollinations.ai로 커스텀 캐릭터 이미지 생성
    const generateCharacterImage = async (characterName: string, characterDescription: string) => {
        if (isGeneratingImage) return;
        setIsGeneratingImage(true);

        try {
            // 프롬프트 생성
            const prompt = `Anime-style portrait of a Korean character named ${characterName}, ${characterDescription}, cute kawaii style, digital art, vibrant colors, expressive eyes, detailed, high quality, transparent background`;
            const encodedPrompt = encodeURIComponent(prompt);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=400&height=400&nologo=true`;

            // 이미지 로드 확인
            const img = document.createElement('img');
            img.onload = () => {
                setCustomProfileImage(imageUrl);
                setIsGeneratingImage(false);
            };
            img.onerror = () => {
                alert('이미지 생성에 실패했습니다. 다시 시도해주세요.');
                setIsGeneratingImage(false);
            };
            img.src = imageUrl;
        } catch (e) {
            console.error('Image generation error:', e);
            setIsGeneratingImage(false);
        }
    };

    // 대화 기록 다시 불러오기
    const reloadConversationHistory = async () => {
        if (!user) return;
        try {
            const prevMessages = await MemoryService.loadConversation(user.id);
            if (prevMessages.length > 0) {
                setMessages(prevMessages.map(m => ({
                    role: m.role,
                    content: m.content,
                    timestamp: new Date(m.timestamp),
                    imageUrl: m.imageUrl
                })));
            } else {
                alert('저장된 대화 기록이 없습니다.');
            }
        } catch (e) {
            console.error('Load conversation error:', e);
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
        <div className="flex flex-col w-full mx-auto bg-white dark:bg-gray-950 overflow-hidden relative" style={{ minHeight: 'calc(100dvh - 60px)', maxHeight: 'calc(100dvh - 60px)' }}>
            {/* AdSense 자동 광고 숨김 */}
            <style>{`
                .adsbygoogle {
                    display: none !important;
                }
                ins.adsbygoogle {
                    display: none !important;
                }
                /* 모바일 긴 화면 최적화 (20:9, 19.5:9) */
                @media (max-width: 768px) and (min-aspect-ratio: 9/19) {
                    .chat-container {
                        height: 100dvh !important;
                        max-height: 100dvh !important;
                    }
                }
            `}</style>

            {/* 인스타 DM 스타일 헤더 */}
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {/* 프로필 이미지 또는 아이콘 */}
                    <div className={`w-11 h-11 bg-gradient-to-br ${(currentPersona as any).bgGradient || 'from-purple-500 to-pink-500'} rounded-full flex items-center justify-center text-xl shadow-md ring-2 ring-offset-2 ring-purple-400/50`}>
                        {(currentPersona as any).profileImage ? (
                            <img src={(currentPersona as any).profileImage} alt={currentPersona.name} className="w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : null}
                        <span>{currentPersona.icon}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-base leading-tight flex items-center gap-2">
                            {currentPersona.name}
                            {intimacy && (
                                <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                                    Lv.{intimacy.level}
                                </span>
                            )}
                        </h3>
                        {intimacy ? (
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                        style={{ width: `${(intimacy.exp / intimacy.exp_to_next) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400">{intimacy.exp}/{intimacy.exp_to_next}</span>
                            </div>
                        ) : (
                            <span className="text-xs text-green-500 font-medium">● 온라인</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {/* 사이드바 토글 */}
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        title="대화 기록"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    {/* 새 대화 */}
                    <button onClick={handleNewConversation} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full" title="새 대화">
                        <RotateCcw size={18} className="text-gray-400" />
                    </button>
                    {/* 대화 기록 불러오기 */}
                    <button onClick={reloadConversationHistory} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full" title="대화 기록 불러오기">
                        <Zap size={18} className="text-yellow-500" />
                    </button>
                    {/* 내 캐릭터 */}
                    <button onClick={async () => { const p = await MemoryService.getMyPersonas(user!.id); setMyPersonas(p); setShowMyPersonas(true); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full" title="내 캐릭터">
                        <Save size={18} className="text-gray-400" />
                    </button>
                    {/* 커뮤니티 */}
                    <button onClick={loadCommunityPersonas} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full" title="커뮤니티 캐릭터">
                        <Users size={18} className="text-gray-400" />
                    </button>
                    {/* 설정 */}
                    <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full" title="설정">
                        <Settings size={20} className="text-gray-400" />
                    </button>
                </div>
            </div>

            {/* 에러 표시 */}
            {error && (
                <div className="mx-4 mt-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400 animate-fade-in">
                    <AlertTriangle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto"><X size={16} /></button>
                </div>
            )}

            {/* 메시지 영역 with optional character background */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative" style={{ clipPath: 'inset(0)', isolation: 'isolate' }}>
                {/* 캐릭터 배경 이미지 (고정, 채팅 영역 안에만 표시) */}
                {(currentPersona as any).profileImage && (
                    <div
                        className="fixed inset-0 opacity-30 pointer-events-none"
                        style={{
                            backgroundImage: `url(${(currentPersona as any).profileImage})`,
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            filter: 'brightness(0.6)',
                            zIndex: 0
                        }}
                    />
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in relative z-10`}>
                        {msg.role === 'assistant' && (
                            <div className={`w-8 h-8 mr-2 rounded-full bg-gradient-to-br ${(currentPersona as any).bgGradient || 'from-purple-500 to-pink-500'} flex items-center justify-center text-sm flex-shrink-0 overflow-hidden`}>
                                {(currentPersona as any).profileImage ? (
                                    <img src={(currentPersona as any).profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{currentPersona.icon}</span>
                                )}
                            </div>
                        )}
                        <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm border dark:border-gray-700'
                            }`}>
                            {msg.imageUrl && (
                                <img src={msg.imageUrl} alt="첨부 이미지" className="max-w-full rounded-lg mb-2" />
                            )}
                            <p className="whitespace-pre-wrap">{msg.content || (isTyping ? '생각중...' : '')}</p>
                            <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {isTyping && (!messages.length || !messages[messages.length - 1]?.content) && (
                    <div className="flex justify-start animate-fade-in relative z-10">
                        <div className={`w-8 h-8 mr-2 rounded-full bg-gradient-to-br ${(currentPersona as any).bgGradient || 'from-purple-500 to-pink-500'} flex items-center justify-center text-sm overflow-hidden`}>
                            {(currentPersona as any).profileImage ? (
                                <img src={(currentPersona as any).profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span>{currentPersona.icon}</span>
                            )}
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
            </div>

            {/* 입력 영역 */}
            <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-purple-500/20 sticky bottom-0">
                {/* 이미지 미리보기 */}
                {attachedImage && (
                    <div className="mb-2 relative inline-block">
                        <img src={attachedImage} alt="첨부 이미지" className="h-20 rounded-lg border border-gray-300 dark:border-gray-600" />
                        <button
                            onClick={() => setAttachedImage(null)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        >
                            ×
                        </button>
                    </div>
                )}
                <div className="flex gap-2">
                    {/* 이미지 첨부 버튼 */}
                    <input type="file" ref={fileInputRef} onChange={handleImageAttach} accept="image/*" className="hidden" />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                        title="이미지 첨부 (Ctrl+V로 붙여넣기 가능)"
                    >
                        <Image size={20} className="text-gray-500" />
                    </button>
                    <input
                        type="text"
                        inputMode="text"
                        enterKeyHint="send"
                        autoComplete="off"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onPaste={handlePaste}
                        onKeyDown={e => {
                            // IME 조합 중에는 무시 (한국어 입력 시)
                            if (e.nativeEvent.isComposing) return;
                            if (e.key === 'Enter' && !e.shiftKey && input.trim() && !isTyping) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="메시지를 입력하세요... (Ctrl+V로 이미지 붙여넣기)"
                        disabled={isTyping}
                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 focus:border-purple-500 outline-none transition-all disabled:opacity-50 text-base"
                    />
                    <button
                        onClick={handleSend}
                        disabled={(!input.trim() && !attachedImage) || isTyping}
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
                                        onClick={async () => {
                                            setLocalPersonaType(p.id);
                                            await MemoryService.updateProfile(user.id, { personaType: p.id });

                                            // 친밀도 다시 로드 (캐릭터별 레벨)
                                            const intimacyData = await IntimacyService.getIntimacy(user.id, p.id);
                                            setIntimacy(intimacyData);

                                            setMessages([{ role: 'assistant', content: p.greeting, timestamp: new Date() }]);
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

                                    {/* AI 이미지 생성 - 임시 비활성화
                                    <div className="flex items-center gap-2">
                                        {customProfileImage && (
                                            <img src={customProfileImage} alt="캐릭터 이미지" className="w-16 h-16 rounded-full object-cover border-2 border-cyan-400" />
                                        )}
                                        <button
                                            onClick={() => generateCharacterImage(customName, customDescription)}
                                            disabled={!customName.trim() || isGeneratingImage}
                                            className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isGeneratingImage ? (
                                                <>⏳ 생성중...</>
                                            ) : (
                                                <>🎨 AI 이미지 생성</>
                                            )}
                                        </button>
                                    </div>
                                    */}

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

            {/* 구독 해금 모달 */}
            {showSubscriptionModal && !isSubscribed && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 animate-fade-in text-center" onClick={e => e.stopPropagation()}>
                        <div className="inline-flex p-4 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full mb-4">
                            <Heart className="text-white" size={40} />
                        </div>
                        <h3 className="text-2xl font-black mb-2 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                            AI 친구 해금하기 💝
                        </h3>
                        <p className="text-gray-500 text-sm mb-6">
                            다양한 성격의 AI 친구들과<br />
                            친밀한 대화를 나눠보세요!
                        </p>

                        <div className="space-y-3 mb-6">
                            <button
                                onClick={async () => {
                                    if (!user) return;
                                    const result = await import('../services/storage').then(m => m.storage.purchaseAIFriendSubscription(user.id, '30d'));
                                    if (result.success) {
                                        // 세션에서 업데이트된 사용자 정보 가져오기
                                        const storage = (await import('../services/storage')).storage;
                                        const updatedUser = storage.getSession();

                                        if (updatedUser && updatedUser.subscriptions?.ai_friend) {
                                            // 구독 상태 즉시 업데이트
                                            setIsSubscribed(true);
                                            setShowSubscriptionModal(false);

                                            // 알림 표시
                                            alert(result.message);

                                            // 모달을 닫고 페이지를 부드럽게 새로고침
                                            setTimeout(() => {
                                                window.location.href = window.location.href;
                                            }, 500);
                                        }
                                    } else {
                                        alert(result.message);
                                    }
                                }}
                                className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                            >
                                <span className="text-lg">30일권</span>
                                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">100 CR</span>
                            </button>
                            <button
                                onClick={async () => {
                                    if (!user) return;
                                    const result = await import('../services/storage').then(m => m.storage.purchaseAIFriendSubscription(user.id, '1y'));
                                    if (result.success) {
                                        // 세션에서 업데이트된 사용자 정보 가져오기
                                        const storage = (await import('../services/storage')).storage;
                                        const updatedUser = storage.getSession();

                                        if (updatedUser && updatedUser.subscriptions?.ai_friend) {
                                            // 구독 상태 즉시 업데이트
                                            setIsSubscribed(true);
                                            setShowSubscriptionModal(false);

                                            // 알림 표시
                                            alert(result.message);

                                            // 모달을 닫고 페이지를 부드럽게 새로고침
                                            setTimeout(() => {
                                                window.location.href = window.location.href;
                                            }, 500);
                                        }
                                    } else {
                                        alert(result.message);
                                    }
                                }}
                                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity relative overflow-hidden"
                            >
                                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">BEST</span>
                                <span className="text-lg">1년권</span>
                                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">1000 CR</span>
                            </button>
                        </div>

                        <p className="text-xs text-gray-400 mb-4">
                            보유 크레딧: <span className="font-bold text-purple-500">{userCredits} CR</span>
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate('/chat')}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-sm"
                            >
                                무료 챗봇 이용하기
                            </button>
                            <button
                                onClick={() => navigate('/shop')}
                                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold text-sm"
                            >
                                크레딧 구매
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 내 캐릭터 모달 */}
            {showMyPersonas && (
                <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowMyPersonas(false)}>
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 animate-fade-in max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                            <Save className="text-purple-500" /> 내 캐릭터
                        </h3>
                        {myPersonas.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">저장된 캐릭터가 없습니다.<br />설정에서 커스텀 캐릭터를 만들어보세요!</p>
                        ) : (
                            <div className="space-y-3">
                                {myPersonas.map(p => (
                                    <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{p.icon || '✨'}</span>
                                                <div>
                                                    <h4 className="font-bold">{p.name}</h4>
                                                    <p className="text-xs text-gray-500">{p.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {!p.isShared && (
                                                    <button onClick={() => sharePersona(p.id!)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg" title="공유">
                                                        <Share2 size={16} className="text-blue-500" />
                                                    </button>
                                                )}
                                                <button onClick={() => deletePersona(p.id!)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg" title="삭제">
                                                    <Trash2 size={16} className="text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3">
                                            <button onClick={() => usePersona(p)} className="flex-1 py-2 bg-purple-500 text-white rounded-lg text-sm font-bold">
                                                사용하기
                                            </button>
                                            {p.isShared && <span className="text-xs text-green-500 font-bold">✓ 공유됨</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button className="w-full mt-4 py-3 bg-gray-200 dark:bg-gray-800 rounded-xl font-bold" onClick={() => setShowMyPersonas(false)}>닫기</button>
                    </div>
                </div>
            )}

            {/* 커뮤니티 캐릭터 모달 */}
            {showCommunity && (
                <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCommunity(false)}>
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 animate-fade-in max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                            <Users className="text-cyan-500" /> 커뮤니티 캐릭터
                        </h3>
                        {communityPersonas.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">아직 공유된 캐릭터가 없습니다.<br />첫 번째로 캐릭터를 공유해보세요!</p>
                        ) : (
                            <div className="space-y-3">
                                {communityPersonas.map(p => (
                                    <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-2xl">{p.icon || '✨'}</span>
                                            <div className="flex-1">
                                                <h4 className="font-bold">{p.name}</h4>
                                                <p className="text-xs text-gray-500">{p.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                                            <span>by {p.creatorName}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1"><Heart size={12} className="text-red-400" /> {p.likes}</span>
                                                <span className="flex items-center gap-1"><Upload size={12} /> {p.downloads}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => { await MemoryService.likePersona(p.id!, user!.id); loadCommunityPersonas(); }}
                                                className="flex-1 py-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                                            >
                                                <Heart size={14} /> 좋아요
                                            </button>
                                            <button
                                                onClick={async () => { await MemoryService.downloadPersona(p.id!); usePersona(p); }}
                                                className="flex-1 py-2 bg-cyan-500 text-white rounded-lg text-sm font-bold"
                                            >
                                                사용하기
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button className="w-full mt-4 py-3 bg-gray-200 dark:bg-gray-800 rounded-xl font-bold" onClick={() => setShowCommunity(false)}>닫기</button>
                    </div>
                </div>
            )}

            {/* 사이드바 - 대화 기록 */}
            {showSidebar && (
                <div className="absolute inset-0 z-40 flex">
                    {/* 사이드바 패널 */}
                    <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                            <h2 className="font-bold text-lg">대화 기록</h2>
                            <button onClick={() => setShowSidebar(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {chatSessions.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">
                                    <p className="text-sm">아직 대화 기록이 없습니다</p>
                                    <p className="text-xs mt-2">새로운 대화를 시작해보세요!</p>
                                </div>
                            ) : (
                                chatSessions.map((session) => (
                                    <button
                                        key={session.id}
                                        onClick={() => {
                                            // TODO: 세션 로드 로직
                                            setShowSidebar(false);
                                        }}
                                        className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                                    >
                                        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                                            {session.title}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                            {session.lastMessage}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {session.timestamp.toLocaleDateString('ko-KR')}
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                            <button
                                onClick={() => {
                                    handleNewConversation();
                                    setShowSidebar(false);
                                }}
                                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
                            >
                                + 새 대화 시작
                            </button>
                        </div>
                    </div>

                    {/* 오버레이 (클릭 시 닫기) */}
                    <div className="flex-1 bg-black/30" onClick={() => setShowSidebar(false)} />
                </div>
            )}
        </div>
    );
};

export default PersonaPage;
