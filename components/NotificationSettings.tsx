
import React, { useState } from 'react';
import { Bell, MessageSquare, ThumbsUp, Megaphone, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NotificationSettingsProps {
    onClose: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onClose }) => {
    const { user } = useAuth();

    const [settings, setSettings] = useState({
        comments: true,
        likes: true,
        mentions: true,
        system: true,
    });

    const handleSave = () => {
        // In a real app, save to user profile in storage/firebase
        localStorage.setItem('notification_settings', JSON.stringify(settings));
        alert('알림 설정이 저장되었습니다.');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-black flex items-center gap-2 mb-6 dark:text-white">
                    <Bell size={22} /> 알림 설정
                </h2>

                <div className="space-y-4">
                    <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <span className="flex items-center gap-3 text-sm font-medium dark:text-gray-200">
                            <MessageSquare size={18} className="text-green-500" /> 댓글 알림
                        </span>
                        <input
                            type="checkbox"
                            checked={settings.comments}
                            onChange={(e) => setSettings({ ...settings, comments: e.target.checked })}
                            className="w-5 h-5 accent-indigo-600"
                        />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <span className="flex items-center gap-3 text-sm font-medium dark:text-gray-200">
                            <ThumbsUp size={18} className="text-red-500" /> 좋아요 알림
                        </span>
                        <input
                            type="checkbox"
                            checked={settings.likes}
                            onChange={(e) => setSettings({ ...settings, likes: e.target.checked })}
                            className="w-5 h-5 accent-indigo-600"
                        />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <span className="flex items-center gap-3 text-sm font-medium dark:text-gray-200">
                            <span className="text-indigo-500 font-bold">@</span> 멘션(@) 알림
                        </span>
                        <input
                            type="checkbox"
                            checked={settings.mentions}
                            onChange={(e) => setSettings({ ...settings, mentions: e.target.checked })}
                            className="w-5 h-5 accent-indigo-600"
                        />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <span className="flex items-center gap-3 text-sm font-medium dark:text-gray-200">
                            <Megaphone size={18} className="text-orange-500" /> 시스템 공지 알림
                        </span>
                        <input
                            type="checkbox"
                            checked={settings.system}
                            onChange={(e) => setSettings({ ...settings, system: e.target.checked })}
                            className="w-5 h-5 accent-indigo-600"
                        />
                    </label>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Save size={16} /> 저장
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettings;
