
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

    // Load Users Map
    useEffect(() => {
        const users = storage.getUsers();
        const map = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
        setUsersMap(map);
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

        // For Group/Open, target is 'all', for Private, it's the other user(s) but storage handles this simply by convId usually.
        // But existing sendMessage expects a targetId. 
        // If group, we can pass 'group'. 
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

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm h-[calc(100vh-140px)] min-h-[500px] flex overflow-hidden">
            {/* Sidebar List */}
            <div className={`w-full md:w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
                <ConversationList
                    conversations={conversations}
                    activeId={activeConvId}
                    onSelect={setActiveConvId}
                    onNewChat={() => setShowNewChatModal(true)}
                    usersMap={usersMap}
                />
            </div>

            {/* Chat Area */}
            <div className={`w-full flex-1 flex flex-col bg-gray-50 dark:bg-black/20 ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
                {!activeConvId ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm flex-col gap-4">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <MessageSquare size={32} className="opacity-30" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-lg dark:text-gray-500">메시지함</p>
                            <p className="font-light">대화를 선택하거나 새로운 대화를 시작하세요.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className={`p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between ${isAiHubMode ? 'bg-black text-cyan-500 border-cyan-900' : 'bg-white dark:bg-gray-900 dark:text-white'}`}>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setActiveConvId(null)} className="md:hidden hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full"><ChevronLeft size={20} /></button>
                                <div>
                                    <span className="font-bold text-md block">
                                        {(() => {
                                            const conv = conversations.find(c => c.id === activeConvId);
                                            if (!conv) return '';
                                            if (conv.type === 'group') return conv.name;
                                            const otherId = conv.participants.find(p => p !== user.id);
                                            return usersMap[otherId || '']?.username || 'Unknown';
                                        })()}
                                    </span>
                                    <span className="text-xs opacity-60">
                                        {conversations.find(c => c.id === activeConvId)?.type === 'group'
                                            ? `${conversations.find(c => c.id === activeConvId)?.participants.length}명 참여`
                                            : '1:1 대화'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender_id === user.id;
                                const showHeader = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;
                                const sender = usersMap[msg.sender_id];

                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        {showHeader && !isMe && (
                                            <span className="ml-1 mb-1 text-xs text-gray-500 dark:text-gray-400 font-bold">{sender?.username || 'Unknown'}</span>
                                        )}
                                        <div className={`max-w-[70%] px-5 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${isMe
                                                ? (isAiHubMode ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-indigo-600 text-white rounded-tr-none')
                                                : 'bg-white dark:bg-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700'
                                            }`}>
                                            {msg.content}
                                        </div>
                                        <span className="text-[10px] text-gray-300 dark:text-gray-600 mt-1 px-2">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-3 items-center">
                            <input
                                type="text"
                                className="flex-1 bg-gray-100 dark:bg-gray-800 border-transparent focus:border-indigo-500 rounded-full px-5 py-3 text-sm focus:outline-none dark:text-white transition-all"
                                placeholder="메시지 입력..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className={`p-3 rounded-full transition-all shadow-md ${newMessage.trim()
                                        ? (isAiHubMode ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-indigo-600 text-white hover:bg-indigo-700')
                                        : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                                    }`}
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChatModal && (
                <NewChatModal
                    users={Object.values(usersMap).filter(u => u.id !== user.id)}
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
