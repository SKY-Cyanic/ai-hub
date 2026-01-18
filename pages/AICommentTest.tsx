/**
 * AI Comment Test Page
 * AI 댓글 시스템 테스트용 페이지
 */

import React, { useState } from 'react';
import { AICommentService, AI_PERSONAS, AIPersonaType } from '../services/aiCommentService';
import { Loader2, MessageSquare, Bot } from 'lucide-react';

const AICommentTest: React.FC = () => {
    const [postTitle, setPostTitle] = useState('양자컴퓨터의 미래');
    const [postContent, setPostContent] = useState(`양자컴퓨터는 기존 컴퓨터와는 다른 원리로 작동하는 혁신적인 기술입니다. 

# 주요 특징
- 큐비트 기반 연산
- 양자 얽힘 활용
- 슈퍼포지션 상태

이 기술은 암호화, 신약 개발, 금융 모델링 등 다양한 분야에서 혁신을 가져올 것으로 예상됩니다.`);
    const [selectedPersona, setSelectedPersona] = useState<AIPersonaType>('beginner');
    const [generatedComment, setGeneratedComment] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!postContent.trim()) {
            setError('게시물 내용을 입력하세요');
            return;
        }

        setIsGenerating(true);
        setError('');
        setGeneratedComment('');

        try {
            const comment = await AICommentService.generateComment(
                postContent,
                postTitle,
                selectedPersona
            );
            setGeneratedComment(comment);
        } catch (err: any) {
            setError(err.message || 'AI 댓글 생성 실패');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        🤖 AI 댓글 테스트
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Phase 3: AI Comment System
                    </p>
                </div>

                {/* 게시물 입력 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">게시물</h2>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            제목
                        </label>
                        <input
                            type="text"
                            value={postTitle}
                            onChange={(e) => setPostTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            내용
                        </label>
                        <textarea
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            rows={10}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* 페르소나 선택 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">AI 페르소나 선택</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(AI_PERSONAS).map(([key, persona]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedPersona(key as AIPersonaType)}
                                className={`p-4 rounded-lg border-2 transition-all text-left ${selectedPersona === key
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{persona.emoji}</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {persona.name}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {persona.systemPrompt.split('\n')[0]}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 생성 버튼 */}
                <div className="text-center mb-6">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !postContent.trim()}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 mx-auto"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                AI 댓글 생성 중...
                            </>
                        ) : (
                            <>
                                <Bot className="w-5 h-5" />
                                AI 댓글 생성
                            </>
                        )}
                    </button>
                </div>

                {/* 에러 */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
                        <p className="text-red-700 dark:text-red-300">{error}</p>
                    </div>
                )}

                {/* 생성된 댓글 */}
                {generatedComment && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                생성된 댓글
                            </h2>
                            <span className="ml-auto px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
                                🤖 AI
                            </span>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <span className="text-3xl">{AI_PERSONAS[selectedPersona].emoji}</span>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-900 dark:text-white mb-1">
                                        {AI_PERSONAS[selectedPersona].name}
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {generatedComment}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AICommentTest;
