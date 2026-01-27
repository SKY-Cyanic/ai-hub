import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Asset, IndexData, PortfolioItem, Transaction, AssetType } from '../../types/invest';
import { InvestService } from '../../services/investService';

interface InvestState {
    cash: number;
    portfolio: Record<string, PortfolioItem>;
    transactions: Transaction[];
    favorites: string[];
    indices: IndexData[];
    stocks: Asset[];
    cryptos: Asset[];
    usdRate: number;
}

interface InvestContextType extends InvestState {
    buyAsset: (symbol: string, quantity: number, type: AssetType) => boolean;
    sellAsset: (symbol: string, quantity: number) => boolean;
    toggleFavorite: (symbol: string) => void;
    refreshData: () => Promise<void>;
}

const INITIAL_CAPITAL = 100000000;

const DEFAULT_STOCKS: Asset[] = [
    { symbol: '005930.KS', code: '005930', name: '삼성전자', market: 'KOSPI', sector: '반도체', desc: '세계 1위 메모리 반도체', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 450000 },
    { symbol: '000660.KS', code: '000660', name: 'SK하이닉스', market: 'KOSPI', sector: '반도체', desc: 'HBM 시장 점유율 1위', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 120000 },
    { symbol: '373220.KS', code: '373220', name: 'LG에너지솔루션', market: 'KOSPI', sector: '2차전지', desc: '글로벌 배터리 시장 선도', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 95000 },
    { symbol: '207940.KS', code: '207940', name: '삼성바이오로직스', market: 'KOSPI', sector: '바이오', desc: 'CDMO 글로벌 1위', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 65000 },
    { symbol: '005380.KS', code: '005380', name: '현대차', market: 'KOSPI', sector: '자동차', desc: '글로벌 Top 3 자동차 제조사', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 55000 },
    { symbol: '035420.KS', code: '035420', name: 'NAVER', market: 'KOSPI', sector: '플랫폼', desc: '대한민국 대표 검색 포털', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 35000 },
    { symbol: '035720.KS', code: '035720', name: '카카오', market: 'KOSPI', sector: '플랫폼', desc: '모바일 메신저 기반 서비스', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 25000 },
    { symbol: '247540.KS', code: '247540', name: '에코프로비엠', market: 'KOSDAQ', sector: '2차전지', desc: '양극재 글로벌 Top Tier', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 25000 },
    { symbol: '091990.KS', code: '091990', name: '셀트리온헬스케어', market: 'KOSDAQ', sector: '바이오', desc: '글로벌 유통망 보유', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 15000 },
    { symbol: 'AAPL', code: 'AAPL', name: 'Apple', market: 'NASDAQ', sector: '기술', desc: '아이폰 및 서비스 생태계', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 3000000 },
    { symbol: 'MSFT', code: 'MSFT', name: 'Microsoft', market: 'NASDAQ', sector: '소프트웨어', desc: 'Windows 및 Azure AI', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 3100000 },
    { symbol: 'NVDA', code: 'NVDA', name: 'NVIDIA', market: 'NASDAQ', sector: '반도체', desc: 'AI 반도체 점유율 압도적 1위', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 2200000 },
    { symbol: 'GOOGL', code: 'GOOGL', name: 'Alphabet', market: 'NASDAQ', sector: '인터넷', desc: '구글, 유튜브, Gemini AI', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 1800000 },
    { symbol: 'AMZN', code: 'AMZN', name: 'Amazon', market: 'NASDAQ', sector: '소비재', desc: '이커머스 및 클라우드(AWS)', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 1850000 },
    { symbol: 'META', code: 'META', name: 'Meta', market: 'NASDAQ', sector: '인터넷', desc: '페이스북 및 메타버스', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 1200000 },
    { symbol: 'TSLA', code: 'TSLA', name: 'Tesla', market: 'NASDAQ', sector: '자동차', desc: '전기차 및 자율주행 기술', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 600000 },
    { symbol: 'AVGO', code: 'AVGO', name: 'Broadcom', market: 'NASDAQ', sector: '반도체', desc: '네트워킹 및 소프트웨어 인프라', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 600000 },
    { symbol: 'LLY', code: 'LLY', name: 'Eli Lilly', market: 'NYSE', sector: '제약', desc: '비만치료제 및 인슐린 강자', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 700000 },
    { symbol: 'BRK-B', code: 'BRK.B', name: 'Berkshire B', market: 'NYSE', sector: '지주사', desc: '워런 버핏의 투자 지주회사', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 800000 },
    { symbol: 'JPM', code: 'JPM', name: 'JPMorgan', market: 'NYSE', sector: '금융', desc: '미국 최대 통합 상업은행', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 550000 },
    { symbol: 'KO', code: 'KO', name: 'Coca-Cola', market: 'NYSE', sector: '소비재', desc: '안정적인 월배당 기업', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 250000 },
];

const DEFAULT_CRYPTOS: Asset[] = [
    { symbol: 'bitcoin', yahooSymbol: 'BTC-USD', code: 'BTC', name: 'Bitcoin', market: 'CRYPTO', sector: '디지털 자산', desc: '최초의 암호화폐, 가치 저장 수단', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 1500000 },
    { symbol: 'ethereum', yahooSymbol: 'ETH-USD', code: 'ETH', name: 'Ethereum', market: 'CRYPTO', sector: '스마트 컨트랙트', desc: '블록체인 생태계의 허브', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 450000 },
    { symbol: 'solana', yahooSymbol: 'SOL-USD', code: 'SOL', name: 'Solana', market: 'CRYPTO', sector: '레이어1', desc: '고성능 블록체인 네트워크', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 80000 },
    { symbol: 'ripple', yahooSymbol: 'XRP-USD', code: 'XRP', name: 'Ripple', market: 'CRYPTO', sector: '국제 송금', desc: '기업용 결제 시스템 기반', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 45000 },
    { symbol: 'dogecoin', yahooSymbol: 'DOGE-USD', code: 'DOGE', name: 'Dogecoin', market: 'CRYPTO', sector: '밈 코인', desc: '커뮤니티 기반 디지털 자산', price: 0, prevClose: 0, change: 0, changePercent: 0, volume: 0, marketCap: 25000 },
];

const DEFAULT_INDICES: IndexData[] = [
    { symbol: '^KS11', name: '코스피', country: '🇰🇷', price: 0, change: 0, changePercent: 0 },
    { symbol: '^KQ11', name: '코스닥', country: '🇰🇷', price: 0, change: 0, changePercent: 0 },
    { symbol: '^GSPC', name: 'S&P 500', country: '🇺🇸', price: 0, change: 0, changePercent: 0 },
    { symbol: '^DJI', name: '다우존스', country: '🇺🇸', price: 0, change: 0, changePercent: 0 },
    { symbol: '^IXIC', name: '나스닥', country: '🇺🇸', price: 0, change: 0, changePercent: 0 },
];

const InvestContext = createContext<InvestContextType | undefined>(undefined);

export const InvestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cash, setCash] = useState(INITIAL_CAPITAL);
    const [portfolio, setPortfolio] = useState<Record<string, PortfolioItem>>({});
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [indices, setIndices] = useState<IndexData[]>(DEFAULT_INDICES);
    const [stocks, setStocks] = useState<Asset[]>(DEFAULT_STOCKS);
    const [cryptos, setCryptos] = useState<Asset[]>(DEFAULT_CRYPTOS);
    const [usdRate, setUsdRate] = useState(1380);

    // Load from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('stockSimPro');
        if (saved) {
            const data = JSON.parse(saved);
            setCash(data.cash ?? INITIAL_CAPITAL);
            setPortfolio(data.portfolio ?? {});
            setFavorites(data.favorites ?? []);
            setTransactions(data.transactions ?? []);
        }
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        localStorage.setItem('stockSimPro', JSON.stringify({
            cash,
            portfolio,
            favorites,
            transactions
        }));
    }, [cash, portfolio, favorites, transactions]);

    const refreshData = useCallback(async () => {
        const rate = await InvestService.fetchExchangeRate();
        setUsdRate(rate);

        const updatedIndices = await Promise.all(indices.map(async idx => {
            const quote = await InvestService.fetchYahooQuote(idx.symbol);
            return quote ? { ...idx, ...quote } : idx;
        }));
        setIndices(updatedIndices);

        const updatedStocks = await Promise.all(stocks.map(async s => {
            const quote = await InvestService.fetchYahooQuote(s.symbol);
            return quote ? { ...s, ...quote } : s;
        }));
        setStocks(updatedStocks);

        const updatedCryptos = await Promise.all(cryptos.map(async c => {
            const quote = await InvestService.fetchYahooQuote(c.yahooSymbol || c.symbol);
            return quote ? { ...c, ...quote } : c;
        }));
        setCryptos(updatedCryptos);
    }, [indices, stocks, cryptos]);

    const buyAsset = (symbol: string, quantity: number, type: AssetType) => {
        const allAssets = [...stocks, ...cryptos];
        const asset = allAssets.find(a => a.code === symbol);
        if (!asset) return false;

        const totalCost = asset.price * quantity;
        if (cash < totalCost) return false;

        setCash(prev => prev - totalCost);
        setPortfolio(prev => {
            const existing = prev[symbol];
            if (existing) {
                const newQty = existing.quantity + quantity;
                const newAvg = (existing.avgPrice * existing.quantity + totalCost) / newQty;
                return { ...prev, [symbol]: { ...existing, quantity: newQty, avgPrice: newAvg } };
            }
            return { ...prev, [symbol]: { symbol, name: asset.name, quantity, avgPrice: asset.price, type } };
        });

        const transaction: Transaction = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            type: 'buy',
            symbol,
            name: asset.name,
            price: asset.price,
            quantity,
            total: totalCost
        };
        setTransactions(prev => [transaction, ...prev]);
        return true;
    };

    const sellAsset = (symbol: string, quantity: number) => {
        const item = portfolio[symbol];
        if (!item || item.quantity < quantity) return false;

        const allAssets = [...stocks, ...cryptos];
        const asset = allAssets.find(a => a.code === symbol);
        if (!asset) return false;

        const totalGain = asset.price * quantity;
        setCash(prev => prev + totalGain);
        setPortfolio(prev => {
            const existing = prev[symbol];
            if (existing.quantity === quantity) {
                const { [symbol]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [symbol]: { ...existing, quantity: existing.quantity - quantity } };
        });

        const transaction: Transaction = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            type: 'sell',
            symbol,
            name: asset.name,
            price: asset.price,
            quantity,
            total: totalGain
        };
        setTransactions(prev => [transaction, ...prev]);
        return true;
    };

    const toggleFavorite = (symbol: string) => {
        setFavorites(prev =>
            prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
        );
    };

    const value = {
        cash,
        portfolio,
        transactions,
        favorites,
        indices,
        stocks,
        cryptos,
        usdRate,
        buyAsset,
        sellAsset,
        toggleFavorite,
        refreshData
    };

    return <InvestContext.Provider value={value}>{children}</InvestContext.Provider>;
};

export const useInvest = () => {
    const context = useContext(InvestContext);
    if (!context) throw new Error('useInvest must be used within InvestProvider');
    return context;
};
