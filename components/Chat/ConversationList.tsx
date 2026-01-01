import React from 'react';
import { Conversation, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Users, User as UserIcon, MessageSquare, Plus } from 'lucide-react';

interface ConversationListProps {
    conversations: Conversation[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onNewChat: () => void;
    usersMap: { [id: string]: User };
}

const ConversationList: React.FC<ConversationListProps> = ({ conversations, activeId, onSelect, onNewChat, usersMap }) => {
    const { user } = useAuth();

    const getConversationName = (conv: Conversation) => {
        if (conv.type === 'group' || conv.type === 'open') return conv.name;
        // For private, find the other participant
        const otherId = conv.participants.find(p => p !== user?.id);
        const otherUser = otherId ? usersMap[otherId] : null;
        return otherUser ? otherUser.username : 'Unknown User';
    };

    const getConversationIcon = (conv: Conversation) => {
        if (conv.type === 'open') return <MessageSquare size={20} />;
        if (conv.type === 'group') return <Users size={20} />;

        const otherId = conv.participants.find(p => p !== user?.id);
        const otherUser = otherId ? usersMap[otherId] : null;

        if (otherUser?.avatar_url) {
            return <img src={otherUser.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />;
        }
        return <UserIcon size={20} />;
    };

    const getUnreadCount = (conv: Conversation) => {
        if (!user) return 0;
        return conv.unread_counts?.[user.id] || 0;
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-850 border-r border-gray-200 dark:border-gray-800 w-full md:w-80">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h2 className="font-bold text-lg dark:text-white">메시지</h2>
                <button onClick={onNewChat} className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition-colors">
                    <Plus size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        대화 내역이 없습니다.<br />
                        새로운 대화를 시작해보세요!
                    </div>
                ) : (
                    <div className="space-y-1 p-2">
                        {conversations.map(conv => {
                            const unread = getUnreadCount(conv);
                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => onSelect(conv.id)}
                                    className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all ${activeId === conv.id
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 overflow-hidden ${activeId === conv.id ? 'bg-white dark:bg-gray-900' : ''}`}>
                                        {getConversationIcon(conv)}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="font-bold text-sm truncate dark:text-gray-200">{getConversationName(conv)}</span>
                                            <span className="text-[10px] text-gray-400 flex-shrink-0">{new Date(conv.last_message_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{conv.last_message}</span>
                                            {unread > 0 && (
                                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                    {unread > 99 ? '99+' : unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConversationList;
