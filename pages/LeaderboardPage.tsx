
import React, { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { User } from '../types';
import { Trophy, Medal, Crown } from 'lucide-react';
import { UserAvatar, UserNickname } from '../components/UserEffect';

const LeaderboardPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const allUsers = storage.getUsers();
        // Filter and Sort
        const uniqueUserMap = new Map<string, User>();
        allUsers.forEach(u => {
            if (!u.is_guest && u.username && !u.username.startsWith('guest_')) {
                if (!uniqueUserMap.has(u.id) || (uniqueUserMap.get(u.id)?.level || 0) < u.level) {
                    uniqueUserMap.set(u.id, u);
                }
            }
        });
        const sorted = Array.from(uniqueUserMap.values())
            .sort((a, b) => b.points - a.points); // Sort by points (CR)
        setUsers(sorted);
    }, []);

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Crown className="text-yellow-400" size={24} fill="currentColor" />;
            case 1: return <Medal className="text-gray-400" size={24} />;
            case 2: return <Medal className="text-orange-400" size={24} />;
            default: return <span className="text-lg font-bold text-gray-400 w-[24px] text-center">{index + 1}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-black mb-2 flex items-center justify-center gap-3 text-gray-900 dark:text-white">
                        <Trophy className="text-yellow-500" size={32} />
                        HALL OF FAME
                    </h1>
                    <p className="text-gray-500">
                        명예의 전당 - 최고의 요원들
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rank</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Agent</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Points (CR)</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {users.map((u, idx) => (
                                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center justify-center w-8">
                                                {getRankIcon(idx)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar profile={u as any} size="md" />
                                                <div>
                                                    <UserNickname profile={u as any} className="font-bold text-gray-900 dark:text-gray-100" />
                                                    <p className="text-xs text-gray-400">@{u.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                {u.points.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-bold text-gray-600 dark:text-gray-300">
                                                LV.{u.level}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardPage;
