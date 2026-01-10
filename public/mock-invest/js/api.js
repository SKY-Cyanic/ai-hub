// js/api.js
import { state, CORS_PROXIES } from './state.js';
import { formatKRW } from './utils.js';

let currentProxy = 0;

export async function fetchWithProxy(targetUrl) {
    for (let i = 0; i < CORS_PROXIES.length; i++) {
        const proxy = CORS_PROXIES[(currentProxy + i) % CORS_PROXIES.length];
        try {
            const response = await fetch(proxy + encodeURIComponent(targetUrl));
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            currentProxy = (currentProxy + i) % CORS_PROXIES.length;
            return data;
        } catch (e) {
            continue;
        }
    }
    console.error(`All attempts failed for ${targetUrl}`);
    return null;
}

export async function fetchExchangeRate() {
    try {
        const data = await fetchWithProxy('https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=1d&range=1d');
        const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (rate) {
            state.USD_TO_KRW = rate;
            // Update UI
            const el = document.getElementById('usdRate');
            if (el) el.textContent = `1 USD = ${formatKRW(rate)}`;
        }
    } catch (e) {
        console.error('Exchange rate fetch error:', e);
    }
}

import { calculateSMA, calculateRSI } from './utils.js';

export async function fetchYahooQuote(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
    const data = await fetchWithProxy(url);
    const result = data?.chart?.result?.[0];

    if (result) {
        const meta = result.meta;
        const quotes = result.indicators.quote[0];
        const closes = quotes.close.filter(c => c != null);

        // Calculate Indicators
        const sma20Arr = calculateSMA(closes.map(c => ({ close: c })), 20);
        const sma20 = sma20Arr[sma20Arr.length - 1];
        const rsi = calculateRSI(closes, 14);

        // Calculate Daily Change (전일대비)
        // range=1mo일 때 meta.chartPreviousClose는 한 달 전 가격일 수 있음.
        // 따라서 실제 전일 종가(meta.previousClose) 혹은 데이터의 마지막 두 값을 사용.
        const currentPrice = meta.regularMarketPrice;
        const previousDayClose = meta.previousClose || (closes.length > 1 ? closes[closes.length - (currentPrice === closes[closes.length - 1] ? 2 : 1)] : meta.chartPreviousClose);

        const change = currentPrice - previousDayClose;
        const changePercent = (change / previousDayClose) * 100;

        return {
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            prevClose: previousDayClose,
            volume: meta.regularMarketVolume,
            marketCap: meta.marketCap || 0,
            rsi: rsi,
            sma20: sma20
        };
    }
    return null;
}

export async function fetchNews() {
    const container = document.getElementById('newsList');
    const sidebarNews = document.getElementById('sidebarNews');
    const proxy = 'https://api.allorigins.win/raw?url=';
    const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=주식+시장+경제&hl=ko&gl=KR&ceid=KR:ko');

    try {
        const response = await fetch(proxy + rssUrl);
        const str = await response.text();
        const data = new DOMParser().parseFromString(str, "text/xml");
        const items = data.querySelectorAll("item");

        const newsItems = Array.from(items).slice(0, 10).map(item => {
            const pubDate = new Date(item.querySelector("pubDate").textContent);
            const timeDiff = Math.floor((new Date() - pubDate) / 60000);
            let timeStr = timeDiff + '분 전';
            if (timeDiff > 60) timeStr = Math.floor(timeDiff / 60) + '시간 전';

            return {
                title: item.querySelector("title").textContent,
                link: item.querySelector("link").textContent,
                source: item.querySelector("source")?.textContent || 'Google News',
                time: timeStr
            };
        });

        if (newsItems.length === 0) throw new Error('No news');

        const html = newsItems.map(news => `
            <a href="${news.link}" target="_blank" class="news-item block p-3 rounded-lg cursor-pointer">
                <div class="flex justify-between items-start gap-2 mb-1">
                    <span class="text-xs font-bold text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">${news.source}</span>
                    <span class="text-xs text-slate-500 whitespace-nowrap">${news.time}</span>
                </div>
                <h4 class="text-sm font-medium leading-snug hover:text-blue-300 transition">${news.title}</h4>
            </a>
        `).join('');

        if (container) container.innerHTML = html;
        if (sidebarNews) sidebarNews.innerHTML = newsItems.slice(0, 5).map(news => `
            <a href="${news.link}" target="_blank" class="block p-3 border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                <div class="text-xs text-blue-400 mb-1">${news.source} · ${news.time}</div>
                <div class="text-sm">${news.title}</div>
            </a>
        `).join('');

    } catch (e) {
        console.error('News fetch failed:', e);
        if (container) container.innerHTML = '<div class="text-slate-500 text-center py-8">뉴스 로딩 실패</div>';
    }
}
