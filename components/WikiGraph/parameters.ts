export const CONFIG = {
    endpoints: {
        ko: 'https://ko.wikipedia.org/w/api.php',
        en: 'https://en.wikipedia.org/w/api.php',
        ja: 'https://ja.wikipedia.org/w/api.php',
        zh: 'https://zh.wikipedia.org/w/api.php',
        de: 'https://de.wikipedia.org/w/api.php',
        fr: 'https://fr.wikipedia.org/w/api.php'
    },
    maxLinks: 15,
    springLength: 200,
    lang: 'ko',
    semanticThreshold: 0.4
};

export const COLORS = {
    node: {
        bg: '#3b82f6',
        border: '#60a5fa',
        highlight: '#fbbf24',
        levels: [
            { min: 0, bg: '#3b82f6', border: '#60a5fa' }, // Default Blue
            { min: 5, bg: '#8b5cf6', border: '#a78bfa' }, // Purple
            { min: 10, bg: '#ec4899', border: '#f472b6' }, // Pink/Rose
            { min: 20, bg: '#f59e0b', border: '#fbbf24' }  // Gold/Orange
        ]
    },
    edge: { color: '#475569', highlight: '#94a3b8', path: '#10b981' },
    font: { color: '#f1f5f9', stroke: '#0f172a' }
};
