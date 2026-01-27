import { Asset, MarketType, IndexData } from '../types/invest';

const CORS_PROXIES = ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?'];
let currentProxy = 0;

export async function fetchWithProxy(targetUrl: string) {
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

export function calculateSMA(data: { close: number }[], period: number) {
    const sma: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            sma.push(NaN);
            continue;
        }
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        sma.push(sum / period);
    }
    return sma;
}

export function calculateRSI(closes: number[], period: number = 14) {
    if (closes.length < period + 1) return null;
    let gains = 0, losses = 0;

    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) {
            avgGain = (avgGain * (period - 1) + change) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) - change) / period;
        }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

export const InvestService = {
    async fetchExchangeRate(): Promise<number> {
        try {
            const data = await fetchWithProxy('https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=1d&range=1d');
            const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
            return rate || 1380;
        } catch (e) {
            console.error('Exchange rate fetch error:', e);
            return 1380;
        }
    },

    async fetchYahooQuote(symbol: string) {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
        const data = await fetchWithProxy(url);
        const result = data?.chart?.result?.[0];

        if (result) {
            const meta = result.meta;
            const quotes = result.indicators.quote[0];
            const closes = quotes.close.filter((c: any) => c != null);

            const currentPrice = meta.regularMarketPrice;
            const previousDayClose = meta.previousClose || (closes.length > 1 ? closes[closes.length - (currentPrice === closes[closes.length - 1] ? 2 : 1)] : meta.chartPreviousClose);

            const change = currentPrice - previousDayClose;
            const changePercent = (change / previousDayClose) * 100;

            const rsi = calculateRSI(closes, 14);
            const sma20Arr = calculateSMA(closes.map((c: any) => ({ close: c })), 20);
            const sma20 = sma20Arr[sma20Arr.length - 1];

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
    },

    async fetchNews() {
        const proxy = 'https://api.allorigins.win/raw?url=';
        const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=주식+시장+경제&hl=ko&gl=KR&ceid=KR:ko');

        try {
            const response = await fetch(proxy + rssUrl);
            const str = await response.text();
            const data = new DOMParser().parseFromString(str, "text/xml");
            const items = data.querySelectorAll("item");

            return Array.from(items).slice(0, 10).map(item => {
                const pubDate = new Date(item.querySelector("pubDate")?.textContent || '');
                const timeDiff = Math.floor((new Date().getTime() - pubDate.getTime()) / 60000);
                let timeStr = timeDiff + '분 전';
                if (timeDiff > 60) timeStr = Math.floor(timeDiff / 60) + '시간 전';

                return {
                    title: item.querySelector("title")?.textContent || '',
                    link: item.querySelector("link")?.textContent || '',
                    source: item.querySelector("source")?.textContent || 'Google News',
                    time: timeStr
                };
            });
        } catch (e) {
            console.error('News fetch failed:', e);
            return [];
        }
    }
};
