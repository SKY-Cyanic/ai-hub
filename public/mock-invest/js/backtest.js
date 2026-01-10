// js/backtest.js
import { state } from './state.js';
import { fetchWithProxy } from './api.js';
import { calculateSMA, formatKRW, formatPrice, showToast } from './utils.js';

let btChart = null;

export async function runBacktest() {
    const symbol = document.getElementById('backtestSymbol').value;
    const initialCapital = parseInt(document.getElementById('backtestCapital').value) || 10000000;
    const shortP = parseInt(document.getElementById('maShort').value) || 20;
    const longP = parseInt(document.getElementById('maLong').value) || 60;

    const logContainer = document.getElementById('backtestLog');
    logContainer.innerHTML = '<div class="text-slate-500 text-center py-4">데이터 분석 중...</div>';

    const asset = [...state.stocks, ...state.cryptos].find(a => a.code === symbol);
    if (!asset) {
        showToast('유효하지 않은 종목입니다.', 'error');
        return;
    }

    try {
        const querySymbol = asset.symbol || asset.yahooSymbol;
        const data = await fetchWithProxy(`https://query1.finance.yahoo.com/v8/finance/chart/${querySymbol}?interval=1d&range=2y`);
        const result = data?.chart?.result?.[0];

        if (!result || !result.timestamp) throw new Error('데이터 로드 실패');

        const quotes = result.indicators.quote[0];
        const prices = result.timestamp.map((t, i) => ({
            time: t,
            close: quotes.close[i]
        })).filter(d => d.close != null);

        if (prices.length < longP + 10) throw new Error('시뮬레이션에 필요한 데이터가 부족합니다.');

        // Calculate SMAs
        const smaShort = calculateSMA(prices, shortP);
        const smaLong = calculateSMA(prices, longP);

        // Simulation
        let cash = initialCapital;
        let held = 0;
        let trades = [];
        let equity = [];

        for (let i = 0; i < prices.length; i++) {
            const current = prices[i];
            const s = smaShort[i];
            const l = smaLong[i];
            const prevS = smaShort[i - 1];
            const prevL = smaLong[i - 1];

            // Golden Cross (Buy)
            if (prevS <= prevL && s > l && held === 0) {
                held = cash / current.close;
                cash = 0;
                trades.push({ type: 'buy', time: current.time, price: current.close });
            }
            // Dead Cross (Sell)
            else if (prevS >= prevL && s < l && held > 0) {
                cash = held * current.close;
                held = 0;
                trades.push({ type: 'sell', time: current.time, price: current.close });
            }

            equity.push({
                time: current.time,
                value: cash + (held * current.close)
            });
        }

        // Finish last trade if held
        let finalCash = cash + (held * prices[prices.length - 1].close);
        const totalReturn = ((finalCash - initialCapital) / initialCapital) * 100;
        const winCount = trades.filter((t, i) => t.type === 'sell' && t.price > trades[i - 1].price).length;
        const totalSellPairs = Math.floor(trades.length / 2);
        const winRate = totalSellPairs > 0 ? (winCount / totalSellPairs) * 100 : 0;

        // Update Summary UI
        document.getElementById('btTotalReturn').textContent = `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`;
        document.getElementById('btTotalReturn').className = `text-2xl font-black ${totalReturn >= 0 ? 'text-red-400' : 'text-blue-400'}`;
        document.getElementById('btFinalAsset').textContent = formatKRW(finalCash);
        document.getElementById('btTradeCount').textContent = `${trades.length}회`;
        document.getElementById('btWinRate').textContent = `${winRate.toFixed(1)}%`;

        // Update Log
        logContainer.innerHTML = trades.map(t => `
            <div class="flex justify-between items-center p-2 border-b border-slate-700/30 text-xs">
                <span class="text-slate-500">${new Date(t.time * 1000).toLocaleDateString()}</span>
                <span class="${t.type === 'buy' ? 'text-red-400' : 'text-blue-400'} font-bold">${t.type === 'buy' ? '매수' : '매도'}</span>
                <span class="number-font">${formatPrice(t.price, asset.market)}</span>
            </div>
        `).reverse().join('');

        // Render Chart
        renderBTChart(prices, smaShort, smaLong, trades, equity);

    } catch (e) {
        showToast('백테스팅 오류: ' + e.message, 'error');
    }
}

function renderBTChart(prices, smaShort, smaLong, trades, equity) {
    const container = document.getElementById('backtestChart');
    container.innerHTML = '';

    btChart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 400,
        layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
        timeScale: { borderColor: '#334155' },
        rightPriceScale: { borderColor: '#334155' }
    });

    const priceSeries = btChart.addLineSeries({ color: '#64748b', lineWidth: 1, title: 'Price' });
    priceSeries.setData(prices.map(d => ({ time: d.time, value: d.close })));

    const sSeries = btChart.addLineSeries({ color: '#f59e0b', lineWidth: 2, title: 'Short MA' });
    sSeries.setData(prices.map((d, i) => ({ time: d.time, value: smaShort[i] })).filter(d => !isNaN(d.value)));

    const lSeries = btChart.addLineSeries({ color: '#3b82f6', lineWidth: 2, title: 'Long MA' });
    lSeries.setData(prices.map((d, i) => ({ time: d.time, value: smaLong[i] })).filter(d => !isNaN(d.value)));

    const equitySeries = btChart.addAreaSeries({
        topColor: 'rgba(16, 185, 129, 0.4)',
        bottomColor: 'rgba(16, 185, 129, 0.0)',
        lineColor: '#10b981', lineWidth: 2, title: 'Equity',
        priceScaleId: 'left'
    });
    btChart.priceScale('left').applyOptions({ visible: true, borderVisible: false });
    equitySeries.setData(equity.map(d => ({ time: d.time, value: d.value })));

    // Markers
    const markers = trades.map(t => ({
        time: t.time,
        position: t.type === 'buy' ? 'belowBar' : 'aboveBar',
        color: t.type === 'buy' ? '#ef4444' : '#3b82f6',
        shape: t.type === 'buy' ? 'arrowUp' : 'arrowDown',
        text: t.type === 'buy' ? 'B' : 'S'
    }));
    priceSeries.setMarkers(markers);

    btChart.timeScale().fitContent();
}

export function resizeBTChart() {
    if (btChart) btChart.applyOptions({ width: document.getElementById('backtestChart').clientWidth });
}
