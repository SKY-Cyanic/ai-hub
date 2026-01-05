
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { Conversation, PrivateMessage, User } from '../types';
import { useSearchParams } from 'react-router-dom';
import { Send, MessageSquare, ChevronLeft, Plus, Users } from 'lucide-react';
import ConversationList from '../components/Chat/ConversationList';
import { useTheme } from '../context/ThemeContext';

const MessagesPage: React.FC = () => {
    const { user } = useAuth();
    const { isAiHubMode } = useTheme();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<PrivateMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [usersMap, setUsersMap] = useState<{ [id: string]: User }>({});
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [searchParams] = useSearchParams();
    const targetUsername = searchParams.get('target');

    // Load Users Map & Subscribe
    useEffect(() => {
        const loadUsers = () => {
            const users = storage.getUsers();
            const map = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
            setUsersMap(map);
        };
        loadUsers();

        storage.channel.onmessage = (event) => {
            const data = event.data as any;
            if (data && data.type === 'USER_UPDATE') {
                loadUsers();
            }
        };

        return () => { storage.channel.onmessage = null; };
    }, []);

    // Subscribe Conversations
    useEffect(() => {
        if (!user) return;
        const unsub = storage.subscribeConversations(user.id, setConversations);
        return () => unsub();
    }, [user]);

    // Handle direct link
    useEffect(() => {
        const initChat = async () => {
            if (targetUsername && user) {
                const targetUser = storage.getUser(targetUsername);
                if (targetUser) {
                    const convId = await storage.getOrCreateConversation(user.id, targetUser.id);
                    setActiveConvId(convId);
                }
            }
        };
        if (user) initChat();
    }, [targetUsername, user]);

    // Subscribe Messages
    useEffect(() => {
        if (!activeConvId) return;
        const unsub = storage.subscribeMessages(activeConvId, setMessages);
        return () => unsub();
    }, [activeConvId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConvId || !user) return;

        const currentConv = conversations.find(c => c.id === activeConvId);
        if (!currentConv) return;

        let targetId = 'group';
        if (currentConv.type === 'private') {
            targetId = currentConv.participants.find(id => id !== user.id) || 'unknown';
        }

        await storage.sendMessage(activeConvId, user.id, newMessage, targetId);
        setNewMessage('');
    };

    const handleCreateChat = async (targetId: string) => {
        if (!user) return;
        const convId = await storage.getOrCreateConversation(user.id, targetId);
        setActiveConvId(convId);
        setShowNewChatModal(false);
    };

    const handleCreateGroup = async (name: string, pIds: string[]) => {
        if (!user) return;
        const convId = await storage.createGroupChat(user.id, name, pIds);
        setActiveConvId(convId);
        setShowNewChatModal(false);
    };

    if (!user) return <div className="p-10 text-center dark:text-gray-300">로그인이 필요합니다.</div>;

    const currentConv = conversations.find(c => c.id === activeConvId);

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl h-[calc(100vh-120px)] min-h-[600px] flex overflow-hidden backdrop-blur-sm">
            {/* Sidebar List */}
            <div className={`w-full md:w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-900/50 ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
                <ConversationList
                    conversations={conversations}
                    activeId={activeConvId}
                    onSelect={setActiveConvId}
                    onNewChat={() => setShowNewChatModal(true)}
                    usersMap={usersMap}
                />
            </div>

            {/* Chat Area */}
            <div className={`w-full flex-1 flex flex-col relative ${!activeConvId ? 'hidden md:flex' : 'flex'} ${isAiHubMode ? 'bg-black/80' : 'bg-white dark:bg-gray-900'}`}>
                {isAiHubMode && <div className="absolute inset-0 scanner-line opacity-10 pointer-events-none z-0"></div>}

                {!activeConvId ? (
                    <div className="flex-1 flex items-center justify-center flex-col gap-6 text-center p-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center shadow-inner">
                            <MessageSquare size={40} className="text-indigo-500 dark:text-indigo-400 opacity-80" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-black text-2xl text-gray-800 dark:text-gray-200">Welcome to Message Hub</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto text-sm leading-relaxed">
                                선택된 대화가 없습니다.<br />왼쪽 목록에서 대화를 선택하거나 새로운 메시지를 보내보세요.
                            </p>
                        </div>
                        <button onClick={() => setShowNewChatModal(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2">
                            <Plus size={18} /> 새로운 대화 시작
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className={`p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between z-10 backdrop-blur-md sticky top-0 ${isAiHubMode ? 'bg-black/90 border-cyan-900/30' : 'bg-white/80 dark:bg-gray-900/80'}`}>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setActiveConvId(null)} className="md:hidden hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors"><ChevronLeft size={22} /></button>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                                        {currentConv?.type === 'group' ? <Users size={18} /> :
                                            currentConv?.participants.find(p => p !== user.id) ?
                                                (usersMap[currentConv!.participants.find(p => p !== user.id)!]?.avatar_url ? <img src={usersMap[currentConv!.participants.find(p => p !== user.id)!].avatar_url} className="w-full h-full rounded-full object-cover" /> : usersMap[currentConv!.participants.find(p => p !== user.id)!]?.username[0])
                                                : '?'}
                                    </div>
                                    <div>
                                        <div className={`font-bold text-lg leading-tight ${isAiHubMode ? 'text-cyan-400' : 'text-gray-900 dark:text-white'}`}>
                                            {(() => {
                                                if (!currentConv) return '';
                                                if (currentConv.type === 'group') return currentConv.name;
                                                const otherId = currentConv.participants.find(p => p !== user.id);
                                                return usersMap[otherId || '']?.username || 'Unknown';
                                            })()}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                            {currentConv?.type === 'group'
                                                ? `${currentConv.participants.length}명의 멤버`
                                                : '온라인'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender_id === user.id;
                                const showHeader = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id || (new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime() > 60000 * 5); // 5 min gap
                                const sender = usersMap[msg.sender_id];

                                return (
                                    <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
                                        {!isMe && (
                                            <div className="flex-shrink-0 flex flex-col justify-end">
                                                {showHeader ? (
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold overflow-hidden shadow-sm mt-1">
                                                        {sender?.avatar_url ? <img src={sender.avatar_url} className="w-full h-full object-cover" /> : sender?.username[0]}
                                                    </div>
                                                ) : <div className="w-8" />}
                                            </div>
                                        )}

                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                            {showHeader && !isMe && (
                                                <span className="ml-1 mb-1 text-[11px] text-gray-500 dark:text-gray-400 font-bold">{sender?.username || 'Unknown'}</span>
                                            )}
                                            <div className={`px-5 py-3 rounded-[20px] text-[15px] leading-relaxed shadow-sm break-words relative transition-all hover:shadow-md ${isMe
                                                ? (isAiHubMode ? 'bg-cyan-600 text-white rounded-tr-sm' : 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-sm')
                                                : 'bg-white dark:bg-gray-800 dark:text-gray-100 rounded-tl-sm border border-gray-100 dark:border-gray-700'
                                                }`}>
                                                {msg.content}
                                            </div>
                                            <span className={`text-[10px] text-gray-300 dark:text-gray-600 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-3 items-end z-10 sticky bottom-0">
                            <button type="button" className="p-3 text-gray-400 hover:text-indigo-500 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors">
                                <Plus size={20} />
                            </button>
                            <div className={`flex-1 flex items-center gap-2 rounded-2xl px-4 py-3 transition-colors ${isAiHubMode ? 'bg-gray-900 border border-cyan-900/50' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                <input
                                    type="text"
                                    className={`flex-1 bg-transparent border-none text-sm focus:outline-none ${isAiHubMode ? 'text-cyan-400 placeholder-cyan-900' : 'text-gray-900 dark:text-white'}`}
                                    placeholder="메시지를 입력하세요..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className={`p-3 rounded-full transition-all shadow-md transform active:scale-90 ${newMessage.trim()
                                    ? (isAiHubMode ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-indigo-600 text-white hover:bg-indigo-700')
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                                    }`}
                            >
                                <Send size={20} className={newMessage.trim() ? 'ml-0.5' : ''} />
                            </button>
                        </form>
                    </>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChatModal && (
                <NewChatModal
                    users={(Object.values(usersMap) as User[]).filter(u => u.id !== user.id)}
                    onClose={() => setShowNewChatModal(false)}
                    onStartChat={handleCreateChat}
                    onStartGroup={handleCreateGroup}
                />
            )}
        </div>
    );
};

const NewChatModal: React.FC<{ users: User[], onClose: () => void, onStartChat: (id: string) => void, onStartGroup: (name: string, ids: string[]) => void }> = ({ users, onClose, onStartChat, onStartGroup }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [mode, setMode] = useState<'direct' | 'group'>('direct');

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="font-bold dark:text-white">새로운 대화</h3>
                    <button onClick={onClose}><span className="text-2xl text-gray-400">&times;</span></button>
                </div>

                <div className="flex border-b border-gray-100 dark:border-gray-800">
                    <button onClick={() => { setMode('direct'); setSelectedIds([]); }} className={`flex-1 py-3 text-sm font-bold ${mode === 'direct' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>1:1 대화</button>
                    <button onClick={() => { setMode('group'); setSelectedIds([]); }} className={`flex-1 py-3 text-sm font-bold ${mode === 'group' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>그룹 채팅</button>
                </div>

                <div className="p-4 h-64 overflow-y-auto space-y-2">
                    {mode === 'group' && (
                        <input
                            type="text"
                            placeholder="그룹 이름 입력"
                            className="w-full mb-4 p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                        />
                    )}

                    {users.map(u => (
                        <div key={u.id}
                            onClick={() => {
                                if (mode === 'direct') { return onStartChat(u.id); }
                                setSelectedIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                            }}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedIds.includes(u.id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
                                {u.username.substring(0, 2)}
                            </div>
                            <span className="dark:text-gray-200 text-sm font-medium">{u.username}</span>
                            {mode === 'group' && selectedIds.includes(u.id) && <div className="ml-auto w-2 h-2 rounded-full bg-indigo-500"></div>}
                        </div>
                    ))}
                </div>

                {mode === 'group' && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            disabled={!groupName.trim() || selectedIds.length === 0}
                            onClick={() => onStartGroup(groupName, selectedIds)}
                            className="w-full py-3 bg-indigo-600 disabled:bg-gray-300 text-white rounded-xl font-bold transition-all hover:bg-indigo-700"
                        >
                            그룹 생성 ({selectedIds.length})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesPage;
