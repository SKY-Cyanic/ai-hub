// js/ui.js
import { state } from './state.js';
import { formatKRW, formatPrice } from './utils.js';

export function renderIndexTicker() {
    const container = document.getElementById('indexTicker');
    if (!container) return; // Guard clause

    container.innerHTML = state.indices.map(idx => {
        const color = idx.change >= 0 ? 'text-red-500' : 'text-blue-500'; // Using Tailwind colors
        const sign = idx.change >= 0 ? '▲' : '▼';
        return `
            <div class="flex-shrink-0 bg-slate-800 rounded-lg px-4 py-2 border border-slate-700 min-w-[150px]">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-slate-300 text-xs">${idx.country} ${idx.name}</span>
                </div>
                <div class="flex items-end justify-between">
                    <span class="font-bold text-lg number-font tracking-tight text-white">${idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div class="${color} text-xs font-medium flex items-center gap-1 mt-1">
                    <span>${sign}${Math.abs(idx.change).toFixed(2)}</span>
                    <span class="opacity-75">(${sign}${Math.abs(idx.changePercent).toFixed(2)}%)</span>
                </div>
            </div>
        `;
    }).join('');
}

export function renderAssetTable() {
    const tbody = document.getElementById('assetTableBody');
    if (!tbody) return;

    let targetAssets = state.currentAssetType === 'stocks' ? state.stocks : state.cryptos;

    if (state.currentAssetType === 'stocks' && state.currentMarket !== 'all' && state.currentMarket !== 'favorites') {
        targetAssets = targetAssets.filter(a => a.market === state.currentMarket);
    }
    if (state.currentMarket === 'favorites') {
        targetAssets = [...state.stocks, ...state.cryptos].filter(a => state.favorites.includes(a.code));
    }

    const search = document.getElementById('searchInput')?.value?.toLowerCase();
    if (search) {
        targetAssets = targetAssets.filter(a =>
            a.name.toLowerCase().includes(search) ||
            a.code.toLowerCase().includes(search) ||
            a.sector.toLowerCase().includes(search)
        );
    }

    tbody.innerHTML = targetAssets.map(asset => {
        const changeClass = asset.change >= 0 ? 'price-up' : 'price-down';
        const sign = asset.change >= 0 ? '+' : '';
        const marketColor = asset.market === 'KOSPI' ? 'bg-blue-600' : (asset.market === 'KOSDAQ' ? 'bg-green-600' : 'bg-purple-600');
        const isFav = state.favorites.includes(asset.code);

        // Flash Logic (Requires DOM element check, but here we rebuild HTML)
        // Ideally we would update existing rows, but for simplicity we rebuild.

        return `
        <tr class="cursor-pointer border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors" onclick="window.selectAsset('${asset.code}')">
            <td class="px-4 py-3">
                <button onclick="event.stopPropagation(); window.toggleFavorite('${asset.code}')" class="hover:scale-110 transition">
                    ${isFav ? '⭐' : '☆'}
                </button>
            </td>
            <td class="px-4 py-3">
                <div>
                    <div class="font-bold text-white flex items-center gap-2">
                        ${asset.name}
                        <span class="text-[10px] px-1.5 py-0.5 rounded ${marketColor} text-white opacity-80">${asset.market}</span>
                    </div>
                    <div class="text-xs text-slate-400 mt-0.5">${asset.code} · ${asset.sector}</div>
                </div>
            </td>
            <td class="px-4 py-3 text-right">
                <div class="font-bold number-font text-white">${formatPrice(asset.price, asset.market)}</div>
            </td>
            <td class="px-4 py-3 text-right">
                <div class="${changeClass} font-medium number-font">${sign}${formatPrice(asset.change, asset.market)}</div>
                <div class="${changeClass} text-xs opacity-75 number-font">(${sign}${asset.changePercent.toFixed(2)}%)</div>
            </td>
            <td class="px-4 py-3 text-right hidden md:table-cell">
                <div class="text-slate-400 text-sm number-font">${(asset.volume / 1000).toFixed(0)}K</div>
            </td>
            <td class="px-4 py-3 text-right">
                 <div class="flex gap-2 justify-end">
                    <button onclick="event.stopPropagation(); window.openTradeModal('${asset.code}', 'buy')" class="bg-red-600/20 text-red-400 border border-red-900/50 px-3 py-1.5 rounded hover:bg-red-600/40 text-xs font-bold">매수</button>
                    <button onclick="event.stopPropagation(); window.openTradeModal('${asset.code}', 'sell')" class="bg-blue-600/20 text-blue-400 border border-blue-900/50 px-3 py-1.5 rounded hover:bg-blue-600/40 text-xs font-bold">매도</button>
                    <button onclick="event.stopPropagation(); window.openAlertModal('${asset.code}')" class="text-slate-400 hover:text-yellow-400">🔔</button>
                 </div>
            </td>
        </tr>`;
    }).join('');
}

export function renderMiniPortfolio() {
    const container = document.getElementById('miniPortfolio');
    if (!container) return;

    if (Object.keys(state.portfolio).length === 0) {
        container.innerHTML = '<div class="text-slate-500 text-center text-sm py-4">보유 자산 없음</div>';
        return;
    }

    container.innerHTML = `<div class="p-2 space-y-2" id="miniPortfolioList">` +
        Object.entries(state.portfolio).map(([code, data]) => {
            const asset = [...state.stocks, ...state.cryptos].find(a => a.code === code);
            if (!asset) return '';
            const curPrice = asset.price;
            const profitRate = ((curPrice - data.avgPrice) / data.avgPrice) * 100;
            const cls = profitRate >= 0 ? 'text-red-400' : 'text-blue-400';

            return `
            <div class="flex justify-between items-center p-2 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition cursor-pointer" onclick="window.selectAsset('${asset.code}')">
                <div>
                    <div class="font-bold text-sm text-slate-200">${asset.name}</div>
                    <div class="text-xs text-slate-500">${data.quantity.toLocaleString()}주</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-sm text-slate-200">${formatPrice(curPrice * data.quantity, asset.market)}</div>
                    <div class="text-xs ${cls}">${profitRate >= 0 ? '+' : ''}${profitRate.toFixed(2)}%</div>
                </div>
            </div>`;
        }).join('') + `</div>`;
}

export function renderIndicesGrid() {
    const container = document.getElementById('indicesGrid');
    if (!container) return;

    container.innerHTML = state.indices.map(idx => {
        const color = idx.change >= 0 ? 'text-red-500' : 'text-blue-500';
        const sign = idx.change >= 0 ? '▲' : '▼';
        return `
            <div class="card p-4 hover:border-slate-500 transition cursor-pointer" onclick="window.selectIndex('${idx.symbol}')">
                <div class="text-slate-400 text-xs mb-1">${idx.country}</div>
                <div class="font-bold mb-2">${idx.name}</div>
                <div class="text-xl font-black number-font">${idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div class="${color} text-sm font-medium mt-1">
                    ${sign}${Math.abs(idx.change).toFixed(2)} (${idx.changePercent.toFixed(2)}%)
                </div>
            </div>
        `;
    }).join('');

    // Update Select Dropdown
    const select = document.getElementById('indexChartSelect');
    if (select && select.options.length <= 1) {
        state.indices.forEach(idx => {
            const opt = document.createElement('option');
            opt.value = idx.symbol;
            opt.textContent = `${idx.country} ${idx.name}`;
            select.appendChild(opt);
        });
    }
}

let heatmapChart = null;
export function renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container || typeof ApexCharts === 'undefined') return;

    container.innerHTML = '';

    let assets = state.currentHeatmapType === 'stocks' ? state.stocks : state.cryptos;
    const market = document.getElementById('heatmapMarket').value;
    if (market !== 'all') {
        assets = assets.filter(a => a.market === market);
    }

    // Sort by Market Cap
    assets = assets.sort((a, b) => b.marketCap - a.marketCap).slice(0, 50);

    const series = [{
        data: assets.map(a => ({
            x: a.name,
            y: a.marketCap || 1, // 시가총액을 크기로 사용 (없을 경우 1)
            change: a.changePercent || 0 // 변동률은 별도 저장
        }))
    }];

    const options = {
        series: series,
        legend: { show: false },
        chart: { height: 600, type: 'treemap', toolbar: { show: false }, background: 'transparent' },
        theme: { mode: 'dark' },
        colors: ['#ef4444', '#3b82f6'], // Red for +, Blue for -
        plotOptions: {
            treemap: {
                distributed: true,
                enableShades: false, // 커스텀 컬러 사용을 위해 끎
                colorScale: {
                    ranges: [
                        { from: -100, to: -3, color: '#1e3a8a' }, // Deep Blue
                        { from: -3, to: -0.1, color: '#3b82f6' }, // Blue
                        { from: -0.1, to: 0.1, color: '#475569' }, // Gray
                        { from: 0.1, to: 3, color: '#ef4444' }, // Red
                        { from: 3, to: 100, color: '#991b1b' } // Deep Red
                    ]
                }
            }
        },
        dataLabels: {
            enabled: true,
            style: { fontSize: '12px', fontWeight: 'bold' },
            formatter: (text, op) => {
                const change = op.value < 1000 ? op.value : (assets.find(a => a.name === text)?.changePercent || 0);
                // ApexCharts Treemap에서 y값(시총)이 너무 크면 value로 표시되므로 
                // dataLabels에서 실제 변동률을 찾아 표시하도록 수정
                const asset = assets.find(a => a.name === text);
                return `${text}\n${asset ? asset.changePercent.toFixed(2) : '0.00'}%`;
            }
        },
        tooltip: {
            y: {
                formatter: (val, { seriesIndex, dataPointIndex, w }) => {
                    const asset = assets[dataPointIndex];
                    return `시가총액: ${formatKRW(val)} | 변동률: ${asset.changePercent.toFixed(2)}%`;
                }
            }
        }
    };

    if (heatmapChart) heatmapChart.destroy();
    heatmapChart = new ApexCharts(container, options);
    heatmapChart.render();
}

let portfolioPie = null;
export function renderPortfolio() {
    const detail = document.getElementById('portfolioDetail');
    if (!detail) return;

    const entries = Object.entries(state.portfolio);
    if (entries.length === 0) {
        detail.innerHTML = '<div class="text-slate-500 text-center py-12">보유 종목이 없습니다</div>';
        return;
    }

    let totalStockValue = 0;
    let totalProfit = 0;

    const html = entries.map(([code, data]) => {
        const asset = [...state.stocks, ...state.cryptos].find(a => a.code === code);
        if (!asset) return '';
        const curPrice = asset.price;
        const totalVal = curPrice * data.quantity;
        const profit = (curPrice - data.avgPrice) * data.quantity;
        const profitRate = ((curPrice - data.avgPrice) / data.avgPrice) * 100;
        const cls = profit >= 0 ? 'text-red-400' : 'text-blue-400';

        totalStockValue += totalVal;
        totalProfit += profit;

        return `
            <div class="p-4 border-b border-slate-700/50 hover:bg-slate-800 transition">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="font-bold text-lg">${asset.name}</span>
                        <span class="text-xs text-slate-500 ml-2">${code}</span>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-lg">${formatPrice(totalVal, asset.market)}</div>
                        <div class="${cls} font-medium">${profitRate >= 0 ? '+' : ''}${formatKRW(profit)} (${profitRate.toFixed(2)}%)</div>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-4 text-xs text-slate-400">
                    <div>보유량: <span class="text-slate-200">${data.quantity.toLocaleString()}주</span></div>
                    <div>평균단가: <span class="text-slate-200">${formatPrice(data.avgPrice, asset.market)}</span></div>
                    <div>현재가: <span class="text-slate-200">${formatPrice(curPrice, asset.market)}</span></div>
                </div>
            </div>
        `;
    }).join('');

    detail.innerHTML = html;

    // Update Summary
    const totalAsset = state.cash + totalStockValue;
    const initial = state.cash + totalStockValue - totalProfit; // Simplified
    const totalProfitRate = ((totalAsset - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;

    document.getElementById('portCash').textContent = formatKRW(state.cash);
    document.getElementById('portStock').textContent = formatKRW(totalStockValue);
    document.getElementById('portTotal').textContent = formatKRW(totalAsset);
    document.getElementById('portProfit').textContent = formatKRW(totalAsset - INITIAL_CAPITAL);
    const prEl = document.getElementById('portProfitRate');
    prEl.textContent = `(${totalProfitRate >= 0 ? '+' : ''}${totalProfitRate.toFixed(2)}%)`;
    prEl.className = `text-lg font-bold mt-1 ${totalProfitRate >= 0 ? 'text-red-400' : 'text-blue-400'}`;

    // Pie Chart
    const ctx = document.getElementById('portfolioPieChart');
    if (ctx && typeof Chart !== 'undefined') {
        const labels = ['현금', ...entries.map(([code]) => {
            const asset = [...state.stocks, ...state.cryptos].find(a => a.code === code);
            return asset ? asset.name : code;
        })];
        const data = [state.cash, ...entries.map(([code, d]) => {
            const asset = [...state.stocks, ...state.cryptos].find(a => a.code === code);
            return asset ? asset.price * d.quantity : 0;
        })];

        if (portfolioPie) portfolioPie.destroy();
        portfolioPie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#475569', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } }
            }
        });
    }
}

export function renderHistory() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    if (state.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-12 text-slate-500">거래 내역이 없습니다</td></tr>';
        return;
    }

    const filter = document.getElementById('historyFilter').value;
    let list = state.transactions;
    if (filter !== 'all') list = list.filter(t => t.type === filter);

    tbody.innerHTML = list.map(t => {
        const typeCls = t.type === 'buy' ? 'text-red-400' : 'text-blue-400';
        const typeText = t.type === 'buy' ? '매수' : '매도';
        return `
            <tr class="border-b border-slate-700/30">
                <td class="px-4 py-3 text-slate-400 text-xs">${new Date(t.time).toLocaleString()}</td>
                <td class="px-4 py-3 font-bold ${typeCls}">${typeText}</td>
                <td class="px-4 py-3 font-medium">${t.name}</td>
                <td class="px-4 py-3 text-right number-font">${formatPrice(t.price, t.market)}</td>
                <td class="px-4 py-3 text-right number-font">${t.quantity.toLocaleString()}</td>
                <td class="px-4 py-3 text-right font-bold number-font">${formatPrice(t.total, t.market)}</td>
            </tr>
        `;
    }).reverse().join('');

    // Update Stats
    const totalTrades = state.transactions.length;
    const buyTotal = state.transactions.filter(t => t.type === 'buy').reduce((sum, t) => sum + t.total, 0);
    const sellTotal = state.transactions.filter(t => t.type === 'sell').reduce((sum, t) => sum + t.total, 0);

    document.getElementById('statTotalTrades').textContent = `${totalTrades}회`;
    document.getElementById('statTotalBuy').textContent = formatKRW(buyTotal);
    document.getElementById('statTotalSell').textContent = formatKRW(sellTotal);
    document.getElementById('statRealizedPL').textContent = formatKRW(sellTotal - buyTotal); // Rough simplified
}

import { addJournalEntry } from './journal.js';
import { showToast } from './utils.js';

export function openTradeModal(code, type) {
    const asset = [...state.stocks, ...state.cryptos].find(a => a.code === code);
    if (!asset) return;

    const modal = document.getElementById('tradeModal');
    const content = document.getElementById('modalContent');
    const title = document.getElementById('modalTitle');

    title.innerText = `${asset.name} (${code}) ${type === 'buy' ? '매수' : '매도'}`;
    content.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between text-sm">
                <span class="text-slate-400">현재가</span>
                <span class="font-bold">${formatPrice(asset.price, asset.market)}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span class="text-slate-400">${type === 'buy' ? '주문 가능 금액' : '보유 수량'}</span>
                <span class="font-bold text-white">
                    ${type === 'buy' ? formatKRW(state.cash) : (state.portfolio[code]?.quantity || 0).toLocaleString() + '주'}
                </span>
            </div>
            <div>
                <label class="block text-xs text-slate-500 mb-1">수량</label>
                <input type="number" id="tradeQty" value="1" min="1" class="w-full bg-slate-700 border-slate-600 rounded px-3 py-2 text-lg font-bold" oninput="window.updateTradeTotal(${asset.price}, '${asset.market}')">
            </div>
            <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div class="flex justify-between text-xs text-slate-500 mb-1">
                    <span>예상 총액</span>
                </div>
                <div class="text-xl font-bold text-right" id="tradeTotal">${formatPrice(asset.price, asset.market)}</div>
            </div>
            <button onclick="window.confirmTrade('${code}', '${type}')" 
                class="w-full py-3 rounded-lg font-bold text-white transition ${type === 'buy' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}">
                ${type === 'buy' ? '매수하기' : '매도하기'}
            </button>
        </div>
    `;

    modal.classList.remove('hidden');
}

window.updateTradeTotal = (price, market) => {
    const qty = parseInt(document.getElementById('tradeQty').value) || 0;
    document.getElementById('tradeTotal').innerText = formatPrice(price * qty, market);
};

window.confirmTrade = (code, type) => {
    const asset = [...state.stocks, ...state.cryptos].find(a => a.code === code);
    const qty = parseInt(document.getElementById('tradeQty').value) || 0;
    if (qty <= 0) return;

    const price = asset.price;
    const priceKRW = asset.market === 'NASDAQ' ? price * state.USD_TO_KRW : price;
    const totalKRW = priceKRW * qty;

    if (type === 'buy') {
        if (state.cash < totalKRW) {
            showToast('잔액이 부족합니다.', 'error');
            return;
        }
        state.cash -= totalKRW;
        if (!state.portfolio[code]) state.portfolio[code] = { quantity: 0, avgPrice: 0 };
        const p = state.portfolio[code];
        p.avgPrice = (p.avgPrice * p.quantity + price) / (p.quantity + qty);
        p.quantity += qty;
    } else {
        const p = state.portfolio[code];
        if (!p || p.quantity < qty) {
            showToast('보유 수량이 부족합니다.', 'error');
            return;
        }
        state.cash += totalKRW;
        p.quantity -= qty;
        if (p.quantity === 0) delete state.portfolio[code];
    }

    const trade = {
        type, code, name: asset.name, market: asset.market,
        price, quantity: qty, total: price * qty, time: Date.now()
    };
    state.transactions.push(trade);
    addJournalEntry(trade); // 스마트 일지 기록

    showToast(`${asset.name} ${qty}주 ${type === 'buy' ? '매수' : '매도'} 완료`, 'success');
    document.getElementById('tradeModal').classList.add('hidden');

    // UI Refresh (handled in main.js but we can trigger it)
    if (window.refreshAllData) window.refreshAllData();
};

window.closeModal = () => {
    document.getElementById('tradeModal').classList.add('hidden');
};
