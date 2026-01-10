import React from 'react';

/**
 * Mock Investment Simulation
 * 
 * This component embeds the full Mock Investment simulation via iframe.
 * Features: Real-time charts (LightweightCharts), Portfolio management, 
 * Trading challenge mode, Backtesting, AI analysis, Trading journal.
 */
export default function MockInvestmentPage() {
    return (
        <div className="w-full h-[calc(100vh-64px)] -m-4 md:-m-6">
            <iframe
                src="/mock-invest/index.html"
                title="모의투자 시뮬레이션"
                className="w-full h-full border-0"
                allow="fullscreen"
            />
        </div>
    );
}
