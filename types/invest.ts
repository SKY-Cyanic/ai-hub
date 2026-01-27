export type MarketType = 'KOSPI' | 'KOSDAQ' | 'NASDAQ' | 'NYSE' | 'CRYPTO';
export type AssetType = 'stocks' | 'crypto';
export type ChartType = 'candle' | 'line' | 'area';
export type Period = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'MAX';

export interface Asset {
    symbol: string;
    yahooSymbol?: string;
    code: string;
    name: string;
    market: MarketType;
    sector: string;
    desc: string;
    price: number;
    prevClose: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap: number;
}

export interface IndexData {
    symbol: string;
    name: string;
    country: string;
    price: number;
    change: number;
    changePercent: number;
}

export interface PortfolioItem {
    symbol: string;
    name: string;
    avgPrice: number;
    quantity: number;
    type: AssetType;
}

export interface Transaction {
    id: string;
    timestamp: Date;
    type: 'buy' | 'sell';
    symbol: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
}

export interface GameScenario {
    id: string;
    name: string;
    emoji: string;
    description: string;
    mode: string;
    date?: string;
}
