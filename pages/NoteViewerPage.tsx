import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, Bomb, Clock, Check, Eye, Trash2 } from 'lucide-react';
import { storage } from '../services/storage';

const NoteViewerPage: React.FC = () => {
    const { noteId } = useParams<{ noteId: string }>();
    const navigate = useNavigate();
    const [note, setNote] = useState<{ content: string; expiry: string; created_at: number; expires_at: number | null } | null>(null);
    const [error, setError] = useState('');
    const [viewed, setViewed] = useState(false);
    const [remainingTime, setRemainingTime] = useState<number | null>(null);
    const [instantCountdown, setInstantCountdown] = useState<number | null>(null);
    const [showContent, setShowContent] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // 남은 시간 계산
    const calculateRemainingTime = useCallback((expiresAt: number | null): number => {
        if (!expiresAt) return 0;
        return Math.max(0, expiresAt - Date.now());
    }, []);

    // 시간 포맷팅
    const formatTime = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}시간 ${minutes}분 ${secs}초`;
        } else if (minutes > 0) {
            return `${minutes}분 ${secs}초`;
        }
        return `${secs}초`;
    };

    useEffect(() => {
        const loadNote = async () => {
            if (!noteId) return;

            setIsLoading(true);
            const data = await storage.getVolatileNote(noteId);
            setIsLoading(false);

            if (!data) {
                setError('메모를 찾을 수 없거나 이미 삭제되었습니다.');
                return;
            }

            setNote(data);

            // 읽는 즉시 삭제인 경우 - 5초 카운트다운 시작
            if (data.expiry === 'instant') {
                setInstantCountdown(5);
            } else {
                setShowContent(true);
                if (data.expires_at) {
                    setRemainingTime(calculateRemainingTime(data.expires_at));
                }
            }
        };

        loadNote();
    }, [noteId, calculateRemainingTime]);

    // 타이머 업데이트 (일반 만료)
    useEffect(() => {
        if (!note || note.expiry === 'instant' || !note.expires_at) return;

        const timer = setInterval(async () => {
            const newRemaining = calculateRemainingTime(note.expires_at);
            if (newRemaining <= 0) {
                setError('메모가 만료되어 삭제되었습니다.');
                setNote(null);
            } else {
                setRemainingTime(newRemaining);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [note, calculateRemainingTime]);

    // 즉시 삭제 카운트다운
    useEffect(() => {
        if (instantCountdown === null) return;

        if (instantCountdown <= 0) {
            setShowContent(true);
            // Firebase에서 삭제
            if (noteId) {
                storage.markNoteViewed(noteId, 'instant');
            }
            setViewed(true);
            setInstantCountdown(null);
            return;
        }

        const timer = setTimeout(() => {
            setInstantCountdown(prev => (prev !== null ? prev - 1 : null));
        }, 1000);

        return () => clearTimeout(timer);
    }, [instantCountdown, noteId]);

    const getExpiryText = (expiry: string) => {
        switch (expiry) {
            case 'instant': return '읽는 즉시 삭제';
            case '5min': return '5분 후 삭제';
            case '1hour': return '1시간 후 삭제';
            case '24hour': return '24시간 후 삭제';
            default: return '';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-red-500 rounded-full"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 text-center border border-red-200 dark:border-red-800">
                    <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
                    <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">메모 없음</h1>
                    <p className="text-red-500 dark:text-red-300 text-sm mb-6">{error}</p>
                    <button onClick={() => navigate('/tools')} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition">
                        도구 페이지로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    if (!note) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-red-500 rounded-full"></div>
            </div>
        );
    }

    // 즉시 삭제 카운트다운 화면
    if (instantCountdown !== null && instantCountdown > 0) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-8 text-center text-white shadow-2xl">
                    <Bomb size={64} className="mx-auto mb-6 animate-pulse" />
                    <h1 className="text-2xl font-black mb-4">비밀 메모 수신</h1>
                    <p className="text-red-100 mb-6">이 메모는 단 한 번만 볼 수 있습니다.<br />준비되셨나요?</p>

                    <div className="bg-white/20 backdrop-blur rounded-xl p-6 mb-6">
                        <p className="text-5xl font-black mb-2">{instantCountdown}</p>
                        <p className="text-sm text-red-100">초 후 메시지가 표시됩니다</p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-red-200 text-sm">
                        <Eye size={16} />
                        <span>열람 후 즉시 삭제됩니다</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                    <Bomb size={24} />
                    <h1 className="text-xl font-black">휘발성 메모</h1>
                </div>
                <p className="text-red-100 text-sm">이 메모는 비밀 링크를 통해 전달된 일회성 메시지입니다.</p>
            </div>

            {/* Timer Status */}
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                    <Clock size={16} />
                    <span>{getExpiryText(note.expiry)}</span>
                </div>

                {/* 실시간 타이머 표시 */}
                {remainingTime !== null && remainingTime > 0 && (
                    <div className={`flex items-center gap-2 text-sm font-bold ${remainingTime < 60000 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                        <Trash2 size={16} />
                        <span>{formatTime(remainingTime)} 남음</span>
                    </div>
                )}

                {viewed && (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
                        <Check size={16} />
                        <span>열람 완료 (삭제됨)</span>
                    </div>
                )}
            </div>

            {/* Content */}
            {showContent && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                    <p className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">메시지 내용</p>
                    <div className="prose dark:prose-invert max-w-none">
                        <p className="text-gray-800 dark:text-white whitespace-pre-wrap leading-relaxed text-lg">
                            {note.content}
                        </p>
                    </div>
                </div>
            )}

            {/* Warning */}
            {viewed && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm flex items-center gap-2">
                        <AlertTriangle size={16} />
                        이 메모는 이미 삭제되었습니다. 페이지를 새로고침하면 다시 볼 수 없습니다.
                    </p>
                </div>
            )}

            <button onClick={() => navigate('/tools')} className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                도구 페이지로 돌아가기
            </button>
        </div>
    );
};

export default NoteViewerPage;
