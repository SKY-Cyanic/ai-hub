
import React, { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { User } from '../types';
import { Trophy, Medal, Crown, ChevronRight } from 'lucide-react';
import { UserAvatar, UserNickname } from './UserEffect';
import { Link } from 'react-router-dom';

const LeaderboardWidget: React.FC = () => {
    const [topUsers, setTopUsers] = useState<User[]>([]);

    useEffect(() => {
        const users = storage.getUsers();
        // 게스트 계정, 삭제된 계정 제외 및 중복 제거 (id 기준)
        const uniqueUserMap = new Map<string, User>();
        users.forEach(u => {
            if (!u.is_guest && u.username && !u.username.startsWith('guest_')) {
                if (!uniqueUserMap.has(u.id) || (uniqueUserMap.get(u.id)?.level || 0) < u.level) {
                    uniqueUserMap.set(u.id, u);
                }
            }
        });
        const filtered = Array.from(uniqueUserMap.values());
        const sorted = [...filtered].sort((a, b) => b.level !== a.level ? b.level - a.level : b.points - a.points);
        setTopUsers(sorted.slice(0, 5));
    }, []);

    // 순위별 데코레이션
    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Crown className="text-yellow-400" size={18} fill="currentColor" />;
            case 1: return <Medal className="text-gray-400" size={18} />;
            case 2: return <Medal className="text-orange-400" size={18} />;
            default: return <span className="text-xs font-black text-gray-300 w-[18px] text-center">{index + 1}</span>;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-indigo-600 dark:text-cyan-400 uppercase flex items-center gap-2">
                    <Trophy size={14} /> Hall of Fame
                </h3>
            </div>

            <div className="space-y-4">
                {topUsers.map((u, idx) => (
                    <div key={u.id} className="flex items-center gap-3 group">
                        <div className="flex-shrink-0">
                            {getRankIcon(idx)}
                        </div>
                        <UserAvatar profile={u as any} size="sm" />
                        <div className="flex-1 min-w-0">
                            <UserNickname profile={u as any} className="text-sm font-bold truncate block" />
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-black bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-gray-500 uppercase tracking-tighter">LV. {u.level}</span>
                                <span className="text-[10px] text-gray-400 font-medium truncate">{u.points.toLocaleString()} CR</span>
                            </div>
                        </div>
                        <Link to={`/activity/${u.username}`} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-300 hover:text-indigo-500">
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                ))}
            </div>

            <Link to="/leaderboard" className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50 block text-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-[0.2em]">
                View Full Rankings
            </Link>
        </div>
    );
};

export default LeaderboardWidget;
