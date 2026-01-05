
import React, { useState, useEffect } from 'react';
import { Palette, Save, RotateCcw, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface CustomTheme {
    primaryColor: string;
    accentColor: string;
    bgColor: string;
    textColor: string;
}

const PRESET_THEMES: { name: string; theme: CustomTheme }[] = [
    { name: '기본 (인디고)', theme: { primaryColor: '#6366f1', accentColor: '#8b5cf6', bgColor: '#f9fafb', textColor: '#111827' } },
    { name: '사이버펑크', theme: { primaryColor: '#06b6d4', accentColor: '#f43f5e', bgColor: '#0f172a', textColor: '#f1f5f9' } },
    { name: '포레스트', theme: { primaryColor: '#10b981', accentColor: '#84cc16', bgColor: '#ecfdf5', textColor: '#064e3b' } },
    { name: '선셋', theme: { primaryColor: '#f97316', accentColor: '#ef4444', bgColor: '#fef3c7', textColor: '#7c2d12' } },
    { name: '미드나잇', theme: { primaryColor: '#8b5cf6', accentColor: '#ec4899', bgColor: '#1e1b4b', textColor: '#e0e7ff' } },
];

interface ThemeBuilderProps {
    onClose: () => void;
}

const ThemeBuilder: React.FC<ThemeBuilderProps> = ({ onClose }) => {
    const { isDarkMode } = useTheme();
    const [customTheme, setCustomTheme] = useState<CustomTheme>({
        primaryColor: '#6366f1',
        accentColor: '#8b5cf6',
        bgColor: isDarkMode ? '#0f172a' : '#f9fafb',
        textColor: isDarkMode ? '#f1f5f9' : '#111827',
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('custom_theme');
        if (savedTheme) {
            setCustomTheme(JSON.parse(savedTheme));
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('custom_theme', JSON.stringify(customTheme));
        document.documentElement.style.setProperty('--primary-color', customTheme.primaryColor);
        document.documentElement.style.setProperty('--accent-color', customTheme.accentColor);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleReset = () => {
        localStorage.removeItem('custom_theme');
        setCustomTheme(PRESET_THEMES[0].theme);
        document.documentElement.style.removeProperty('--primary-color');
        document.documentElement.style.removeProperty('--accent-color');
    };

    const applyPreset = (preset: CustomTheme) => {
        setCustomTheme(preset);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-black flex items-center gap-2 mb-6 dark:text-white">
                    <Palette size={22} className="text-violet-500" /> 테마 빌더
                </h2>

                {/* Presets */}
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase">프리셋</p>
                    <div className="flex flex-wrap gap-2">
                        {PRESET_THEMES.map((preset, idx) => (
                            <button
                                key={idx}
                                onClick={() => applyPreset(preset.theme)}
                                className="px-3 py-1.5 text-xs font-bold rounded-full border transition-colors"
                                style={{ borderColor: preset.theme.primaryColor, color: preset.theme.primaryColor }}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Pickers */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium dark:text-gray-200">메인 컬러</label>
                        <input
                            type="color"
                            value={customTheme.primaryColor}
                            onChange={(e) => setCustomTheme({ ...customTheme, primaryColor: e.target.value })}
                            className="w-12 h-8 rounded cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium dark:text-gray-200">액센트 컬러</label>
                        <input
                            type="color"
                            value={customTheme.accentColor}
                            onChange={(e) => setCustomTheme({ ...customTheme, accentColor: e.target.value })}
                            className="w-12 h-8 rounded cursor-pointer"
                        />
                    </div>
                </div>

                {/* Preview */}
                <div className="mt-6 p-4 rounded-xl border" style={{ backgroundColor: customTheme.bgColor, borderColor: customTheme.primaryColor }}>
                    <p className="font-bold mb-2" style={{ color: customTheme.textColor }}>미리보기</p>
                    <button className="px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: customTheme.primaryColor }}>
                        버튼 예시
                    </button>
                    <span className="ml-2 font-bold" style={{ color: customTheme.accentColor }}>액센트 텍스트</span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button onClick={handleReset} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold text-sm flex items-center justify-center gap-2">
                        <RotateCcw size={14} /> 초기화
                    </button>
                    <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-violet-700 transition-colors">
                        {saved ? <><Check size={14} /> 저장됨!</> : <><Save size={14} /> 저장</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThemeBuilder;
