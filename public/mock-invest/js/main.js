// js/main.js
import { state, INITIAL_CAPITAL } from './state.js';
import { fetchExchangeRate, fetchYahooQuote, fetchNews } from './api.js';
import { renderAssetTable, renderIndexTicker, renderMiniPortfolio, renderIndicesGrid, renderHeatmap, renderPortfolio, renderHistory, openTradeModal } from './ui.js';
import { loadChart, loadIndexChart, resizeCharts } from './charts.js';
import { runBacktest, resizeBTChart } from './backtest.js';
import { formatKRW, showToast } from './utils.js';
import { startGame, selectScenario, gameAction, gameToggleAuto, resetGameScreen, finishGame } from './game.js';
import { addComparison, clearComparisons } from './charts.js';
import { runPatternMatching, updateSmartMoneyTracker, renderCorrelationMatrix, generateAIMasterReport } from './analyst.js';
import { saveCustomStrategy, renderActiveStrategies, checkCustomStrategies } from './strategy.js';
import { renderJournal, loadJournal } from './journal.js';

// --- Global Functions (exposed for HTML onclick handlers) ---
window.showTab = (tab) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(tab + 'Tab').classList.remove('hidden');

    document.querySelectorAll('.main-tab').forEach(b => {
        b.classList.remove('tab-active');
        b.classList.add('hover:bg-slate-700');
    });
    const activeTab = document.querySelector(`.main-tab[data-tab="${tab}"]`);
    if (activeTab) {
        activeTab.classList.add('tab-active');
        activeTab.classList.remove('hover:bg-slate-700');
    }

    switch (tab) {
        case 'chart': loadChart(); break;
        case 'game': resetGameScreen(); break;
        case 'indices': renderIndicesGrid(); break;
        case 'heatmap': renderHeatmap(); break;
        case 'portfolio': renderPortfolio(); break;
        case 'history': renderHistory(); break;
        case 'analyst':
            renderCorrelationMatrix();
            generateAIMasterReport();
            break;
        case 'lab': renderActiveStrategies(); break;
        case 'journal': renderJournal(); break;
    }

    // Resize charts after tab switch to ensure correct dimensions
    setTimeout(() => {
        if (typeof resizeCharts === 'function') resizeCharts();
        if (typeof resizeBTChart === 'function') resizeBTChart();
    }, 50);
};

window.setAssetType = (type, btn) => {
    state.currentAssetType = type;
    document.querySelectorAll('.asset-tab').forEach(b => {
        b.classList.remove('bg-gradient-to-r', 'from-blue-600/20', 'to-transparent', 'border-b-2', 'border-blue-500');
        b.classList.add('text-slate-400');
    });
    btn.classList.remove('text-slate-400');
    btn.classList.add('bg-gradient-to-r', 'from-blue-600/20', 'to-transparent', 'border-b-2', 'border-blue-500');
    document.getElementById('marketTabs').style.display = type === 'stocks' ? 'flex' : 'none';
    renderAssetTable();
};

window.setMarket = (market, btn) => {
    state.currentMarket = market;
    document.querySelectorAll('.market-tab').forEach(b => {
        b.classList.remove('bg-blue-600');
        b.classList.add('bg-slate-700');
    });
    btn.classList.remove('bg-slate-700');
    btn.classList.add('bg-blue-600');
    renderAssetTable();
};

window.selectAsset = (code) => {
    const asset = [...state.stocks, ...state.cryptos].find(a => a.code === code);
    if (asset) {
        // Auto switch to chart tab and load
        const chartSelect = document.getElementById('chartSymbolSelect');
        chartSelect.value = code;
        window.showTab('chart');
        loadChart();
    }
};

window.setChartPeriod = (period) => {
    state.currentChartPeriod = period;
    loadChart();
};

window.setChartType = (type) => {
    state.currentChartType = type;
    loadChart();
};

window.setIndexPeriod = (period) => {
    state.currentIndexPeriod = period;
    loadIndexChart();
};

window.setHeatmapType = (type) => {
    state.currentHeatmapType = type;
    document.querySelectorAll('.heatmap-type-btn').forEach(b => {
        if (b.dataset.type === type) {
            b.classList.add('bg-blue-600');
            b.classList.remove('bg-slate-700');
        } else {
            b.classList.remove('bg-blue-600');
            b.classList.add('bg-slate-700');
        }
    });
    renderHeatmap();
};

window.toggleFavorite = (code) => {
    if (state.favorites.includes(code)) {
        state.favorites = state.favorites.filter(c => c !== code);
        showToast('관심 종목 삭제');
    } else {
        state.favorites.push(code);
        showToast('관심 종목 추가', 'success');
    }
    saveGame();
    renderAssetTable();
};

window.openAlertModal = (code) => {
    const asset = [...state.stocks, ...state.cryptos].find(a => a.code === code);
    if (asset) {
        document.getElementById('alertModal').classList.remove('hidden');
        document.getElementById('alertPrice').value = asset.price;
        window.currentAlertCode = code;
    }
};

window.closeAlertModal = () => {
    document.getElementById('alertModal').classList.add('hidden');
};

window.saveAlert = () => {
    const price = document.getElementById('alertPrice').value;
    showToast(`${window.currentAlertCode} 알림 설정 완료: ${price}`, 'success');
    window.closeAlertModal();
};

window.refreshAllData = refreshAllData;

window.resetGame = () => {
    if (!confirm('초기화 하시겠습니까?')) return;
    state.cash = INITIAL_CAPITAL;
    state.portfolio = {};
    state.transactions = [];
    state.favorites = [];
    localStorage.removeItem('stockSimPro');
    window.location.reload();
};

// Expose Global Functions
window.selectScenario = selectScenario;
window.startGame = startGame;
window.gameAction = gameAction;
window.gameToggleAuto = gameToggleAuto;
window.addComparison = addComparison;
window.clearComparisons = clearComparisons;
window.loadChart = loadChart;
window.loadIndexChart = loadIndexChart;
window.renderHeatmap = renderHeatmap;
window.renderHistory = renderHistory;
window.renderPortfolio = renderPortfolio;
window.runBacktest = runBacktest;
window.gameTrade = (type) => gameAction(type);
window.gameNext = () => gameAction('next');
window.finishGame = finishGame;

// Tab show functions that were inside window.showTab but can be exposed
window.renderIndicesGrid = renderIndicesGrid;
window.openTradeModal = openTradeModal;
window.generateAIMasterReport = generateAIMasterReport;
window.runPatternMatching = () => {
    const symbol = document.getElementById('chartSymbolSelect').value;
    if (symbol) runPatternMatching(symbol);
    else showToast('차트 탭에서 종목을 먼저 선택해주세요.', 'error');
};
window.saveCustomStrategy = saveCustomStrategy;
window.renderJournal = renderJournal;

async function refreshAllData() {
    const btn = document.getElementById('refreshText');
    if (btn) btn.textContent = '갱신중...';

    await fetchExchangeRate();

    // Fetch Indices
    for (const idx of state.indices) {
        const d = await fetchYahooQuote(idx.symbol);
        if (d) Object.assign(idx, d);
    }

    // Batch updates? For now simple loops
    for (const s of state.stocks) {
        const d = await fetchYahooQuote(s.symbol);
        if (d) Object.assign(s, d);
    }
    for (const c of state.cryptos) {
        const d = await fetchYahooQuote(c.yahooSymbol);
        if (d) Object.assign(c, d);
    }

    renderIndexTicker();
    renderAssetTable();
    renderMiniPortfolio();

    // Update currently visible tab data
    const activeTab = document.querySelector('.main-tab.tab-active')?.dataset.tab;
    if (activeTab === 'indices') renderIndicesGrid();
    if (activeTab === 'heatmap') renderHeatmap();
    if (activeTab === 'portfolio') renderPortfolio();
    if (activeTab === 'history') renderHistory();
    if (activeTab === 'analyst') renderCorrelationMatrix();

    // AI & Strategy Triggers
    updateSmartMoneyTracker();
    checkCustomStrategies();

    // Total Asset Calculation
    let totalStockValue = 0;
    for (const code in state.portfolio) {
        const item = state.portfolio[code];
        const asset = [...state.stocks, ...state.cryptos].find(a => a.code === code);
        if (asset) {
            totalStockValue += item.quantity * asset.price;
        }
    }
    const totalAsset = state.cash + totalStockValue;

    // Update Header UI
    document.getElementById('cashDisplay').textContent = formatKRW(state.cash);
    document.getElementById('totalAssetDisplay').textContent = formatKRW(totalAsset);

    const profitRate = ((totalAsset - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
    const profitEl = document.getElementById('profitRateDisplay');
    profitEl.textContent = `${profitRate >= 0 ? '+' : ''}${profitRate.toFixed(2)}%`;
    profitEl.className = `text-lg font-bold number-font ${profitRate >= 0 ? 'text-red-400' : 'text-blue-400'}`;

    // Update Connection Status
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
        statusEl.textContent = '실시간 (Live)';
        statusEl.classList.add('text-green-400');
        statusEl.classList.remove('text-red-400', 'text-slate-400');
        const pulse = document.querySelector('.live-pulse');
        if (pulse) {
            pulse.classList.remove('bg-red-500', 'bg-slate-500');
            pulse.classList.add('bg-green-500');
        }
    }

    if (btn) btn.textContent = '새로고침';
}

function saveGame() {
    localStorage.setItem('stockSimPro', JSON.stringify({
        cash: state.cash,
        portfolio: state.portfolio,
        favorites: state.favorites,
        transactions: state.transactions
    }));
}

function loadGame() {
    const s = localStorage.getItem('stockSimPro');
    if (s) {
        const d = JSON.parse(s);
        state.cash = d.cash || INITIAL_CAPITAL;
        state.portfolio = d.portfolio || {};
        state.favorites = d.favorites || [];
        state.transactions = d.transactions || [];
    }
}

// === Welcome Hook (Why This Site) ===
function checkWelcome() {
    if (!localStorage.getItem('welcomeSeen')) {
        document.getElementById('welcomeModal').classList.remove('hidden');
    }
}

window.closeWelcome = () => {
    document.getElementById('welcomeModal').classList.add('hidden');
    localStorage.setItem('welcomeSeen', 'true');
    showToast('🎉 환영합니다! 보너스 100만원이 지급되었습니다.', 'success');
    state.cash += 1000000;
    saveGame();
    refreshAllData();
};

// init
window.addEventListener('load', async () => {
    loadGame();

    // Populate Chart Selects
    const chartSelect = document.getElementById('chartSymbolSelect');
    const compareSelect = document.getElementById('compareSymbolSelect');
    const btSelect = document.getElementById('backtestSymbol');
    const allAssets = [...state.stocks, ...state.cryptos];

    allAssets.forEach(a => {
        const createOpt = () => {
            const opt = document.createElement('option');
            opt.value = a.code;
            opt.textContent = a.name;
            return opt;
        };

        if (chartSelect) chartSelect.appendChild(createOpt());
        if (compareSelect) compareSelect.appendChild(createOpt());
        if (btSelect) btSelect.appendChild(createOpt());
    });

    await refreshAllData();
    fetchNews();
    checkWelcome();
    loadJournal();
});

window.addEventListener('resize', () => {
    if (typeof resizeCharts === 'function') resizeCharts();
    if (typeof resizeBTChart === 'function') resizeBTChart();
});
