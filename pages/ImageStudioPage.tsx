import React from 'react';
import { Hammer, Github, ExternalLink } from 'lucide-react';

const ImageStudioPage: React.FC = () => {
    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 animate-fade-in">
            <div className="text-center max-w-lg">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    <Hammer className="text-purple-600 dark:text-purple-400 w-12 h-12 animate-pulse" />
                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded-full text-black shadow-lg">WIP</div>
                </div>

                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">
                    시스템 점검 및 통합 중
                </h1>

                <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                    현재 <strong>AI 이미지 스튜디오</strong>는 대규모 업데이트와 안정화 작업을 진행하고 있습니다.<br />
                    더 나은 서비스로 곧 찾아뵙겠습니다.
                </p>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-xl p-4 mb-8 text-left">
                    <h3 className="font-bold text-yellow-800 dark:text-yellow-400 text-sm mb-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                        작업 진행 상황
                    </h3>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-500 space-y-1 ml-4 list-disc">
                        <li>Pollinations.ai API 레이트 리밋 최적화</li>
                        <li>생성 모델 파이프라인 개편</li>
                        <li>위키 그래프 뷰 통합 준비</li>
                    </ul>
                </div>

                <div className="flex gap-4 justify-center">
                    <a href="/" className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm transition hover:scale-105 active:scale-95">
                        홈으로 돌아가기
                    </a>
                    <a
                        href="https://github.com/pollinations/pollinations"
                        target="_blank"
                        rel="noreferrer"
                        className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Github size={16} />
                        Pollinations 확인
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ImageStudioPage;
