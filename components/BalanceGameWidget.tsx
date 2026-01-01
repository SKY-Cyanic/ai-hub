import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { BalanceGame } from '../types';
import { useAuth } from '../context/AuthContext';
import { Scale, Loader2 } from 'lucide-react';

const BalanceGameWidget: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [game, setGame] = useState<BalanceGame | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setGame(storage.getBalanceGame());
    }, []);

    const handleVote = async (option: 'a' | 'b') => {
        if (!user) return alert('로그인이 필요합니다.');
        if (!game) return;

        setLoading(true);
        const success = await storage.voteBalance(user.id, option);
        if (success) {
            // Update local state for immediate feedback
            const updatedGame = { ...game };
            if (option === 'a') updatedGame.votes_a++;
            else updatedGame.votes_b++;
            setGame(updatedGame);
            refreshUser(); // To update points/quests
        } else {
            alert('이미 투표하셨거나 오류가 발생했습니다.');
        }
        setLoading(false);
    };

    if (!game) return null;

    const totalVotes = game.votes_a + game.votes_b;
    const percentA = totalVotes === 0 ? 50 : Math.round((game.votes_a / totalVotes) * 100);
    const percentB = 100 - percentA;
    const hasVoted = user?.quests.balance_voted || false;

    return (
        <div className="bg-white dark:bg-gray-850 rounded-sm border border-gray-200 dark:border-gray-800 p-5 shadow-sm mb-4 transition-all hover:shadow-md">
            <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Scale size={14} className="text-pink-500" /> Daily Balance
            </h3>
            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4 text-sm whitespace-pre-line">{game.question}</h4>

            {hasVoted ? (
                <div className="space-y-3 animate-fade-in">
                    <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex text-xs font-bold text-white">
                        <div style={{ width: `${percentA}%` }} className="bg-pink-500 flex items-center justify-start pl-3 transition-all duration-1000 ease-out">{percentA}%</div>
                        <div style={{ width: `${percentB}%` }} className="bg-indigo-500 flex items-center justify-end pr-3 transition-all duration-1000 ease-out">{percentB}%</div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>{game.option_a}</span>
                        <span>{game.option_b}</span>
                    </div>
                    <div className="text-center text-[10px] text-gray-400 mt-2">
                        투표 완료! (+5P 획득)
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => handleVote('a')}
                        disabled={loading}
                        className="py-6 px-2 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800/50 rounded-xl text-pink-600 dark:text-pink-400 text-xs font-bold hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 size={12} className="animate-spin mx-auto" /> : game.option_a}
                    </button>
                    <button
                        onClick={() => handleVote('b')}
                        disabled={loading}
                        className="py-6 px-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 size={12} className="animate-spin mx-auto" /> : game.option_b}
                    </button>
                </div>
            )}
        </div>
    );
};

export default BalanceGameWidget;
