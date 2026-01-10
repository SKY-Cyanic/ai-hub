import { state } from './state.js';
import { fetchWithProxy } from './api.js';
import { formatKRW, formatPrice, showToast } from './utils.js';
import { addJournalEntry } from './journal.js';

let gameChart = null;
let gameSeries = null;
let gameData = [];
let gameCurrentIndex = 0;
let gameCash = 10000000;
let gameHeld = 0;
let gameAutoInterval = null;
let gameSymbol = '';
let selectedScenario = 'random';

export function selectScenario(mode) {
    selectedScenario = mode;
    document.querySelectorAll('.event-card').forEach(c => c.classList.remove('selected'));
    const btn = document.querySelector(`.event-card[data-mode="${mode}"]`);
    if (btn) btn.classList.add('selected');
}

export async function startGame() {
    gameSymbol = document.getElementById('gameSymbolSelect').value;

    // UI Reset
    document.getElementById('gameSelectScreen').classList.add('hidden');
    document.getElementById('gamePlayScreen').classList.remove('hidden'); // Show loading state if needed

    try {
        // Fix: Use 10y range to ensure roughly enough data
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${gameSymbol}?interval=1d&range=10y`;
        const data = await fetchWithProxy(url);
        const result = data?.chart?.result?.[0];

        if (!result?.timestamp) throw new Error('데이터 없음');

        const quotes = result.indicators.quote[0];
        gameData = result.timestamp.map((t, i) => ({
            time: t,
            open: quotes.open[i],
            high: quotes.high[i],
            low: quotes.low[i],
            close: quotes.close[i]
        })).filter(d => d.close != null);

        // Fix: Relaxed data requirement
        if (gameData.length < 200) throw new Error(`데이터 부족 (${gameData.length}일 - 최소 200일 필요)`);

        let startIndex;
        if (selectedScenario === 'random') {
            startIndex = Math.floor(Math.random() * (gameData.length - 250)) + 50;
        } else if (selectedScenario === 'timemachine') {
            const tmDateStr = document.getElementById('tmDate').value;
            if (!tmDateStr) throw new Error('타임머신 날짜를 선택해주세요.');
            const targetTime = new Date(tmDateStr).getTime() / 1000;
            startIndex = gameData.findIndex(d => d.time >= targetTime);
            if (startIndex === -1) throw new Error('해당 날짜의 데이터를 찾을 수 없습니다.');
        } else {
            const scenarios = {
                'covid': new Date('2020-01-01').getTime() / 1000,
                'gme': new Date('2021-01-01').getTime() / 1000,
                'btc2017': new Date('2017-09-01').getTime() / 1000,
                'financial2008': new Date('2008-09-01').getTime() / 1000,
                'ai2023': new Date('2023-01-01').getTime() / 1000
            };
            const targetTime = scenarios[selectedScenario];
            startIndex = gameData.findIndex(d => d.time >= targetTime);
            if (startIndex === -1 || startIndex < 50) startIndex = 50;
        }

        gameCurrentIndex = startIndex;
        gameCash = 10000000;
        gameHeld = 0;

        document.getElementById('gameControls').classList.remove('hidden');
        document.getElementById('gameResult').classList.add('hidden');

        initGameChart();
        updateGameStats();
    } catch (e) {
        alert('게임 시작 실패: ' + e.message);
        resetGameScreen();
    }
}

function initGameChart() {
    const container = document.getElementById('gameChartContainer');
    container.innerHTML = '';

    gameChart = LightweightCharts.createChart(container, {
        layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
        timeScale: { borderColor: '#334155' },
        rightPriceScale: { borderColor: '#334155' }
    });

    gameSeries = gameChart.addCandlestickSeries({
        upColor: '#ef4444', downColor: '#3b82f6',
        borderUpColor: '#ef4444', borderDownColor: '#3b82f6',
    });

    // Initial render: 100 candles before start
    const slice = gameData.slice(Math.max(0, gameCurrentIndex - 100), gameCurrentIndex + 1);
    gameSeries.setData(slice);
    gameChart.timeScale().fitContent();
}

function updateGameStats() {
    const current = gameData[gameCurrentIndex];
    if (!current) return;

    document.getElementById('gameDate').textContent = new Date(current.time * 1000).toLocaleDateString('ko-KR');

    const exchangeRate = !gameSymbol.endsWith('.KS') ? 1380 : 1;
    const totalAsset = gameCash + (gameHeld * current.close * exchangeRate);
    const profitRate = ((totalAsset - 10000000) / 10000000) * 100;

    document.getElementById('gameAsset').textContent = formatKRW(totalAsset);

    const returnEl = document.getElementById('gameReturn');
    const color = profitRate >= 0 ? 'text-red-400' : 'text-blue-400';
    returnEl.innerHTML = `<span class="${color}">${profitRate >= 0 ? '+' : ''}${profitRate.toFixed(2)}%</span>`;

    document.getElementById('gameHeldQty').textContent = `${gameHeld.toLocaleString()}주`;

    const price = current.close;
    const priceTxt = !gameSymbol.endsWith('.KS') ? '$' + price.toFixed(2) : '₩' + Math.round(price).toLocaleString();
    document.getElementById('gamePriceBuy').textContent = priceTxt;
    document.getElementById('gamePriceSell').textContent = priceTxt;
}

export function gameAction(type) {
    const current = gameData[gameCurrentIndex];
    const price = current.close;
    // For simplicity, assume fixed exchange rate of 1380 for foreign stocks in game logic or logic inside updateGameStats handles display.
    // Actually, let's keep it simple: Trade in local currency units, but asset value is KRW.

    // Logic simplification for brevity:
    const exchangeRate = !gameSymbol.endsWith('.KS') ? 1380 : 1;
    const priceKRW = price * exchangeRate;

    if (type === 'buy') {
        const qty = Math.floor(gameCash / priceKRW);
        if (qty > 0) {
            gameHeld += qty;
            gameCash -= qty * priceKRW;
            addJournalEntry({
                type: 'buy', code: gameSymbol, name: gameSymbol, market: gameSymbol.endsWith('.KS') ? 'KOSPI' : 'NASDAQ',
                price: price, quantity: qty, time: Date.now()
            });
        }
    } else if (type === 'sell') {
        if (gameHeld > 0) {
            const qty = gameHeld;
            gameCash += gameHeld * priceKRW;
            gameHeld = 0;
            addJournalEntry({
                type: 'sell', code: gameSymbol, name: gameSymbol, market: gameSymbol.endsWith('.KS') ? 'KOSPI' : 'NASDAQ',
                price: price, quantity: qty, time: Date.now()
            });
        }
    } else if (type === 'next') {
        // Just pass
    }

    // Move next
    if (gameCurrentIndex >= gameData.length - 1) {
        finishGame();
        return;
    }
    gameCurrentIndex++;
    gameSeries.update(gameData[gameCurrentIndex]);
    updateGameStats();
}

export function gameToggleAuto() {
    if (gameAutoInterval) {
        clearInterval(gameAutoInterval);
        gameAutoInterval = null;
        document.getElementById('gameAutoBtn').textContent = '▶ 자동 진행';
    } else {
        gameAction('next'); // Immediate step
        gameAutoInterval = setInterval(() => gameAction('next'), 500); // 0.5s speed
        document.getElementById('gameAutoBtn').textContent = '⏸ 정지';
    }
}

export function finishGame() {
    if (gameAutoInterval) clearInterval(gameAutoInterval);
    document.getElementById('gameControls').classList.add('hidden');
    document.getElementById('gameResult').classList.remove('hidden');

    const current = gameData[gameCurrentIndex];
    const exchangeRate = !gameSymbol.endsWith('.KS') ? 1380 : 1;
    const totalAsset = gameCash + (gameHeld * current.close * exchangeRate);
    const profitRate = ((totalAsset - 10000000) / 10000000) * 100;

    document.getElementById('gameResultAsset').textContent = formatKRW(totalAsset);
    document.getElementById('gameResultProfit').textContent = `${profitRate >= 0 ? '+' : ''}${profitRate.toFixed(2)}%`;

    // Save Score
    state.leaderboard.push({
        date: new Date().toLocaleDateString(),
        scenario: selectedScenario,
        asset: totalAsset,
        profitRate: profitRate
    });
    // Sort
    state.leaderboard.sort((a, b) => b.asset - a.asset);
    localStorage.setItem('stockSimLeaderboard', JSON.stringify(state.leaderboard));
}

export function resetGameScreen() {
    if (gameAutoInterval) clearInterval(gameAutoInterval);
    document.getElementById('gameResult').classList.add('hidden');
    document.getElementById('gamePlayScreen').classList.add('hidden');
    document.getElementById('gameControls').classList.add('hidden');
    document.getElementById('gameSelectScreen').classList.remove('hidden');
}
