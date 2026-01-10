// js/charts.js
import { state } from './state.js';
import { fetchWithProxy } from './api.js';
import { predictPrice } from './ai.js';
import { formatKRW, formatPrice, showToast } from './utils.js';

let mainChart = null;
let volChart = null;
let comparisonSeries = [];
const compColors = ['#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];

export async function loadChart() {
    const select = document.getElementById('chartSymbolSelect');
    const symbol = select.value;
    if (!symbol) return;

    const asset = [...state.stocks, ...state.cryptos].find(a => a.code === symbol);
    if (!asset) return;

    // Chart Range Logic (Added 'MAX' support)
    let range, interval;
    switch (state.currentChartPeriod) {
        case '1D': range = '1d'; interval = '5m'; break;
        case '1W': range = '5d'; interval = '15m'; break;
        case '1M': range = '1mo'; interval = '1h'; break;
        case '3M': range = '3mo'; interval = '1d'; break;
        case '1Y': range = '1y'; interval = '1d'; break;
        case '5Y': range = '5y'; interval = '1wk'; break;
        case 'MAX': range = 'max'; interval = '1mo'; break; // New MAX Range
        default: range = '1mo'; interval = '1h';
    }

    // UI Update
    const info = document.getElementById('chartInfo');
    const placeholder = document.getElementById('chartPlaceholder');
    if (info) info.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');

    const titleEl = document.getElementById('chartTitle');
    const priceEl = document.getElementById('chartPrice');
    const changeEl = document.getElementById('chartChange');
    const descEl = document.getElementById('chartDesc');

    if (titleEl) titleEl.textContent = asset.name;
    if (priceEl) priceEl.textContent = formatPrice(asset.price, asset.market);
    if (changeEl) {
        const sign = asset.change >= 0 ? '+' : '';
        changeEl.textContent = `${sign}${formatPrice(asset.change, asset.market)} (${sign}${asset.changePercent.toFixed(2)}%)`;
        changeEl.className = `text-xl font-bold ${asset.change >= 0 ? 'text-red-400' : 'text-blue-400'}`;
    }
    if (descEl) descEl.textContent = asset.desc || '';

    // Update Period Buttons
    document.querySelectorAll('.period-btn').forEach(b => {
        if (b.dataset.period === state.currentChartPeriod) {
            b.classList.remove('bg-slate-700');
            b.classList.add('bg-blue-600');
        } else {
            b.classList.add('bg-slate-700');
            b.classList.remove('bg-blue-600');
        }
    });

    let chartData = [];
    const querySymbol = asset.symbol || asset.yahooSymbol;

    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${querySymbol}?interval=${interval}&range=${range}`;
        const data = await fetchWithProxy(url);
        const result = data?.chart?.result?.[0];

        if (result && result.timestamp) {
            const quotes = result.indicators.quote[0];
            chartData = result.timestamp.map((t, i) => ({
                time: t,
                open: quotes.open[i],
                high: quotes.high[i],
                low: quotes.low[i],
                close: quotes.close[i],
                volume: quotes.volume[i]
            })).filter(d => d.close != null && d.open != null);
        }
    } catch (e) {
        console.error('Chart load error:', e);
    }

    renderCharts(chartData);
}

let indexChart = null;
export async function loadIndexChart() {
    const symbol = document.getElementById('indexChartSelect').value;
    if (!symbol) return;

    let range, interval;
    switch (state.currentIndexPeriod) {
        case '1D': range = '1d'; interval = '5m'; break;
        case '1W': range = '5d'; interval = '15m'; break;
        case '1M': range = '1mo'; interval = '1h'; break;
        case '3M': range = '3mo'; interval = '1d'; break;
        case '1Y': range = '1y'; interval = '1d'; break;
        default: range = '1mo'; interval = '1h';
    }

    // Update Buttons
    document.querySelectorAll('.idx-period-btn').forEach(b => {
        if (b.dataset.period === state.currentIndexPeriod) {
            b.classList.remove('bg-slate-700');
            b.classList.add('bg-blue-600');
        } else {
            b.classList.add('bg-slate-700');
            b.classList.remove('bg-blue-600');
        }
    });

    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
        const data = await fetchWithProxy(url);
        const result = data?.chart?.result?.[0];

        if (result && result.timestamp) {
            const quotes = result.indicators.quote[0];
            const chartData = result.timestamp.map((t, i) => ({
                time: t,
                value: quotes.close[i]
            })).filter(d => d.value != null);

            const container = document.getElementById('indexChartContainer');
            if (indexChart) indexChart.remove();
            container.innerHTML = '';

            indexChart = LightweightCharts.createChart(container, {
                width: container.clientWidth,
                height: 400,
                layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
                grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
                timeScale: { borderColor: '#334155' },
                rightPriceScale: { borderColor: '#334155' }
            });

            const series = indexChart.addAreaSeries({
                topColor: 'rgba(59, 130, 246, 0.4)',
                bottomColor: 'rgba(59, 130, 246, 0.0)',
                lineColor: '#3b82f6', lineWidth: 2
            });
            series.setData(chartData);
            indexChart.timeScale().fitContent();
        }
    } catch (e) {
        console.error('Index chart error:', e);
    }
}

function renderCharts(chartData) {
    const container = document.getElementById('tradingChart');
    const volumeContainer = document.getElementById('volumeChart');
    if (!container || !volumeContainer) return;

    // Clear previous comparisons
    comparisonSeries = [];
    const compSelect = document.getElementById('compareSymbolSelect');
    if (compSelect) compSelect.value = "";

    container.innerHTML = '';
    volumeContainer.innerHTML = '';

    if (mainChart) { try { mainChart.remove(); } catch (e) { } }
    if (volChart) { try { volChart.remove(); } catch (e) { } }

    mainChart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 500,
        layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
        timeScale: { timeVisible: true, borderColor: '#334155' },
        rightPriceScale: { borderColor: '#334155' },
        crosshair: { mode: 1 }
    });

    let series;
    if (state.currentChartType === 'candle') {
        series = mainChart.addCandlestickSeries({
            upColor: '#ef4444', downColor: '#3b82f6',
            borderUpColor: '#ef4444', borderDownColor: '#3b82f6',
            wickUpColor: '#ef4444', wickDownColor: '#3b82f6'
        });
        series.setData(chartData);
    } else if (state.currentChartType === 'line') {
        series = mainChart.addLineSeries({ color: '#3b82f6', lineWidth: 2 });
        series.setData(chartData.map(d => ({ time: d.time, value: d.close })));
    } else {
        series = mainChart.addAreaSeries({
            topColor: 'rgba(59, 130, 246, 0.4)',
            bottomColor: 'rgba(59, 130, 246, 0.0)',
            lineColor: '#3b82f6', lineWidth: 2
        });
        series.setData(chartData.map(d => ({ time: d.time, value: d.close })));
    }

    volChart = LightweightCharts.createChart(volumeContainer, {
        width: volumeContainer.clientWidth, height: 120,
        layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
        timeScale: { visible: false },
        rightPriceScale: { borderColor: '#334155' }
    });

    const volumeSeries = volChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
    volumeSeries.setData(chartData.map(d => ({
        time: d.time, value: d.volume,
        color: d.close >= d.open ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'
    })));

    mainChart.timeScale().fitContent();
    volChart.timeScale().fitContent();

    predictPrice(chartData);
}

export function resizeCharts() {
    if (mainChart) mainChart.applyOptions({ width: document.getElementById('tradingChart').clientWidth });
    if (volChart) volChart.applyOptions({ width: document.getElementById('volumeChart').clientWidth });
    if (indexChart) indexChart.applyOptions({ width: document.getElementById('indexChartContainer').clientWidth });
}

export async function addComparison(code) {
    if (!code) return;
    const asset = [...state.stocks, ...state.cryptos].find(a => a.code === code);
    if (!asset || !mainChart) return;

    let range, interval;
    switch (state.currentChartPeriod) {
        case '1D': range = '1d'; interval = '5m'; break;
        case '1W': range = '5d'; interval = '15m'; break;
        case '1M': range = '1mo'; interval = '1h'; break;
        case '3M': range = '3mo'; interval = '1d'; break;
        case '1Y': range = '1y'; interval = '1d'; break;
        case '5Y': range = '5y'; interval = '1wk'; break;
        case 'MAX': range = 'max'; interval = '1mo'; break;
        default: range = '1mo'; interval = '1h';
    }

    try {
        const symbol = asset.symbol || asset.yahooSymbol;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
        const data = await fetchWithProxy(url);
        const result = data?.chart?.result?.[0];

        if (result && result.timestamp) {
            const quotes = result.indicators.quote[0];
            const lineData = result.timestamp.map((t, i) => ({
                time: t,
                value: quotes.close[i]
            })).filter(d => d.value != null);

            if (comparisonSeries.length === 0) {
                mainChart.priceScale('right').applyOptions({ mode: 2 });
            }

            const color = compColors[comparisonSeries.length % compColors.length];
            const series = mainChart.addLineSeries({
                color, lineWidth: 2, title: asset.name, priceScaleId: 'right'
            });
            series.setData(lineData);
            comparisonSeries.push(series);
        }
    } catch (e) {
        showToast('❌ 비교 데이터 로드 실패');
    }
}

export function clearComparisons() {
    comparisonSeries.forEach(s => mainChart.removeSeries(s));
    comparisonSeries = [];
    if (mainChart) {
        mainChart.priceScale('right').applyOptions({ mode: 0 });
    }
    const sel = document.getElementById('compareSymbolSelect');
    if (sel) sel.value = "";
}
