import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getHFClient, HFTaskType } from '../../services/huggingfaceClient';
import { storage } from '../../services/storage';
import {
    Sparkles, Image as ImageIcon, MessageSquare,
    Volume2, Box, Send, Loader2, Zap, AlertCircle
} from 'lucide-react';

interface AIModel {
    id: string;
    name: string;
    task: HFTaskType;
    description: string;
    icon: React.ReactNode;
    cost: number;
}

const PLAYGROUND_MODELS: AIModel[] = [
    {
        id: 'black-forest-labs/FLUX.1-schnell',
        name: 'FLUX.1 Schnell',
        task: 'text-to-image',
        description: '초고속 고품질 이미지 생성 모델',
        icon: <ImageIcon className="text-purple-400" />,
        cost: 100
    },
    {
        id: 'Qwen/Qwen2.5-72B-Instruct',
        name: 'Qwen 2.5 72B',
        task: 'text-generation',
        description: '강력한 다국어 추론 능력의 대화형 AI',
        icon: <MessageSquare className="text-blue-400" />,
        cost: 50
    },
    {
        id: 'facebook/mms-tts-kor',
        name: 'MMS-TTS KOR',
        task: 'text-to-speech',
        description: '자연스러운 한국어 음성 합성',
        icon: <Volume2 className="text-green-400" />,
        cost: 30
    },
    {
        id: 'facebook/detr-resnet-50',
        name: 'DETR ResNet-50',
        task: 'object-detection',
        description: '이미지 내 사물을 식별하고 분류',
        icon: <Box className="text-orange-400" />,
        cost: 40
    }
];

const AiPlaygroundPage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [selectedModel, setSelectedModel] = useState<AIModel>(PLAYGROUND_MODELS[0]);
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hfClient = getHFClient();

    const handleRun = async () => {
        if (!user) return alert('로그인이 필요합니다.');
        if (!prompt.trim()) return alert('내용을 입력해주세요.');

        if ((user.points || 0) < selectedModel.cost) {
            return alert('CR이 부족합니다.');
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // 1. Deduct Credits
            const deductRes = await storage.deductPoints(user.id, selectedModel.cost, `AI Playground: ${selectedModel.name}`);
            if (!deductRes.success) throw new Error(deductRes.message);

            // 2. Clear Session Cache and Refresh (Optional but safe)
            refreshUser();

            // 3. Request to HF
            const data = await hfClient.request(selectedModel.id, prompt);
            setResult(data);

            // 4. Log usage in storage (Optional logic)
            console.log(`Successfully used ${selectedModel.name}`);

        } catch (err: any) {
            setError(err.message || '요청 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-br from-gray-900 via-indigo-950 to-black p-8 rounded-[32px] border border-indigo-500/20 shadow-2xl">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/20 rounded-2xl">
                            <Sparkles className="text-indigo-400 w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">AI Playground</h1>
                    </div>
                    <p className="text-indigo-200/60 max-w-md">
                        Hugging Face의 최신 오픈소스 AI 모델들을 직접 경험해보세요.
                    </p>
                </div>
                <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 flex flex-col items-end">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Available Balance</span>
                    <span className="text-2xl font-black text-white">{(user?.points || 0).toLocaleString()} <span className="text-indigo-400 text-sm">CR</span></span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Model Selection Sidebar */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-gray-500 uppercase px-2 mb-2">Select AI Model</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {PLAYGROUND_MODELS.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => {
                                    setSelectedModel(model);
                                    setResult(null);
                                    setError(null);
                                }}
                                className={`p-5 rounded-3xl border text-left transition-all relative group overflow-hidden ${selectedModel.id === model.id
                                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]'
                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-900'
                                    }`}
                            >
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className={`p-3 rounded-2xl ${selectedModel.id === model.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                        {model.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{model.name}</h4>
                                        <p className={`text-[11px] mt-1 ${selectedModel.id === model.id ? 'text-indigo-100' : 'text-gray-500'}`}>
                                            {model.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute top-2 right-4 flex items-center gap-1">
                                    <Zap size={10} className={selectedModel.id === model.id ? 'text-yellow-300' : 'text-indigo-400'} />
                                    <span className={`text-[10px] font-black ${selectedModel.id === model.id ? 'text-white' : 'text-gray-400'}`}>
                                        {model.cost} CR
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input & Execution Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-xl space-y-6 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-gray-800 dark:text-gray-200">Execution Console</h3>
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase">
                                {selectedModel.task}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={
                                    selectedModel.task === 'text-to-image'
                                        ? "어떤 이미지를 그려드릴까요? (예: 고양이가 우주복을 입고 달 위에서 춤추는 모습)"
                                        : "메시지를 입력하세요..."
                                }
                                className="w-full h-32 p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none dark:text-white"
                            />

                            <button
                                onClick={handleRun}
                                disabled={loading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95 flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin w-5 h-5" />
                                ) : (
                                    <>
                                        <Zap className="fill-current w-4 h-4" />
                                        RUN MODEL (-{selectedModel.cost} CR)
                                    </>
                                )}
                            </button>
                        </div>

                        {/* ERROR Display */}
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 animate-shake">
                                <AlertCircle className="text-red-500 w-5 h-5 mt-0.5" />
                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                            </div>
                        )}

                        {/* RESULT Display */}
                        {result && (
                            <div className="mt-8 space-y-4 animate-slide-up">
                                <h4 className="text-sm font-black text-gray-400 uppercase">Production Result</h4>
                                <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl p-4 min-h-[200px] flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                                    {selectedModel.task === 'text-to-image' ? (
                                        <img src={result} alt="Generated result" className="rounded-2xl shadow-lg max-h-96 object-contain" />
                                    ) : selectedModel.task === 'text-generation' ? (
                                        <div className="w-full p-4 font-mono text-sm leading-relaxed dark:text-white whitespace-pre-wrap">
                                            {Array.isArray(result) ? result[0].generated_text : JSON.stringify(result, null, 2)}
                                        </div>
                                    ) : selectedModel.task === 'text-to-speech' ? (
                                        <audio controls src={result} className="w-full" />
                                    ) : (
                                        <pre className="text-xs font-mono dark:text-gray-300 overflow-auto max-h-96 w-full">
                                            {JSON.stringify(result, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiPlaygroundPage;
