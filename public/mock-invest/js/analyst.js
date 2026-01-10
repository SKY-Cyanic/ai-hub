// js/analyst.js
import { state } from './state.js';
import { fetchWithProxy } from './api.js';
import { calculateSMA, formatKRW, formatPrice } from './utils.js';

/**
 * 1. 패턴 매칭 (AI 기반 유사 차트 검색)
 * 현재 종목의 최근 30개 캔들 패턴과 유사한 과거 구간을 검색합니다.
 */
export async function runPatternMatching(symbol) {
    const container = document.getElementById('patternMatchingResult');
    container.innerHTML = '<div class="text-cyan-400 animate-pulse">패턴 분석 중...</div>';

    if (!symbol) {
        container.innerHTML = '<p class="text-yellow-400">먼저 차트 탭에서 분석할 종목을 선택해주세요.</p>';
        return;
    }

    try {
        // 데이터 범위를 동적으로 조정 (2년 -> 1년 -> 6개월)
        let ranges = ['2y', '1y', '6mo'];
        let result = null;
        let closes = [];

        for (let r of ranges) {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${r}`;
            const data = await fetchWithProxy(url);
            result = data?.chart?.result?.[0];
            if (result) {
                closes = result.indicators.quote[0].close.filter(c => c != null);
                if (closes.length >= 60) break; // 최소 60개(약 3개월) 데이터 확보 시 시도
            }
        }

        if (closes.length < 60) throw new Error('상장 기간이 너무 짧거나 데이터를 가져올 수 없습니다.');

        // 최근 30개 패턴 추출 및 정규화
        const windowSize = 30;
        const currentWindow = closes.slice(-windowSize);
        const currentNorm = normalize(currentWindow);

        let bestMatch = { score: -1, index: -1 };

        // 과거 데이터 스캐닝 (슬라이딩 윈도우)
        for (let i = 0; i < closes.length - windowSize * 2; i++) {
            const historyWindow = closes.slice(i, i + windowSize);
            const historyNorm = normalize(historyWindow);
            const score = calculateCorrelation(currentNorm, historyNorm);

            if (score > bestMatch.score) {
                bestMatch = { score, index: i };
            }
        }

        if (bestMatch.score > 0.7) {
            const matchDate = new Date(result.timestamp[bestMatch.index] * 1000).toLocaleDateString();
            const afterMatch = closes.slice(bestMatch.index + windowSize, bestMatch.index + windowSize + 10);
            const change = ((afterMatch[afterMatch.length - 1] - afterMatch[0]) / afterMatch[0] * 100).toFixed(2);

            container.innerHTML = `
                <div class="text-center space-y-4">
                    <div class="text-4xl text-cyan-400 font-black">${(bestMatch.score * 100).toFixed(1)}%</div>
                    <p class="text-sm">매칭 성공! <span class="text-white font-bold">${matchDate}</span> 인근 패턴과 매우 유사합니다.</p>
                    <div class="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <p class="text-xs text-slate-400 mb-1">과거 패턴 이후 10일간 흐름</p>
                        <p class="text-xl font-bold ${change >= 0 ? 'text-red-400' : 'text-blue-400'}">${change >= 0 ? '▲' : '▼'} ${change}%</p>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '<p class="text-slate-500">뚜렷하게 일치하는 과거 패턴을 찾지 못했습니다.</p>';
        }
    } catch (e) {
        container.innerHTML = `<p class="text-red-400">오류: ${e.message}</p>`;
    }
}

/**
 * 4. 이상 수급 감지기 (Smart Money Tracker)
 */
export function updateSmartMoneyTracker() {
    const list = document.getElementById('smartMoneyList');
    const alerts = [];

    const allAssets = [...state.stocks, ...state.cryptos];
    allAssets.forEach(a => {
        // 거래량이 평균 대비 300% 이상인 경우 또는 변동성이 극심한 경우
        if (a.volume > 0) {
            // 여기서는 단순 데모를 위해 고정 임계값 대신 랜덤 요소와 현재 상태 결합
            const isUnusual = Math.abs(a.changePercent) > 5;
            if (isUnusual) {
                alerts.push({
                    name: a.name,
                    code: a.code,
                    type: a.changePercent > 0 ? '매집' : '이탈',
                    value: a.changePercent
                });
            }
        }
    });

    if (alerts.length === 0) return;

    list.innerHTML = alerts.map(a => `
        <div class="flex justify-between items-center p-3 bg-slate-800/50 border-l-4 ${a.type === '매집' ? 'border-red-500' : 'border-blue-500'} rounded-r-xl">
            <div>
                <span class="font-bold">${a.name}</span>
                <span class="text-xs text-slate-500 ml-2">${a.code}</span>
            </div>
            <div class="${a.type === '매집' ? 'text-red-400' : 'text-blue-400'} font-black">
                ${a.type} 감지 (${a.value.toFixed(2)}%)
            </div>
        </div>
    `).join('');
}

/**
 * 21. 상관관계 분석 (Correlation Matrix)
 */
export async function renderCorrelationMatrix() {
    const container = document.getElementById('correlationMatrix');
    const entries = Object.keys(state.portfolio);

    if (entries.length < 2) {
        container.innerHTML = '<p class="text-slate-500">포트폴리오에 2개 이상의 종목이 있어야 분석이 가능합니다.</p>';
        return;
    }

    container.innerHTML = '<div class="text-cyan-400 animate-pulse">상관관계 계산 중...</div>';

    try {
        const assets = entries.map(code => [...state.stocks, ...state.cryptos].find(a => a.code === code)).filter(a => a);
        const dataMap = {};

        for (const a of assets) {
            const sym = a.symbol || a.yahooSymbol;
            const res = await fetchWithProxy(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1mo`);
            const quotes = res?.chart?.result?.[0]?.indicators?.quote[0]?.close.filter(c => c != null);
            if (quotes) dataMap[a.name] = normalize(quotes);
        }

        let html = '<table class="w-full text-xs text-center border-collapse"><thead><tr><th></th>';
        assets.forEach(a => { html += `<th class="p-2 border border-slate-700">${a.name}</th>`; });
        html += '</tr></thead><tbody>';

        assets.forEach(a1 => {
            html += `<tr><td class="p-2 border border-slate-700 font-bold">${a1.name}</td>`;
            assets.forEach(a2 => {
                const corr = calculateCorrelation(dataMap[a1.name], dataMap[a2.name]);
                const color = corr > 0.7 ? 'bg-red-900/40 text-red-200' : (corr < -0.3 ? 'bg-blue-900/40 text-blue-200' : 'bg-slate-800');
                html += `<td class="p-2 border border-slate-700 ${color}">${corr.toFixed(2)}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<p class="text-red-400">데이터 로드 실패: ${e.message}</p>`;
    }
}

/**
 * 22. AI 마스터 리브트 (Perplexity 스타일 종합 요약)
 */
export async function generateAIMasterReport() {
    const marketEl = document.getElementById('aiMarketSummary');
    const sectorEl = document.getElementById('aiSectorFocus');
    const riskEl = document.getElementById('aiRiskFactor');

    if (!marketEl) return;

    marketEl.innerHTML = '<div class="animate-pulse">데이터 수집 및 분석 중...</div>';
    sectorEl.innerHTML = '<div class="animate-pulse">키워드 추출 중...</div>';
    riskEl.innerHTML = '<div class="animate-pulse">리스크 평가 중...</div>';

    try {
        const { fetchNews } = await import('./api.js');
        const news = await fetchNews('stock market global economies');

        if (!news || news.length === 0) {
            marketEl.innerText = "현재 수집된 새로운 뉴스가 없습니다. 시장이 평온한 상태인 것 같습니다.";
            sectorEl.innerText = "특이 섹터 없음";
            riskEl.innerText = "낮음";
            return;
        }

        // 키워드 분석 (간이 NLP)
        const text = news.map(n => n.title).join(' ').toLowerCase();
        const keywords = {
            bull: ['up', 'rise', 'gain', 'growth', 'record', 'high', 'surge', 'rally', 'positive', '최고', '상승', '성장', '발표'],
            bear: ['down', 'drop', 'loss', 'fall', 'low', 'slump', 'crash', 'negative', '하락', '폭락', '우려', '부진'],
            tech: ['ai', 'nvidia', 'apple', 'semiconductor', 'chips', 'microsoft', 'tech', '반도체', '기술', '엔비디아'],
            macro: ['fed', 'rate', 'inflation', 'cpi', 'interest', 'economic', '금리', '인플레이션', '연준', '경제'],
            risk: ['debt', 'war', 'conflict', 'recession', 'uncertainty', 'threat', '위기', '전쟁', '경기침체', '불안']
        };

        const counts = {};
        Object.keys(keywords).forEach(k => {
            counts[k] = keywords[k].filter(word => text.includes(word)).length;
        });

        // 결과 도출 및 템플릿 적용
        let marketSummary = "";
        if (counts.bull > counts.bear) {
            marketSummary = "오늘의 시장은 전반적으로 긍정적인 에너지가 가득합니다. 주요 지수들이 강세를 보이며 투자 심리가 회복되는 추세입니다. ";
        } else if (counts.bear > counts.bull) {
            marketSummary = "현재 시장은 강한 하방 압력을 받고 있습니다. 주요 경제 지표 부진이나 대외 변수로 인해 보수적인 접근이 필요한 시점입니다. ";
        } else {
            marketSummary = "시장은 현재 뚜렷한 방향성 없이 횡보하고 있습니다. 다음 큰 변곡점을 기다리며 에너지를 응축하는 단계로 보입니다. ";
        }

        if (counts.macro > 1) marketSummary += "특히 거시 경제 지표와 금리 향방에 대한 시장의 관심이 매우 높습니다.";

        let sectorFocus = "";
        if (counts.tech > 1) {
            sectorFocus = "AI와 반도체 섹터가 시장의 중심에 있습니다. 엔비디아를 필두로 한 기술주들의 변동성이 전체 장세를 주도하고 있습니다.";
        } else {
            sectorFocus = "특정 섹터의 쏠림보다는 업종별 순환매 장세가 나타나고 있습니다. 가치주와 원자재 관련 뉴스에 주목할 필요가 있습니다.";
        }

        let riskFactor = "";
        if (counts.risk > 0) {
            riskFactor = "지정학적 리스크나 경기 침체 우려가 수면 위로 올라오고 있습니다. 급격한 시장 변동성에 대비한 리스크 관리가 최우선입니다.";
        } else {
            riskFactor = "현재 눈에 띄는 돌발 악재는 관찰되지 않으나, 지나친 낙관론에 따른 기술적 조정 가능성을 열어두어야 합니다.";
        }

        // UI 업데이트
        marketEl.innerText = marketSummary;
        sectorEl.innerText = sectorFocus;
        riskEl.innerText = riskFactor;

    } catch (e) {
        console.error(e);
        marketEl.innerText = "분석 중 오류가 발생했습니다: " + e.message;
    }
}

// Utility Helpers
function normalize(arr) {
    if (arr.length === 0) return [];
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const diffs = arr.map(x => Math.pow(x - mean, 2));
    const std = Math.sqrt(diffs.reduce((a, b) => a + b, 0) / arr.length);
    return arr.map(x => (x - mean) / (std || 0.0001));
}

function calculateCorrelation(a, b) {
    if (a.length !== b.length) {
        const min = Math.min(a.length, b.length);
        a = a.slice(-min); b = b.slice(-min);
    }
    const n = a.length;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += a[i] * b[i];
    return sum / (n - 1);
}
