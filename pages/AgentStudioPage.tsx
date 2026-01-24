
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { Agent } from '../types';
import { useNavigate } from 'react-router-dom';

const AgentStudioPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [price, setPrice] = useState(100);
    const [tags, setTags] = useState('');
    const [isTestMode, setIsTestMode] = useState(false);
    const [testInput, setTestInput] = useState('');
    const [testHistory, setTestHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [myAgents, setMyAgents] = useState<Agent[]>([]);

    useEffect(() => {
        if (!user) {
            alert('로그인이 필요합니다.');
            navigate('/login');
        } else {
            loadMyAgents();
        }
    }, [user, navigate]);

    const loadMyAgents = async () => {
        if (!user) return;
        const agents = await storage.getMyAgents(user.id);
        setMyAgents(agents);
    };

    const handleTestSend = async () => {
        if (!testInput.trim()) return;
        const input = testInput;
        setTestInput('');
        setTestHistory(prev => [...prev, { role: 'user', content: input }]);

        // Mock AI Response
        setTimeout(() => {
            let response = `[SYSTEM PROMPT]: ${systemPrompt}\n\n[USER]: ${input}\n\n[AI]: (Simulation) 네, 알겠습니다. 설정하신 페르소나대로 답변을 생성합니다. 지금은 테스트 모드입니다.`;

            setTestHistory(prev => [...prev, { role: 'assistant', content: response }]);
        }, 1000);
    };

    const handleSave = async () => {
        if (!user) return;
        if (!name || !description || !systemPrompt) {
            alert('필수 정보를 모두 입력해주세요.');
            return;
        }

        setIsSaving(true);
        try {
            const newAgent: Agent = {
                id: '', // Will be set by storage
                creator_id: user.id,
                name,
                description,
                system_prompt: systemPrompt,
                price_per_use: 10, // Default query cost
                rental_price_daily: price,
                total_revenue: 0,
                rating: 0,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                is_public: true, // Auto-publish for now
                model_id: 'gpt-4o-mini',
                created_at: new Date().toISOString()
            };

            await storage.saveAgent(newAgent);
            alert('에이전트가 등록되었습니다! 마켓플레이스에서 확인하세요.');
            loadMyAgents(); // Refresh list
            // Reset form
            setName('');
            setDescription('');
            setSystemPrompt('');
            setTags('');
            // navigate('/marketplace'); // Stay on page to see list
        } catch (e) {
            console.error(e);
            alert('저장 실패');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 flex flex-col lg:flex-row gap-6 h-[calc(100vh-80px)]">
            {/* Editor Column */}
            <div className="flex-1 overflow-y-auto pr-2">
                <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
                    Agent Studio 🧠
                </h1>

                <div className="space-y-6">
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">기본 정보</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 mb-1">에이전트 이름</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-purple-500 outline-none"
                                    placeholder="예: 주식 읽어주는 남자"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 mb-1">한줄 소개</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-purple-500 outline-none"
                                    placeholder="이 에이전트의 특징을 짧게 설명해주세요."
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 mb-1">태그 (쉼표로 구분)</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-purple-500 outline-none"
                                    placeholder="주식, 유머, 코딩"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-6xl">🧬</span>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-4">프롬프트 엔지니어링 (핵심)</h2>
                        <p className="text-sm text-gray-400 mb-2">
                            에이전트에게 부여할 성격, 지식, 말투를 정의합니다. 구체적일수록 좋습니다.
                        </p>
                        <textarea
                            value={systemPrompt}
                            onChange={e => setSystemPrompt(e.target.value)}
                            className="w-full h-64 bg-gray-900 border border-gray-600 rounded p-4 text-white font-mono text-sm leading-relaxed focus:border-purple-500 outline-none resize-none"
                            placeholder={`당신은 20년 경력의 펀드 매니저입니다. 항상 냉소적이지만 정확한 데이터를 근거로 말합니다. 
사용자가 "이거 살까?"라고 물으면 재무제표부터 가져오라고 호통치세요.`}
                        />
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">수익화 설정</h2>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-gray-400 mb-1">일일 대여료 (CR)</label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(Number(e.target.value))}
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div className="flex-1 p-4 bg-gray-900 rounded-lg">
                                <p className="text-sm text-gray-400">예상 수익 (건당)</p>
                                <p className="text-xl font-bold text-green-400">
                                    {Math.floor(price * 0.7)} CR <span className="text-xs text-gray-500">(수수료 30% 제외)</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-xl hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 shadow-lg shadow-purple-900/50"
                    >
                        {isSaving ? '등록 중...' : '에이전트 마켓에 등록하기 🚀'}
                    </button>

                    {/* My Agents List */}
                    {myAgents.length > 0 && (
                        <div className="mt-10 pt-10 border-t border-gray-700">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span>📂 내 에이전트 목록</span>
                                <span className="bg-gray-700 text-xs px-2 py-1 rounded-full text-gray-300">{myAgents.length}</span>
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {myAgents.map(agent => (
                                    <div key={agent.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between group hover:border-purple-500 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                                                🤖
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors">{agent.name}</h3>
                                                <div className="flex gap-2 text-xs text-gray-400 mt-1">
                                                    <span>{agent.is_public ? '🟢 공개' : '🔴 비공개'}</span>
                                                    <span>•</span>
                                                    <span>{agent.rental_price_daily} CR/일</span>
                                                    <span>•</span>
                                                    <span>수익: {agent.total_revenue} CR</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors">
                                            관리
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview/Test Column */}
            <div className="w-full lg:w-96 bg-gray-900 rounded-xl border border-gray-800 flex flex-col shadow-2xl">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800 rounded-t-xl">
                    <h3 className="font-bold">🧪 시뮬레이션</h3>
                    <span className="text-xs px-2 py-1 bg-green-900 text-green-300 rounded-full animate-pulse">Live</span>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[400px]">
                    {testHistory.length === 0 && (
                        <div className="text-center text-gray-500 mt-20">
                            <div className="text-4xl mb-4">💬</div>
                            <p>프롬프트를 입력하고<br />대화를 테스트해보세요.</p>
                        </div>
                    )}
                    {testHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                ? 'bg-purple-600 text-white rounded-tr-none'
                                : 'bg-gray-700 text-gray-200 rounded-tl-none'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-800 bg-gray-800 rounded-b-xl">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={testInput}
                            onChange={e => setTestInput(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleTestSend()}
                            className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-purple-500 outline-none"
                            placeholder="테스트 메시지 입력..."
                        />
                        <button
                            onClick={handleTestSend}
                            className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-500 text-sm font-bold"
                        >
                            전송
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentStudioPage;
