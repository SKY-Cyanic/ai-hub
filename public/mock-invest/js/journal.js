// js/journal.js
import { state } from './state.js';
import { formatKRW, formatPrice } from './utils.js';

/**
 * 12. 자동 매매 일지 (Auto Journaling)
 * 매매 시점의 지표 상태를 함께 기록합니다.
 */
export function addJournalEntry(trade) {
    const asset = [...state.stocks, ...state.cryptos].find(a => a.code === trade.code);
    const entry = {
        ...trade,
        id: Date.now(),
        context: {
            rsi: asset?.rsi || 'N/A',
            sma20: asset?.sma20 || 'N/A',
            priceChange: asset?.changePercent || 0,
            marketMood: getMarketMood(asset)
        },
        notes: ''
    };

    if (!state.journal) state.journal = [];
    state.journal.push(entry);
    saveJournal();
}

export function renderJournal() {
    const list = document.getElementById('journalList');
    if (!state.journal || state.journal.length === 0) {
        list.innerHTML = '<div class="text-slate-500 text-center py-12">기록된 매매 일지가 없습니다.</div>';
        return;
    }

    list.innerHTML = state.journal.map(j => `
        <div class="bg-slate-800/50 rounded-xl border border-slate-700 p-5 hover:border-blue-500/50 transition cursor-pointer" onclick="viewJournalDetail(${j.id})">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <span class="text-xs text-slate-500">${new Date(j.time).toLocaleString()}</span>
                    <h3 class="font-bold text-lg">${j.name} (${j.code})</h3>
                </div>
                <span class="px-3 py-1 rounded text-xs font-bold ${j.type === 'buy' ? 'bg-red-900/40 text-red-400' : 'bg-blue-900/40 text-blue-400'}">
                    ${j.type === 'buy' ? '매수' : '매도'}
                </span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center text-xs">
                <div class="bg-slate-900/50 p-2 rounded">
                    <p class="text-slate-500 mb-1">매매가</p>
                    <p class="font-bold">${formatPrice(j.price, j.market)}</p>
                </div>
                <div class="bg-slate-900/50 p-2 rounded">
                    <p class="text-slate-500 mb-1">RSI</p>
                    <p class="font-bold text-purple-400">${typeof j.context.rsi === 'number' ? j.context.rsi.toFixed(1) : j.context.rsi}</p>
                </div>
                <div class="bg-slate-900/50 p-2 rounded">
                    <p class="text-slate-500 mb-1">시장 분위기</p>
                    <p class="font-bold text-yellow-500">${j.context.marketMood}</p>
                </div>
            </div>
        </div>
    `).reverse().join('');
}

window.viewJournalDetail = (id) => {
    const entry = state.journal.find(j => j.id === id);
    if (!entry) return;

    // 단순 알러트로 상세 표시 (추후 모달 등 확장 가능)
    alert(`[매매 일지 상세]
종목: ${entry.name}
유형: ${entry.type === 'buy' ? '매수' : '매도'}
수량: ${entry.quantity}
당시 RSI: ${entry.context.rsi}
당시 시장 상황: ${entry.context.marketMood}
메모: ${entry.notes || '없음'}`);
};

function getMarketMood(asset) {
    if (!asset) return '불명';
    if (asset.rsi > 70) return '🧠 광기 (과매수)';
    if (asset.rsi < 30) return '😨 공포 (과매도)';
    if (asset.changePercent > 3) return '🚀 급등 중';
    if (asset.changePercent < -3) return '📉 급락 중';
    return '😐 횡보/안정';
}

function saveJournal() {
    localStorage.setItem('stockSimJournal', JSON.stringify(state.journal));
}

export function loadJournal() {
    const data = localStorage.getItem('stockSimJournal');
    if (data) state.journal = JSON.parse(data);
}
