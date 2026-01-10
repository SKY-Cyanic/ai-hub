import React from 'react';

/**
 * AI Model Performance & Cost Analyzer
 * 
 * This component embeds the original HTML file via iframe to ensure 100% feature parity.
 * The original file contains 50+ models, 6 tabs (Calculator, Dashboard, Compare, Scatter, Heatmap, Ranking),
 * and complex Chart.js visualizations.
 */
export default function AIAnalyzerPage() {
    return (
        <div className="w-full h-[calc(100vh-64px)] -m-4 md:-m-6">
            <iframe
                src="/ai-analyzer.html"
                title="AI 모델 성능 & 비용 분석기"
                className="w-full h-full border-0"
                allow="fullscreen"
            />
        </div>
    );
}
