// js/strategy.js
import { state } from './state.js';
import { showToast, calculateSMA } from './utils.js';

/**
 * 10. 노코드 전략 빌더
 * 사용자가 설정한 기술적 조건을 모니터링하고 신호를 발생시킵니다.
 */
export function saveCustomStrategy() {
    const indicator = document.querySelector('.strategy-indicator').value;
    const operator = document.querySelector('.strategy-op').value;
    const value = parseFloat(document.querySelector('.strategy-val').value);

    const newStrategy = {
        id: Date.now(),
        indicator,
        operator,
        value,
        active: true
    };

    if (!state.customStrategies) state.customStrategies = [];
    state.customStrategies.push(newStrategy);

    showToast('새로운 전략이 저장되고 활성화되었습니다.', 'success');
    renderActiveStrategies();
}

export function renderActiveStrategies() {
    const list = document.getElementById('strategySignals');
    if (!state.customStrategies || state.customStrategies.length === 0) {
        list.innerHTML = '활성화된 전략이 없습니다.';
        return;
    }

    list.innerHTML = state.customStrategies.map(s => `
        <div class="flex justify-between items-center p-2 bg-slate-700/50 rounded border border-slate-600 mb-2">
            <span>${s.indicator.toUpperCase()} ${getOpText(s.operator)} ${s.value}</span>
            <button onclick="deleteStrategy(${s.id})" class="text-red-400 hover:text-red-300">🗑️</button>
        </div>
    `).join('');
}

window.deleteStrategy = (id) => {
    state.customStrategies = state.customStrategies.filter(s => s.id !== id);
    renderActiveStrategies();
};

/**
 * 전 종목에 대해 활성 전략 조건 검사
 */
export function checkCustomStrategies() {
    if (!state.customStrategies || state.customStrategies.length === 0) return;

    const allAssets = [...state.stocks, ...state.cryptos];
    const signalsList = document.getElementById('strategySignals');
    let signalFound = false;

    allAssets.forEach(asset => {
        state.customStrategies.forEach(s => {
            let triggered = false;
            const currentVal = getIndicatorValue(asset, s.indicator);

            if (currentVal === null) return;

            switch (s.operator) {
                case 'lt': triggered = currentVal < s.value; break;
                case 'gt': triggered = currentVal > s.value; break;
                case 'cross_up':
                    // 단순화를 위해 현재값이 기준값을 막 넘어섰을 때로 가정
                    // 실제 구현에는 이전값과의 비교가 필요함
                    triggered = currentVal >= s.value && (asset.prevPrice || asset.price) < s.value;
                    break;
            }

            if (triggered) {
                if (!signalFound) {
                    // 처음 신호 발견 시 리스트 초기화는 안함 (누적 표시 가능성 때문)
                }
                showToast(`[신호 포착] ${asset.name}: ${s.indicator} 조건 충족!`, 'info');
                // 로그 기록 등 추가 액션 가능
                signalFound = true;
            }
        });
    });
}

function getIndicatorValue(asset, indicator) {
    if (indicator === 'price') return asset.price;
    if (indicator === 'rsi') return asset.rsi || null;
    if (indicator === 'sma20') return asset.sma20 || null;
    return null;
}

function getOpText(op) {
    switch (op) {
        case 'lt': return '미만';
        case 'gt': return '초과';
        case 'cross_up': return '상향돌파';
        default: return '';
    }
}
