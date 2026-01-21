/**
 * Safety Policy Service - 안전 & 정책
 * 콘텐츠 필터링, 스팸 방지, 관리자 통제
 */

// ============================================
// Types
// ============================================

export interface ContentCheckResult {
    allowed: boolean;
    reasons: string[];
    score: number;  // 0-100 (높을수록 안전)
    flags: ContentFlag[];
}

export interface ContentFlag {
    type: 'political' | 'religious' | 'nsfw' | 'controversial' | 'spam' | 'low-trust';
    severity: 'low' | 'medium' | 'high';
    keyword?: string;
}

export interface SafetyConfig {
    // 콘텐츠 필터링
    blockPolitical: boolean;
    blockReligious: boolean;
    blockNSFW: boolean;
    blockControversial: boolean;

    // 스팸 방지
    urlCooldownHours: number;       // 같은 URL 재게시 금지 시간
    titleSimilarityThreshold: number; // 제목 유사도 차단 기준 (0-1)
    minSourceTrustScore: number;    // 최소 출처 신뢰도

    // 관리자 통제
    manualApprovalMode: boolean;    // 게시 전 수동 승인
    emergencyStop: boolean;         // 긴급 중단
    blacklistKeywords: string[];    // 블랙리스트 키워드
}

// ============================================
// Default Config
// ============================================

const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
    blockPolitical: true,
    blockReligious: true,
    blockNSFW: true,
    blockControversial: false,

    urlCooldownHours: 24,
    titleSimilarityThreshold: 0.9,
    minSourceTrustScore: 50,

    manualApprovalMode: false,
    emergencyStop: false,
    blacklistKeywords: []
};

const STORAGE_KEY = 'safety_policy_config';
const PENDING_POSTS_KEY = 'safety_pending_posts';
const URL_HISTORY_KEY = 'safety_url_history';

// ============================================
// Sensitive Keywords
// ============================================

const POLITICAL_KEYWORDS = [
    '대통령', '국회', '여당', '야당', '정당', '선거', '투표',
    'president', 'congress', 'election', 'democrat', 'republican',
    '좌파', '우파', '진보', '보수', '정치', 'politics',
    '탄핵', 'impeachment', '국정농단'
];

const RELIGIOUS_KEYWORDS = [
    '종교', '기독교', '불교', '이슬람', '힌두교', '유대교',
    'religion', 'christian', 'muslim', 'buddhist', 'hindu',
    '교회', '성당', '절', '사찰', '모스크', '신앙',
    '하나님', '부처', '알라', '예수', 'god', 'jesus'
];

const NSFW_KEYWORDS = [
    'nsfw', 'adult', 'porn', 'xxx', 'sex', 'naked', 'nude',
    '성인', '야동', '포르노', '섹스', '누드', '19금',
    'explicit', 'erotic', 'fetish'
];

const CONTROVERSIAL_KEYWORDS = [
    '논란', '비판', '갈등', '분쟁', '혐오', '차별',
    'controversy', 'scandal', 'conflict', 'hate', 'discrimination',
    '테러', 'terrorism', '극단주의', 'extremism',
    '백신', 'vaccine', 'antivax', '음모론', 'conspiracy'
];

// ============================================
// Safety Policy Service
// ============================================

export const SafetyPolicyService = {
    /**
     * 설정 로드
     */
    loadConfig(): SafetyConfig {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? { ...DEFAULT_SAFETY_CONFIG, ...JSON.parse(stored) } : DEFAULT_SAFETY_CONFIG;
        } catch {
            return DEFAULT_SAFETY_CONFIG;
        }
    },

    /**
     * 설정 저장
     */
    saveConfig(config: SafetyConfig): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    },

    /**
     * 🔍 콘텐츠 검사 (메인 함수)
     */
    checkContent(title: string, content: string, url?: string, trustScore?: number): ContentCheckResult {
        const config = this.loadConfig();
        const flags: ContentFlag[] = [];
        const reasons: string[] = [];
        let score = 100;

        const combined = `${title} ${content}`.toLowerCase();

        // 1. 블랙리스트 키워드 체크
        for (const keyword of config.blacklistKeywords) {
            if (combined.includes(keyword.toLowerCase())) {
                flags.push({ type: 'spam', severity: 'high', keyword });
                reasons.push(`블랙리스트 키워드: "${keyword}"`);
                score -= 50;
            }
        }

        // 2. 정치 콘텐츠 체크
        if (config.blockPolitical) {
            const matches = this.findKeywordMatches(combined, POLITICAL_KEYWORDS);
            if (matches.length > 0) {
                flags.push({ type: 'political', severity: matches.length > 2 ? 'high' : 'medium', keyword: matches[0] });
                reasons.push(`정치 관련 키워드 감지: ${matches.slice(0, 3).join(', ')}`);
                score -= 30 + (matches.length * 5);
            }
        }

        // 3. 종교 콘텐츠 체크
        if (config.blockReligious) {
            const matches = this.findKeywordMatches(combined, RELIGIOUS_KEYWORDS);
            if (matches.length > 0) {
                flags.push({ type: 'religious', severity: matches.length > 2 ? 'high' : 'medium', keyword: matches[0] });
                reasons.push(`종교 관련 키워드 감지: ${matches.slice(0, 3).join(', ')}`);
                score -= 30 + (matches.length * 5);
            }
        }

        // 4. NSFW 콘텐츠 체크
        if (config.blockNSFW) {
            const matches = this.findKeywordMatches(combined, NSFW_KEYWORDS);
            if (matches.length > 0) {
                flags.push({ type: 'nsfw', severity: 'high', keyword: matches[0] });
                reasons.push(`NSFW 콘텐츠 감지: ${matches[0]}`);
                score -= 100; // 즉시 차단
            }
        }

        // 5. 논란 콘텐츠 체크
        if (config.blockControversial) {
            const matches = this.findKeywordMatches(combined, CONTROVERSIAL_KEYWORDS);
            if (matches.length > 0) {
                flags.push({ type: 'controversial', severity: 'medium', keyword: matches[0] });
                reasons.push(`논란 키워드 감지: ${matches.slice(0, 3).join(', ')}`);
                score -= 20;
            }
        }

        // 6. URL 쿨다운 체크
        if (url && this.isUrlOnCooldown(url, config.urlCooldownHours)) {
            flags.push({ type: 'spam', severity: 'high' });
            reasons.push(`동일 URL ${config.urlCooldownHours}시간 내 재게시 금지`);
            score -= 50;
        }

        // 7. 출처 신뢰도 체크
        if (trustScore !== undefined && trustScore < config.minSourceTrustScore) {
            flags.push({ type: 'low-trust', severity: 'medium' });
            reasons.push(`출처 신뢰도 ${trustScore}점 (최소 ${config.minSourceTrustScore}점)`);
            score -= 20;
        }

        // 8. 긴급 중단 체크
        if (config.emergencyStop) {
            reasons.push('긴급 중단 모드 활성화');
            score = 0;
        }

        return {
            allowed: score >= 50 && !config.emergencyStop,
            reasons,
            score: Math.max(0, score),
            flags
        };
    },

    /**
     * 키워드 매칭
     */
    findKeywordMatches(text: string, keywords: string[]): string[] {
        return keywords.filter(kw => text.includes(kw.toLowerCase()));
    },

    /**
     * 📊 제목 유사도 체크
     */
    checkTitleSimilarity(newTitle: string, existingTitles: string[]): {
        similar: boolean;
        maxSimilarity: number;
        matchedTitle?: string
    } {
        const config = this.loadConfig();
        let maxSimilarity = 0;
        let matchedTitle: string | undefined;

        for (const existing of existingTitles) {
            const similarity = this.calculateSimilarity(newTitle, existing);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                matchedTitle = existing;
            }
        }

        return {
            similar: maxSimilarity >= config.titleSimilarityThreshold,
            maxSimilarity,
            matchedTitle
        };
    },

    /**
     * Jaccard 유사도 계산
     */
    calculateSimilarity(str1: string, str2: string): number {
        const set1 = new Set(str1.toLowerCase().split(/\s+/));
        const set2 = new Set(str2.toLowerCase().split(/\s+/));

        const intersection = [...set1].filter(x => set2.has(x));
        const union = new Set([...set1, ...set2]);

        return intersection.length / union.size;
    },

    /**
     * 🔗 URL 쿨다운 관리
     */
    isUrlOnCooldown(url: string, hours: number): boolean {
        const history = this.getUrlHistory();
        const entry = history[url];

        if (!entry) return false;

        const cooldownMs = hours * 60 * 60 * 1000;
        return (Date.now() - entry) < cooldownMs;
    },

    addUrlToHistory(url: string): void {
        const history = this.getUrlHistory();
        history[url] = Date.now();

        // 오래된 항목 정리 (7일 이상)
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
        for (const key of Object.keys(history)) {
            if (history[key] < cutoff) {
                delete history[key];
            }
        }

        localStorage.setItem(URL_HISTORY_KEY, JSON.stringify(history));
    },

    getUrlHistory(): Record<string, number> {
        try {
            return JSON.parse(localStorage.getItem(URL_HISTORY_KEY) || '{}');
        } catch {
            return {};
        }
    },

    /**
     * 📋 수동 승인 대기열 관리
     */
    addToPendingQueue(post: { title: string; content: string; source: string; timestamp: number }): string {
        const pending = this.getPendingPosts();
        const id = `pending_${Date.now()}`;
        pending.push({ ...post, id, status: 'pending' });
        localStorage.setItem(PENDING_POSTS_KEY, JSON.stringify(pending.slice(-50)));
        return id;
    },

    getPendingPosts(): any[] {
        try {
            return JSON.parse(localStorage.getItem(PENDING_POSTS_KEY) || '[]');
        } catch {
            return [];
        }
    },

    approvePending(id: string): void {
        const pending = this.getPendingPosts();
        const post = pending.find(p => p.id === id);
        if (post) {
            post.status = 'approved';
            localStorage.setItem(PENDING_POSTS_KEY, JSON.stringify(pending));
        }
    },

    rejectPending(id: string): void {
        const pending = this.getPendingPosts().filter(p => p.id !== id);
        localStorage.setItem(PENDING_POSTS_KEY, JSON.stringify(pending));
    },

    /**
     * 🚨 긴급 중단
     */
    activateEmergencyStop(): void {
        const config = this.loadConfig();
        config.emergencyStop = true;
        this.saveConfig(config);
        console.log('🚨 EMERGENCY STOP ACTIVATED');
    },

    deactivateEmergencyStop(): void {
        const config = this.loadConfig();
        config.emergencyStop = false;
        this.saveConfig(config);
        console.log('✅ Emergency stop deactivated');
    },

    /**
     * 📝 블랙리스트 키워드 관리
     */
    addToBlacklist(keyword: string): void {
        const config = this.loadConfig();
        if (!config.blacklistKeywords.includes(keyword.toLowerCase())) {
            config.blacklistKeywords.push(keyword.toLowerCase());
            this.saveConfig(config);
        }
    },

    removeFromBlacklist(keyword: string): void {
        const config = this.loadConfig();
        config.blacklistKeywords = config.blacklistKeywords.filter(k => k !== keyword.toLowerCase());
        this.saveConfig(config);
    },

    getBlacklist(): string[] {
        return this.loadConfig().blacklistKeywords;
    },

    /**
     * 📊 안전성 통계
     */
    getSafetyStats(): {
        blockedCount: number;
        flaggedCount: number;
        pendingCount: number;
        urlsTracked: number;
    } {
        const pending = this.getPendingPosts();
        const urlHistory = this.getUrlHistory();

        return {
            blockedCount: pending.filter(p => p.status === 'rejected').length,
            flaggedCount: pending.filter(p => p.flags?.length > 0).length,
            pendingCount: pending.filter(p => p.status === 'pending').length,
            urlsTracked: Object.keys(urlHistory).length
        };
    }
};

export default SafetyPolicyService;
