
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { Agent } from '../types';
import { useNavigate } from 'react-router-dom';

const AgentMarketplacePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [filter, setFilter] = useState<'all' | 'best' | 'new'>('all');
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [rentDays, setRentDays] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const unsub = storage.subscribeAgents((data) => {
            setAgents(data);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    const getFilteredAgents = () => {
        let sorted = [...agents];
        if (filter === 'best') sorted.sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
        if (filter === 'new') sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return sorted;
    };

    const handleRent = async () => {
        if (!user) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }
        if (!selectedAgent) return;

        if (!confirm(`${selectedAgent.name} 에이전트를 ${rentDays}일간 대여하시겠습니까? (비용: ${selectedAgent.rental_price_daily * rentDays} CR)`)) return;

        const result = await storage.rentAgent(selectedAgent.id, user.id, rentDays);
        if (result.success) {
            alert(result.message);
            setSelectedAgent(null);
            // Refresh user balance might be needed here, or handled by context
        } else {
            alert(`대여 실패: ${result.message}`);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text mb-2 animate-pulse">
                        Agent Marketplace 🛒
                    </h1>
                    <p className="text-gray-400">
                        검증된 AI 전문가를 고용하여 수익을 극대화하세요.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/studio')}
                        className="px-6 py-3 bg-gray-800 border border-purple-500 text-purple-400 rounded-full hover:bg-purple-900/30 transition-all font-bold"
                    >
                        + 내 에이전트 등록
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                {[
                    { id: 'all', label: '전체 보기', icon: '🔍' },
                    { id: 'best', label: '베스트셀러', icon: '🔥' },
                    { id: 'new', label: '신규 등록', icon: '✨' },
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id as any)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap transition-all border ${filter === f.id
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        {f.icon} {f.label}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="text-center py-20 text-gray-500 animate-pulse">Loading Agents...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getFilteredAgents().map(agent => (
                        <div key={agent.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-blue-500 transition-all group hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                            {/* Card Header (Thumbnail Placeholder) */}
                            <div className="h-32 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                                <span className="text-5xl group-hover:scale-110 transition-transform duration-300">🤖</span>
                                <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded text-xs text-yellow-400 border border-yellow-500/30">
                                    ⭐ {agent.rating || 'N/A'}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-xl text-white truncate pr-2">{agent.name}</h3>
                                    <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded border border-blue-500/30">GPT-4o</span>
                                </div>

                                <p className="text-gray-400 text-sm line-clamp-2 h-10 mb-4">
                                    {agent.description}
                                </p>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {agent.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded-full">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                                    <div>
                                        <span className="text-xs text-gray-500 block">일일 대여</span>
                                        <span className="text-lg font-bold text-white">{agent.rental_price_daily} CR</span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedAgent(agent)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors"
                                    >
                                        대여하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Rent Modal */}
            {selectedAgent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setSelectedAgent(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>

                        <h2 className="text-2xl font-bold mb-1">{selectedAgent.name}</h2>
                        <p className="text-gray-400 text-sm mb-6">제작자 ID: {selectedAgent.creator_id.substring(0, 8)}...</p>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                                <span>대여 기간</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setRentDays(Math.max(1, rentDays - 1))} className="w-8 h-8 bg-gray-700 rounded-full hover:bg-gray-600 text-xl">-</button>
                                    <span className="font-bold w-4 text-center">{rentDays}일</span>
                                    <button onClick={() => setRentDays(rentDays + 1)} className="w-8 h-8 bg-gray-700 rounded-full hover:bg-gray-600 text-xl">+</button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center p-2">
                                <span className="text-gray-400">총 비용</span>
                                <span className="text-2xl font-bold text-yellow-400">
                                    {selectedAgent.rental_price_daily * rentDays} CR
                                </span>
                            </div>

                            {user && user.points < (selectedAgent.rental_price_daily * rentDays) && (
                                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm text-center">
                                    ⚠️ CR이 부족합니다. (현재: {user.points} CR)
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleRent}
                            disabled={user ? user.points < (selectedAgent.rental_price_daily * rentDays) : true}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            결제 및 대여 시작
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentMarketplacePage;
