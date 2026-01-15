import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChatMessage, Conversation } from '../types';
import { storage } from '../services/storage';
import { MessageSquare, Send, X, Hash, ChevronLeft, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { UserNickname, UserAvatar } from './UserEffect';

const LiveChat: React.FC = () => {
    const { user } = useAuth();
    const { isAiHubMode } = useTheme();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [channels, setChannels] = useState<Conversation[]>([]);
    const [currentChannel, setCurrentChannel] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load Channels on Open
    useEffect(() => {
        if (isOpen) {
            const loadChannels = async () => {
                const chs = await storage.getChannels();
                setChannels(chs);
                // Auto join 'Lobby' if no channel selected
                if (!currentChannel && chs.length > 0) {
                    const lobby = chs.find(c => c.id === 'ch-lobby') || chs[0];
                    setCurrentChannel(lobby);
                }
            };
            loadChannels();
        }
    }, [isOpen]);

    // Subscribe to Messages for Current Channel
    useEffect(() => {
        if (!currentChannel || !isOpen) return;

        // Unsubscribe previous if any (handled by useEffect cleanup)
        const unsubscribe = storage.subscribeMessages(currentChannel.id, async (msgs) => {
            // Fetch user data for each sender (async to handle Firestore fallback)
            const chatMsgs: ChatMessage[] = await Promise.all(msgs.map(async m => {
                let sender = storage.getUserByRawId(m.sender_id);
                if (!sender) {
                    // Try fetching from Firestore
                    sender = await storage.fetchUserById(m.sender_id);
                }
                return {
                    id: m.id,
                    user_id: m.sender_id,
                    username: sender ? sender.username : 'Unknown',
                    text: m.content,
                    timestamp: m.created_at,
                    user_level: sender ? sender.level : 1
                };
            }));
            setMessages(chatMsgs);
        });
        return () => unsubscribe();
    }, [currentChannel, isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !user || !currentChannel) return;

        await storage.sendMessage(currentChannel.id, user.id, inputText, 'all');
        setInputText('');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-20 right-4 p-4 rounded-full shadow-2xl transition-all z-[130] hover:scale-110 active:scale-95 ${isAiHubMode ? 'bg-cyan-500 text-black animate-pulse-glow' : 'bg-indigo-600 text-white'}`}
            >
                <MessageSquare size={24} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-20 right-4 w-96 h-[500px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden z-[130] animate-fade-in-up">
            {/* Header */}
            <div className={`p-4 flex items-center justify-between border-b ${isAiHubMode ? 'bg-black border-cyan-900 text-cyan-500' : 'bg-indigo-600 text-white border-indigo-700'}`}>
                <div className="flex items-center gap-2">
                    {currentChannel ? (
                        <>
                            <button onClick={() => setCurrentChannel(null)} className="hover:bg-white/20 p-1 rounded"><ChevronLeft size={18} /></button>
                            <span className="font-bold text-sm truncate max-w-[150px]">{currentChannel.name}</span>
                        </>
                    ) : (
                        <span className="font-bold text-sm">채널 목록</span>
                    )}
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded"><X size={18} /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 relative">
                {!currentChannel ? (
                    <div className="p-2 space-y-2">
                        {/* AI 친구 바로가기 */}
                        <h3 className="px-2 text-xs font-bold text-purple-500 uppercase mt-2">AI Chatbot</h3>
                        <button
                            onClick={() => { setIsOpen(false); navigate('/persona'); }}
                            className="w-full text-left p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-300 dark:border-purple-700 hover:border-purple-500 hover:shadow-md transition-all flex items-center gap-3 group"
                        >
                            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-purple-600 dark:text-purple-400 group-hover:text-purple-700">AI 친구 💖</div>
                                <div className="text-[10px] text-gray-500">유나, 민호, 지원, 조이와 대화하기</div>
                            </div>
                        </button>

                        <h3 className="px-2 text-xs font-bold text-gray-500 uppercase mt-4">Open Channels</h3>
                        {channels.map(ch => (
                            <button
                                key={ch.id}
                                onClick={() => setCurrentChannel(ch)}
                                className="w-full text-left p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-indigo-500 hover:shadow-md transition-all flex items-center gap-3 group"
                            >
                                <div className={`p-2 rounded-lg transition-colors ${isAiHubMode ? 'bg-cyan-900/30 text-cyan-400 group-hover:bg-cyan-900/50' : 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100'}`}>
                                    <Hash size={18} />
                                </div>
                                <div>
                                    <div className="font-bold text-sm dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">{ch.name}</div>
                                    <div className="text-[10px] text-gray-400 truncate max-w-[180px]">{ch.last_message || '대화를 시작하세요!'}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-400 text-xs py-10 opacity-50">메시지가 없습니다.<br />첫 메시지를 남겨보세요!</div>
                        )}
                        {messages.map((msg, idx) => {
                            const isMe = msg.user_id === user?.id;
                            const showHeader = idx === 0 || messages[idx - 1].user_id !== msg.user_id || (new Date(msg.timestamp).getTime() - new Date(messages[idx - 1].timestamp).getTime() > 60000);

                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    {showHeader && (
                                        <div className="flex items-center gap-2 mb-1 mt-1">
                                            {storage.getUserByRawId(msg.user_id) && <UserAvatar profile={storage.getUserByRawId(msg.user_id) as any} size="sm" />}
                                            {storage.getUserByRawId(msg.user_id) ? (
                                                <UserNickname profile={storage.getUserByRawId(msg.user_id) as any} className="text-[11px]" />
                                            ) : (
                                                <span className="text-[11px] font-bold text-gray-500">{msg.username || 'Unknown'}</span>
                                            )}
                                            <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    )}
                                    <div className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] break-words shadow-sm ${isMe
                                        ? (isAiHubMode ? 'bg-cyan-900/50 text-cyan-50 border border-cyan-800' : 'bg-indigo-600 text-white rounded-tr-none')
                                        : 'bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            {currentChannel && (
                <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={user ? "메시지 보내기..." : "로그인이 필요합니다"}
                            disabled={!user}
                            className="flex-1 bg-gray-100 dark:bg-gray-800 text-sm px-4 py-2.5 rounded-full outline-none focus:ring-2 ring-indigo-500/50 dark:text-white transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || !user}
                            className={`p-2.5 rounded-full transition-all ${inputText.trim()
                                ? (isAiHubMode ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-indigo-600 text-white hover:bg-indigo-700')
                                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default LiveChat;
