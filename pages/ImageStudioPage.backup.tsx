import React, { useState, useEffect } from 'react';
import { ChevronDown, Download, Copy, Image, Wand2, RefreshCw } from 'lucide-react';

// 생성 설정 타입
interface GenSettings {
    width: number;
    height: number;
    model: string;
    count: number;
}

// 선택된 옵션 타입
interface SelectedOption {
    label: string;
    value: string;
}

// 히스토리 아이템 타입
interface HistoryItem {
    prompt: string;
    url: string;
    isEdit?: boolean;
    time: number;
}

// 랜덤 프롬프트
const randomPrompts = [
    "A magical forest with glowing mushrooms and fireflies at night",
    "Futuristic city with flying cars and neon lights, cyberpunk style",
    "A cute dragon sleeping on a pile of gold coins",
    "Astronaut playing guitar on the moon with Earth in background",
    "Underwater castle with mermaids and colorful fish",
    "Steampunk robot having tea in a Victorian garden",
    "Phoenix rising from flames in a dramatic sunset sky",
    "Cozy cabin in snowy mountains during aurora borealis",
    "Giant tree house city in an enchanted forest",
    "Samurai cat in traditional Japanese garden with cherry blossoms"
];

// 아코디언 컴포넌트
const Accordion: React.FC<{
    icon: string;
    title: string;
    selectedLabel?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}> = ({ icon, title, selectedLabel, defaultOpen = false, children }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-lg">{icon}</span>
                    <span className="font-medium text-gray-800 dark:text-white">{title}</span>
                    {selectedLabel && (
                        <span className="text-xs text-indigo-500 dark:text-indigo-400">{selectedLabel}</span>
                    )}
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
                <div className="px-4 pb-4">{children}</div>
            </div>
        </div>
    );
};

// 옵션 칩 컴포넌트
const OptionChip: React.FC<{
    label: string;
    selected?: boolean;
    onClick: () => void;
}> = ({ label, selected, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selected
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
    >
        {label}
    </button>
);

const ImageStudioPage: React.FC = () => {
    // 상태
    const [mode, setMode] = useState<'generate' | 'edit'>('generate');
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [selectedOptions, setSelectedOptions] = useState<Record<string, SelectedOption>>({});
    const [genSettings, setGenSettings] = useState<GenSettings>({ width: 1024, height: 1024, model: 'flux', count: 1 });
    const [seed, setSeed] = useState('');
    const [enhanceEnabled, setEnhanceEnabled] = useState(false);
    const [nsfwEnabled, setNsfwEnabled] = useState(false);

    // 결과 상태
    const [isLoading, setIsLoading] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // 편집 모드 상태
    const [editSourceUrl, setEditSourceUrl] = useState('');
    const [editPrompt, setEditPrompt] = useState('');
    const [originalDesc, setOriginalDesc] = useState('');
    const [editResultBefore, setEditResultBefore] = useState<string | null>(null);
    const [editResultAfter, setEditResultAfter] = useState<string | null>(null);

    // 히스토리 로드
    useEffect(() => {
        const saved = localStorage.getItem('aiHistory');
        if (saved) setHistory(JSON.parse(saved));
    }, []);

    // 옵션 데이터
    const optionCategories = {
        subject: {
            icon: '🎯', title: '주제',
            options: [
                { label: '🏞️ 풍경', value: 'beautiful landscape scenery' },
                { label: '👤 인물', value: 'portrait of a person' },
                { label: '🐾 동물', value: 'cute animal' },
                { label: '🍕 음식', value: 'delicious food photography' },
                { label: '🏛️ 건축물', value: 'architectural building' },
                { label: '🌌 우주', value: 'space cosmos galaxy nebula' },
                { label: '🌿 자연', value: 'nature flowers plants forest' },
                { label: '🐉 판타지', value: 'fantasy magical mythical creature' },
                { label: '🤖 로봇', value: 'robot mechanical android' },
                { label: '🚗 차량', value: 'car vehicle automobile' },
            ]
        },
        style: {
            icon: '🎨', title: '아트 스타일',
            options: [
                { label: '📷 사실적', value: 'photorealistic, 8k, ultra detailed, sharp focus' },
                { label: '🎌 애니메이션', value: 'anime style, japanese animation, vibrant' },
                { label: '🖼️ 유화', value: 'oil painting, classical art, brush strokes' },
                { label: '💧 수채화', value: 'watercolor painting, soft colors, artistic' },
                { label: '🎮 3D 렌더', value: '3D render, octane render, unreal engine 5' },
                { label: '👾 픽셀아트', value: 'pixel art, 16-bit retro game style' },
                { label: '⬜ 미니멀', value: 'minimalist, clean, simple, modern design' },
                { label: '🌃 사이버펑크', value: 'cyberpunk, neon lights, futuristic city' },
                { label: '🏯 지브리', value: 'studio ghibli style, miyazaki, whimsical' },
                { label: '🌻 반 고흐', value: 'van gogh style, impressionist, starry night' },
            ]
        },
        mood: {
            icon: '✨', title: '분위기',
            options: [
                { label: '☀️ 밝은', value: 'bright, cheerful, happy, sunny' },
                { label: '🌙 어두운', value: 'dark, moody, mysterious, dramatic' },
                { label: '🔥 따뜻한', value: 'warm colors, cozy, golden hour' },
                { label: '❄️ 차가운', value: 'cool colors, cold, winter, blue tones' },
                { label: '💭 몽환적', value: 'dreamy, ethereal, soft focus, magical' },
                { label: '💕 로맨틱', value: 'romantic, lovely, pink tones, soft' },
                { label: '👻 공포', value: 'horror, scary, creepy, dark atmosphere' },
                { label: '🕊️ 평화로운', value: 'peaceful, calm, serene, tranquil' },
                { label: '⚡ 역동적', value: 'dynamic, action, energetic, powerful' },
                { label: '🎬 시네마틱', value: 'cinematic, movie scene, dramatic lighting' },
            ]
        },
        env: {
            icon: '🌍', title: '배경 / 환경',
            options: [
                { label: '🏖️ 해변', value: 'on a beach, ocean waves, tropical' },
                { label: '🌲 숲', value: 'in a forest, trees, nature' },
                { label: '🏙️ 도시', value: 'in a city, urban, skyscrapers' },
                { label: '🚀 우주', value: 'in space, stars, galaxy, planets' },
                { label: '🏔️ 산', value: 'in mountains, peaks, alpine' },
                { label: '🏜️ 사막', value: 'in desert, sand dunes, arid' },
                { label: '🐠 수중', value: 'underwater, ocean floor, fish' },
                { label: '🏠 실내', value: 'indoor, interior design, room' },
                { label: '🌸 정원', value: 'in a garden, flowers, botanical' },
                { label: '🏰 성', value: 'in a castle, medieval, fantasy' },
            ]
        },
        time: {
            icon: '🕐', title: '시간 / 조명',
            options: [
                { label: '🌞 낮', value: 'daytime, bright sunlight, clear sky' },
                { label: '🌜 밤', value: 'nighttime, stars, moonlight' },
                { label: '🌅 일출', value: 'sunrise, dawn, early morning light' },
                { label: '🌇 일몰', value: 'sunset, golden hour, dusk' },
                { label: '☁️ 흐림', value: 'cloudy, overcast, soft light' },
                { label: '🌧️ 비', value: 'rainy, rain drops, wet' },
                { label: '❄️ 눈', value: 'snowy, winter, snowflakes' },
                { label: '🌫️ 안개', value: 'foggy, misty, atmospheric' },
                { label: '💡 네온', value: 'neon lighting, colorful lights' },
                { label: '🌌 오로라', value: 'aurora borealis, northern lights' },
            ]
        },
        camera: {
            icon: '📐', title: '구도 / 카메라',
            options: [
                { label: '🔍 클로즈업', value: 'close-up shot, detailed' },
                { label: '🖼️ 와이드', value: 'wide shot, panoramic view' },
                { label: '🦅 조감도', value: 'aerial view, birds eye view' },
                { label: '⬆️ 로우앵글', value: 'low angle, looking up' },
                { label: '🔬 매크로', value: 'macro photography, extreme detail' },
                { label: '💫 보케', value: 'bokeh effect, blurred background' },
                { label: '⚖️ 대칭', value: 'symmetrical composition, centered' },
                { label: '📷 피사계심도', value: 'shallow depth of field' },
                { label: '🧍 전신', value: 'full body shot, standing' },
                { label: '👤 상반신', value: 'upper body, portrait' },
            ]
        },
        quality: {
            icon: '💎', title: '품질',
            options: [
                { label: '⭐ 고품질', value: 'masterpiece, best quality, highly detailed' },
                { label: '🖥️ 8K', value: '8k resolution, ultra HD, sharp' },
                { label: '🎨 아트스테이션', value: 'trending on artstation, professional' },
                { label: '🏆 수상작', value: 'award winning, featured' },
                { label: '🌈 HDR', value: 'HDR, high dynamic range, vivid' },
                { label: '🔎 초정밀', value: 'intricate details, fine details' },
            ]
        }
    };

    // 편집 옵션
    const editOptions = {
        styleTransform: {
            icon: '🎭', title: '스타일 변환',
            options: [
                { label: '🎌 애니메이션', value: 'transform to anime style, japanese animation, vibrant colors' },
                { label: '🖼️ 유화', value: 'transform to oil painting style, classical art, visible brush strokes' },
                { label: '💧 수채화', value: 'transform to watercolor painting, soft artistic style' },
                { label: '👾 픽셀아트', value: 'transform to pixel art, 16-bit retro game style' },
                { label: '🎮 3D 렌더', value: 'transform to 3D render, CGI, octane render quality' },
                { label: '✏️ 스케치', value: 'transform to pencil sketch, hand drawn, detailed lines' },
                { label: '🏯 지브리', value: 'transform to studio ghibli style, miyazaki anime' },
                { label: '🌃 사이버펑크', value: 'transform to cyberpunk style, neon lights, futuristic' },
            ]
        },
        background: {
            icon: '🌄', title: '배경 변경',
            options: [
                { label: '🏖️ 해변', value: 'change background to beautiful beach, ocean, tropical paradise' },
                { label: '🌲 숲', value: 'change background to magical forest, enchanted woods' },
                { label: '🌌 우주', value: 'change background to outer space, stars, galaxy, nebula' },
                { label: '🏙️ 미래도시', value: 'change background to futuristic city, cyberpunk, neon' },
                { label: '🏔️ 설산', value: 'change background to snowy mountains, winter wonderland' },
                { label: '🌸 벚꽃', value: 'change background to cherry blossom garden, sakura, spring' },
                { label: '🏰 성', value: 'change background to medieval castle, fantasy kingdom' },
                { label: '🌇 석양', value: 'change background to sunset sky, golden hour, clouds' },
            ]
        },
        moodLighting: {
            icon: '💡', title: '분위기 / 조명',
            options: [
                { label: '☀️ 밝게', value: 'make it brighter, sunny, cheerful atmosphere' },
                { label: '🌙 어둡게', value: 'make it darker, moody, dramatic atmosphere' },
                { label: '🌅 골든아워', value: 'add golden hour lighting, warm sunset colors' },
                { label: '❄️ 차갑게', value: 'add cool blue tones, cold winter atmosphere' },
                { label: '💭 몽환적', value: 'make it dreamy, ethereal, soft magical glow' },
                { label: '📷 빈티지', value: 'add vintage filter, retro sepia tones, nostalgic' },
                { label: '🎬 시네마틱', value: 'add cinematic lighting, dramatic movie scene' },
                { label: '💜 네온', value: 'add neon glow effects, vibrant colors' },
            ]
        },
        addElements: {
            icon: '➕', title: '요소 추가',
            options: [
                { label: '🌧️ 비', value: 'add falling rain, raindrops, wet reflections' },
                { label: '❄️ 눈', value: 'add falling snow, snowflakes, winter' },
                { label: '🦋 나비', value: 'add flying butterflies around' },
                { label: '🌸 꽃잎', value: 'add falling cherry blossom petals, sakura' },
                { label: '🌈 무지개', value: 'add rainbow in the sky' },
                { label: '✨ 별빛', value: 'add stars and sparkles, glittering effects' },
                { label: '💫 마법 오라', value: 'add magical aura, glowing energy around' },
                { label: '🌌 오로라', value: 'add aurora borealis, northern lights' },
            ]
        }
    };

    // 옵션 선택
    const selectOption = (category: string, label: string, value: string) => {
        setSelectedOptions(prev => ({ ...prev, [category]: { label, value } }));
        updatePromptFromOptions({ ...selectedOptions, [category]: { label, value } });
    };

    // 옵션에서 프롬프트 업데이트
    const updatePromptFromOptions = (options: Record<string, SelectedOption>) => {
        const parts = Object.values(options).map(o => o.value);
        setPrompt(parts.join(', '));
    };

    // 네거티브 프롬프트 추가
    const addNegative = (text: string) => {
        setNegativePrompt(prev => prev ? `${prev}, ${text}` : text);
    };

    // 랜덤 프롬프트
    const getRandomPrompt = () => {
        setPrompt(randomPrompts[Math.floor(Math.random() * randomPrompts.length)]);
    };

    // 프롬프트 향상
    const enhancePromptText = () => {
        if (!prompt) return;
        if (!prompt.includes('masterpiece')) {
            setPrompt(prev => prev + ', masterpiece, best quality, highly detailed, 8k resolution, professional');
        }
    };

    // 번역 (MyMemory API)
    const translatePrompt = async () => {
        if (!prompt) return;
        const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(prompt);
        if (!hasKorean) {
            alert('이미 영어입니다!');
            return;
        }
        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(prompt)}&langpair=ko|en`);
            const data = await response.json();
            if (data.responseData) {
                setPrompt(data.responseData.translatedText);
            }
        } catch {
            alert('번역에 실패했습니다. 영어로 직접 입력해주세요.');
        }
    };

    // 이미지 로드 헬퍼 (Pollinations.ai - Referer 헤더 없이 요청)
    const loadImage = (url: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            // referrerPolicy 설정으로 Referer 헤더 전송 방지 (localhost에서 "WE HAVE MOVED" 오류 해결)
            img.referrerPolicy = 'no-referrer';
            const timeout = setTimeout(() => reject(new Error('Timeout')), 60000);
            img.onload = () => { clearTimeout(timeout); resolve(); };
            img.onerror = () => { clearTimeout(timeout); reject(new Error('Load failed')); };
            img.src = url;
        });
    };

    // 이미지 생성 (Pollinations.ai API)
    const generateImage = async () => {
        if (!prompt) {
            alert('프롬프트를 입력하거나 옵션을 선택하세요');
            return;
        }
        setIsLoading(true);
        setResultUrl(null);

        try {
            const currentSeed = seed || Math.floor(Math.random() * 1000000).toString();
            let fullPrompt = prompt;
            if (negativePrompt) {
                fullPrompt += `, avoid: ${negativePrompt}`;
            }

            // 개발 환경에서는 Vite 프록시 사용 (Origin 헤더 문제 해결)
            const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const baseUrl = isDev ? '/api/pollinations' : 'https://image.pollinations.ai';

            let url = `${baseUrl}/prompt/${encodeURIComponent(fullPrompt)}`;
            url += `?width=${genSettings.width}&height=${genSettings.height}`;
            url += `&seed=${currentSeed}&nologo=true`;
            url += `&model=${genSettings.model}`;
            if (enhanceEnabled) url += '&enhance=true';
            if (nsfwEnabled) url += '&nofeed=true';

            await loadImage(url);
            setResultUrl(url);

            // 히스토리에 추가
            const newHistory = [{ prompt, url, time: Date.now() }, ...history.slice(0, 19)];
            setHistory(newHistory);
            localStorage.setItem('aiHistory', JSON.stringify(newHistory));
        } catch {
            alert('생성 실패. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    // 편집 적용
    const applyEdit = async () => {
        if (!editPrompt) {
            alert('편집 지시를 입력하세요');
            return;
        }
        setIsLoading(true);

        try {
            let finalPrompt = originalDesc ? `${originalDesc}, ${editPrompt}, highly detailed, best quality` : `${editPrompt}, highly detailed, best quality`;
            const currentSeed = Math.floor(Math.random() * 1000000);

            // 개발 환경에서는 Vite 프록시 사용 (Origin 헤더 문제 해결)
            const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const baseUrl = isDev ? '/api/pollinations' : 'https://image.pollinations.ai';

            let url = `${baseUrl}/prompt/${encodeURIComponent(finalPrompt)}`;
            url += `?width=${genSettings.width}&height=${genSettings.height}`;
            url += `&seed=${currentSeed}&nologo=true&model=${genSettings.model}`;
            if (nsfwEnabled) url += '&nofeed=true';

            await loadImage(url);
            setEditResultBefore(editSourceUrl || null);
            setEditResultAfter(url);

            const newHistory = [{ prompt: finalPrompt, url, isEdit: true, time: Date.now() }, ...history.slice(0, 19)];
            setHistory(newHistory);
            localStorage.setItem('aiHistory', JSON.stringify(newHistory));
        } catch {
            alert('편집 실패. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    // 다운로드
    const downloadImage = (url: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-image-${Date.now()}.png`;
        link.target = '_blank';
        link.click();
    };

    // 프롬프트 복사
    const copyPrompt = () => {
        navigator.clipboard.writeText(prompt);
        alert('프롬프트가 복사되었습니다!');
    };

    // 편집모드로 전송
    const sendToEdit = () => {
        if (resultUrl) {
            setEditSourceUrl(resultUrl);
            setOriginalDesc(prompt);
            setMode('edit');
        }
    };

    // 모든 옵션 지우기
    const clearAllOptions = () => {
        setSelectedOptions({});
        setPrompt('');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 헤더 배너 */}
            <div className="p-6 bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 dark:from-gray-900 dark:via-purple-950 dark:to-pink-950 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🎨</div>
                    <div>
                        <h1 className="text-2xl font-black text-white">AI 이미지 스튜디오</h1>
                        <p className="text-pink-100 text-sm">Powered by Pollinations.ai</p>
                    </div>
                </div>
            </div>

            {/* 모드 스위치 */}
            <div className="flex justify-center">
                <div className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg inline-flex border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setMode('generate')}
                        className={`px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-all ${mode === 'generate' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <Wand2 size={14} /> 생성
                    </button>
                    <button
                        onClick={() => setMode('edit')}
                        className={`px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-all ${mode === 'edit' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <Image size={14} /> 편집
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* 왼쪽 패널 - 컨트롤 */}
                <div className="space-y-4 lg:max-h-[calc(100vh-250px)] lg:overflow-y-auto pr-2">
                    {mode === 'generate' ? (
                        <>
                            {/* 프롬프트 입력 */}
                            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-[1px] rounded-2xl">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
                                    <div className="flex gap-3">
                                        <div className="flex-1 space-y-2">
                                            <textarea
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-800 dark:text-white placeholder-gray-400 resize-none text-sm focus:border-purple-500 outline-none"
                                                placeholder="원하는 이미지를 설명하세요... (예: 우주를 배경으로 한 고양이)"
                                                rows={2}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateImage(); } }}
                                            />
                                            <div className="flex gap-2 flex-wrap">
                                                <button onClick={translatePrompt} className="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400 rounded-lg transition">🌐 영어로 번역</button>
                                                <button onClick={enhancePromptText} className="text-xs px-3 py-1.5 bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-600 dark:text-purple-400 rounded-lg transition">✨ 프롬프트 향상</button>
                                                <button onClick={getRandomPrompt} className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-800 text-green-600 dark:text-green-400 rounded-lg transition">🎲 랜덤</button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={generateImage}
                                            disabled={isLoading}
                                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 px-6 rounded-xl font-semibold text-sm text-white whitespace-nowrap self-start transition-all"
                                        >
                                            생성하기
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 네거티브 프롬프트 */}
                            <Accordion icon="🚫" title="네거티브 프롬프트" selectedLabel={negativePrompt ? '설정됨' : ''}>
                                <textarea
                                    value={negativePrompt}
                                    onChange={(e) => setNegativePrompt(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm placeholder-gray-400 resize-none dark:text-white"
                                    placeholder="제외할 요소... (예: blurry, low quality, watermark)"
                                    rows={2}
                                />
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {['blurry, blur', 'low quality, bad quality', 'watermark, signature, text', 'ugly, deformed, distorted'].map(text => (
                                        <button key={text} onClick={() => addNegative(text)} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded transition">
                                            {text.split(',')[0]}
                                        </button>
                                    ))}
                                </div>
                            </Accordion>

                            {/* 생성 설정 */}
                            <Accordion icon="⚙️" title="생성 설정" defaultOpen>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">이미지 크기</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { w: 1024, h: 1024, label: '1:1 (1024×1024)' },
                                                { w: 1024, h: 1536, label: '2:3 세로' },
                                                { w: 1536, h: 1024, label: '3:2 가로' },
                                                { w: 1920, h: 1080, label: '16:9 와이드' },
                                            ].map(size => (
                                                <button
                                                    key={size.label}
                                                    onClick={() => setGenSettings(s => ({ ...s, width: size.w, height: size.h }))}
                                                    className={`px-3 py-1.5 rounded-lg text-xs transition ${genSettings.width === size.w && genSettings.height === size.h
                                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                        }`}
                                                >
                                                    {size.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">AI 모델</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { id: 'flux', label: '🎨 Flux', desc: '고품질 범용 모델' },
                                                { id: 'flux-realism', label: '📷 Flux Realism', desc: '사실적인 이미지' },
                                            ].map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => setGenSettings(s => ({ ...s, model: m.id }))}
                                                    className={`px-4 py-2.5 rounded-xl text-sm transition flex flex-col items-start ${genSettings.model === m.id
                                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                        }`}
                                                >
                                                    <span className="font-medium">{m.label}</span>
                                                    <span className={`text-xs ${genSettings.model === m.id ? 'text-white/80' : 'text-gray-400'}`}>{m.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs text-gray-500 dark:text-gray-400">시드 값</label>
                                        <input
                                            type="number"
                                            value={seed}
                                            onChange={(e) => setSeed(e.target.value)}
                                            className="w-32 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs dark:text-white"
                                            placeholder="랜덤"
                                        />
                                        <button onClick={() => setSeed(Math.floor(Math.random() * 1000000).toString())} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition">🎲</button>
                                        <button onClick={() => setSeed('')} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition">✕</button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">프롬프트 자동 향상</label>
                                            <p className="text-xs text-gray-400">AI가 프롬프트를 개선합니다</p>
                                        </div>
                                        <button onClick={() => setEnhanceEnabled(!enhanceEnabled)} className={`w-11 h-6 rounded-full transition-colors ${enhanceEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${enhanceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </Accordion>

                            {/* 옵션 카테고리들 */}
                            {Object.entries(optionCategories).map(([key, cat]) => (
                                <Accordion key={key} icon={cat.icon} title={cat.title} selectedLabel={selectedOptions[key]?.label?.replace(/^[^\s]+\s/, '')}>
                                    <div className="flex flex-wrap gap-2">
                                        {cat.options.map(opt => (
                                            <OptionChip
                                                key={opt.label}
                                                label={opt.label}
                                                selected={selectedOptions[key]?.value === opt.value}
                                                onClick={() => selectOption(key, opt.label, opt.value)}
                                            />
                                        ))}
                                    </div>
                                </Accordion>
                            ))}

                            {/* 선택된 옵션 요약 */}
                            {Object.keys(selectedOptions).length > 0 && (
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">선택된 옵션</span>
                                        <button onClick={clearAllOptions} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">모두 지우기</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(selectedOptions).map(([key, opt]) => (
                                            <span key={key} className="bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 px-2 py-1 rounded text-xs flex items-center gap-1">
                                                {opt.label.replace(/^[^\s]+\s/, '')}
                                                <button onClick={() => { const newOpts = { ...selectedOptions }; delete newOpts[key]; setSelectedOptions(newOpts); updatePromptFromOptions(newOpts); }} className="hover:text-purple-800">×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* 편집 모드 */
                        <>
                            {/* 원본 이미지 */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-lg">📷</span>
                                    <span className="font-medium text-gray-800 dark:text-white">원본 이미지</span>
                                </div>
                                <div className="flex gap-3 mb-3">
                                    <button
                                        onClick={() => { if (resultUrl) { setEditSourceUrl(resultUrl); setOriginalDesc(prompt); } }}
                                        disabled={!resultUrl}
                                        className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg text-sm transition disabled:opacity-40 text-gray-700 dark:text-gray-300"
                                    >
                                        생성된 이미지 사용
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={editSourceUrl}
                                    onChange={(e) => setEditSourceUrl(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm placeholder-gray-400 dark:text-white"
                                    placeholder="이미지 URL 입력..."
                                />
                                {editSourceUrl && (
                                    <div className="mt-3">
                                        <img src={editSourceUrl} alt="source" className="max-h-40 rounded-lg mx-auto" />
                                    </div>
                                )}
                            </div>

                            {/* 편집 프롬프트 */}
                            <div className="bg-gradient-to-r from-pink-500/20 to-rose-500/20 p-[1px] rounded-2xl">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-lg">✏️</span>
                                        <span className="font-medium text-gray-800 dark:text-white">편집 지시</span>
                                    </div>
                                    <textarea
                                        value={editPrompt}
                                        onChange={(e) => setEditPrompt(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm placeholder-gray-400 resize-none dark:text-white mb-3"
                                        placeholder="어떻게 편집할지 설명하세요... (예: 배경을 우주로 바꿔줘)"
                                        rows={2}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); applyEdit(); } }}
                                    />
                                    <button
                                        onClick={applyEdit}
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 py-3 rounded-xl font-semibold text-sm text-white transition-all"
                                    >
                                        ✨ AI 편집 적용
                                    </button>
                                </div>
                            </div>

                            {/* 편집 옵션들 */}
                            {Object.entries(editOptions).map(([key, cat]) => (
                                <Accordion key={key} icon={cat.icon} title={cat.title} defaultOpen={key === 'styleTransform'}>
                                    <div className="flex flex-wrap gap-2">
                                        {cat.options.map(opt => (
                                            <OptionChip
                                                key={opt.label}
                                                label={opt.label}
                                                selected={editPrompt === opt.value}
                                                onClick={() => setEditPrompt(opt.value)}
                                            />
                                        ))}
                                    </div>
                                </Accordion>
                            ))}

                            {/* 원본 설명 */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-lg">📝</span>
                                    <span className="font-medium text-sm text-gray-800 dark:text-white">원본 설명 (선택)</span>
                                </div>
                                <input
                                    type="text"
                                    value={originalDesc}
                                    onChange={(e) => setOriginalDesc(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm placeholder-gray-400 dark:text-white"
                                    placeholder="원본 이미지 설명 (더 정확한 편집을 위해)"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* 오른쪽 패널 - 미리보기 */}
                <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                    {isLoading ? (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
                            <div className="w-12 h-12 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-300">이미지 생성 중...</p>
                            <p className="text-sm text-gray-400 mt-2">10-30초 소요</p>
                        </div>
                    ) : mode === 'generate' && resultUrl ? (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            <div className="bg-[repeating-conic-gradient(#f3f4f6_0%_25%,transparent_0%_50%)] dark:bg-[repeating-conic-gradient(#374151_0%_25%,transparent_0%_50%)] bg-[length:20px_20px] aspect-square flex items-center justify-center">
                                <img src={resultUrl} alt="result" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex gap-2 mb-3">
                                    <button onClick={() => downloadImage(resultUrl)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg text-sm transition flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                                        <Download size={16} /> 다운로드
                                    </button>
                                    <button onClick={sendToEdit} className="flex-1 py-2.5 bg-pink-100 dark:bg-pink-900/30 hover:bg-pink-200 dark:hover:bg-pink-800 border border-pink-300 dark:border-pink-700 rounded-lg text-sm transition flex items-center justify-center gap-2 text-pink-600 dark:text-pink-400">
                                        <Image size={16} /> AI 편집
                                    </button>
                                    <button onClick={copyPrompt} className="py-2.5 px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg text-sm transition" title="프롬프트 복사">
                                        <Copy size={16} className="text-gray-600 dark:text-gray-400" />
                                    </button>
                                    <button onClick={generateImage} className="py-2.5 px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg text-sm transition" title="재생성">
                                        <RefreshCw size={16} className="text-gray-600 dark:text-gray-400" />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{prompt}</p>
                                <p className="text-xs text-gray-400 mt-1">{genSettings.width}×{genSettings.height} | {genSettings.model}</p>
                            </div>
                        </div>
                    ) : mode === 'edit' && editResultAfter ? (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            <div className="grid grid-cols-2 gap-1">
                                <div className="relative">
                                    <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">원본</div>
                                    <img src={editResultBefore || ''} alt="before" className="w-full aspect-square object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div className="relative">
                                    <div className="absolute top-2 left-2 bg-pink-500 px-2 py-1 rounded text-xs text-white">편집 후</div>
                                    <img src={editResultAfter} alt="after" className="w-full aspect-square object-cover" referrerPolicy="no-referrer" />
                                </div>
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex gap-2 mb-3">
                                    <button onClick={() => downloadImage(editResultAfter)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg text-sm transition text-gray-700 dark:text-gray-300">
                                        📥 다운로드
                                    </button>
                                    <button onClick={() => { setEditSourceUrl(editResultAfter); setEditPrompt(''); setEditResultAfter(null); }} className="flex-1 py-2.5 bg-pink-100 dark:bg-pink-900/30 hover:bg-pink-200 dark:hover:bg-pink-800 border border-pink-300 dark:border-pink-700 rounded-lg text-sm transition text-pink-600 dark:text-pink-400">
                                        ➡️ 계속 편집
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{editPrompt}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
                            <div className="text-6xl mb-4">🎨</div>
                            <p className="text-gray-500 dark:text-gray-400">옵션을 선택하고 생성하기를 눌러주세요</p>
                            <p className="text-gray-400 text-sm mt-2">또는 프롬프트를 직접 입력하세요</p>
                        </div>
                    )}

                    {/* 히스토리 */}
                    {history.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-sm text-gray-500 dark:text-gray-400">최근 생성</span>
                                <button onClick={() => { setHistory([]); localStorage.removeItem('aiHistory'); }} className="text-xs text-gray-400 hover:text-gray-600">지우기</button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {history.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => { setPrompt(item.prompt); setResultUrl(item.url); }}
                                        className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative group"
                                    >
                                        <img src={item.url} alt="history" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        {item.isEdit && <div className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full"></div>}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                                            불러오기
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageStudioPage;
