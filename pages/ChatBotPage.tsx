import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getGroqClient, ChatMessage } from '../services/groqClient';
import { Send, Bot, User, Loader2, Trash2, AlertCircle } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const ChatBotPage: React.FC = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 초기 인사 메시지
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: '안녕하세요! 저는 AI Hub의 일반 챗봇입니다. 🤖\n\n무엇이든 물어보세요. 정보 검색, 글쓰기, 아이디어 브레인스토밍 등 다양한 작업을 도와드릴 수 있습니다.',
                timestamp: new Date()
            }]);
        }
    }, []);



    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const groqClient = getGroqClient();

            // 대화 히스토리 구성 (최근 10개만)
            const history: ChatMessage[] = [
                {
                    role: 'system',
                    content: `당신은 AI Hub의 유능하고 친절한 AI 어시스턴트입니다.
- 한국어로 자연스럽게 대화하세요
- 정확하고 도움이 되는 정보를 제공하세요
- 존댓말을 사용하세요
- 간결하면서도 충분한 정보를 제공하세요`
                },
                ...messages.slice(-9).map(m => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content
                })),
                { role: 'user' as const, content: userMessage.content }
            ];

            let fullResponse = '';

            await groqClient.streamChat(
                {
                    model: 'qwen/qwen3-32b',
                    messages: history,
                    temperature: 0.7,
                    max_tokens: 1024
                },
                (chunk, full) => {
                    fullResponse = full;
                    // 스트리밍 중 UI 업데이트
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMsg = newMessages[newMessages.length - 1];
                        if (lastMsg?.role === 'assistant' && lastMsg.content !== full) {
                            lastMsg.content = full;
                            return [...newMessages];
                        } else if (lastMsg?.role !== 'assistant') {
                            return [...newMessages, {
                                role: 'assistant',
                                content: full,
                                timestamp: new Date()
                            }];
                        }
                        return prev;
                    });
                }
            );

            // 최종 응답 확정
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg?.role === 'assistant') {
                    lastMsg.content = fullResponse;
                }
                return newMessages;
            });

        } catch (err: any) {
            console.error('Chat error:', err);
            setError(err.message || '응답을 생성하는 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        setMessages([{
            role: 'assistant',
            content: '대화가 초기화되었습니다. 새로운 질문을 해주세요! 🤖',
            timestamp: new Date()
        }]);
    };

    return (
        <div className="flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden" style={{ height: '100dvh', maxHeight: '100dvh', width: '100%', maxWidth: '100vw' }}>
            <style>{`
                /* 광고 숨김 */
                .adsbygoogle, ins.adsbygoogle {
                    display: none !important;
                }
                
                /* 모바일 레이아웃 최적화 */
                body {
                    overflow-x: hidden !important;
                    max-width: 100vw !important;
                }
                
                /* 입력 필드 줌 방지 (iOS) */
                input, textarea {
                    font-size: 16px !important;
                    -webkit-text-size-adjust: 100%;
                }
                
                /* 가로 스크롤 완전 제거 */
                * {
                    box-sizing: border-box;
                }
            `}</style>

            {/* 헤더 */}
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white shadow-lg">
                        <Bot size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-base">AI 챗봇</h3>
                        <span className="text-xs text-gray-500">GPT 스타일 어시스턴트</span>
                    </div>
                </div>
                <button
                    onClick={clearChat}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    title="대화 초기화"
                >
                    <Trash2 size={18} className="text-gray-500" />
                </button>
            </div>

            {/* 에러 표시 */}
            {error && (
                <div className="mx-4 mt-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 mr-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm flex-shrink-0">
                                <Bot size={16} />
                            </div>
                        )}
                        <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === 'user'
                            ? 'bg-blue-500 text-white rounded-br-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow-sm'
                            }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                                {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 ml-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                                <User size={16} />
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start">
                        <div className="w-8 h-8 mr-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white">
                            <Bot size={16} />
                        </div>
                        <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                            <Loader2 size={18} className="animate-spin text-blue-500" />
                        </div>
                    </div>
                )}

            </div>

            {/* 입력 영역 */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="메시지를 입력하세요..."
                        className="flex-1 bg-transparent resize-none outline-none dark:text-white max-h-24"
                        style={{ fontSize: '16px' }}
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 transition-opacity"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">
                    Powered by Qwen3-32B • 무료
                </p>
            </div>
        </div>
    );
};

export default ChatBotPage;
