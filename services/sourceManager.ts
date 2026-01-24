/**
 * Source Manager - Phase B2
 * 참고자료 관리 시스템: URL 검증, 신뢰도 관리, 포맷팅
 */

import { ResearchSource } from './researchService';

// ============================================
// Types
// ============================================

export interface ValidatedSource extends ResearchSource {
    isValid: boolean;
    validationStatus: 'valid' | 'invalid' | 'unknown' | 'blocked';
    accessDate: string;
    formattedCitation: string;
}

export interface SourceValidationResult {
    validCount: number;
    invalidCount: number;
    blockedCount: number;
    sources: ValidatedSource[];
}

// ============================================
// Constants
// ============================================

// 차단된 도메인 (신뢰 불가)
const BLOCKED_DOMAINS = [
    'namu.wiki',
    'namuwiki',
    'tistory.com',
    'blog.naver.com',
    'brunch.co.kr',
    'medium.com',
    'velog.io',
    'tstory.com',
    'cafe.naver.com',
    'blog.daum.net'
];

// 최고 신뢰 도메인
const HIGHEST_TRUST_DOMAINS = [
    '.gov', '.go.kr', 'whitehouse.gov', 'europa.eu',
    '.edu', '.ac.kr', 'scholar.google',
    'arxiv.org', 'nature.com', 'science.org', 'ieee.org',
    'acm.org', 'springer.com', 'sciencedirect.com',
    'pubmed.ncbi.nlm.nih.gov', 'doi.org'
];

// 고 신뢰 도메인
const HIGH_TRUST_DOMAINS = [
    'chosun.com', 'joongang.co.kr', 'donga.com',
    'hani.co.kr', 'yonhapnews.co.kr', 'yna.co.kr',
    'mk.co.kr', 'hankyung.com', 'edaily.co.kr',
    'bloter.net', 'zdnet.co.kr', 'etnews.com',
    'reuters.com', 'bloomberg.com', 'wsj.com',
    'ft.com', 'economist.com', 'forbes.com',
    'nytimes.com', 'theguardian.com', 'bbc.com',
    'techcrunch.com', 'theverge.com', 'wired.com',
    'arstechnica.com', 'engadget.com'
];

// 중 신뢰 도메인
const MEDIUM_TRUST_DOMAINS = [
    'nvidia.com', 'amd.com', 'intel.com',
    'openai.com', 'anthropic.com', 'google.com',
    'microsoft.com', 'apple.com', 'meta.com',
    'deepmind.com', 'research.ibm.com'
];

// ============================================
// Source Manager
// ============================================

export const SourceManager = {
    /**
     * 출처 목록 검증 및 정제
     */
    async validateAndFilter(sources: ResearchSource[]): Promise<SourceValidationResult> {
        console.log(`🔍 Validating ${sources.length} sources...`);

        const validatedSources: ValidatedSource[] = [];
        let validCount = 0;
        let invalidCount = 0;
        let blockedCount = 0;

        for (const source of sources) {
            const validated = await this.validateSource(source);
            validatedSources.push(validated);

            if (validated.validationStatus === 'valid') validCount++;
            else if (validated.validationStatus === 'invalid') invalidCount++;
            else if (validated.validationStatus === 'blocked') blockedCount++;
        }

        console.log(`✅ Validation complete: ${validCount} valid, ${invalidCount} invalid, ${blockedCount} blocked`);

        return {
            validCount,
            invalidCount,
            blockedCount,
            sources: validatedSources
        };
    },

    /**
     * 단일 출처 검증
     */
    async validateSource(source: ResearchSource): Promise<ValidatedSource> {
        const domain = source.domain.toLowerCase();
        const accessDate = new Date().toISOString().split('T')[0];

        // 1. 차단된 도메인 체크
        if (this.isBlockedDomain(domain)) {
            return {
                ...source,
                trustScore: 0,
                isValid: false,
                validationStatus: 'blocked',
                accessDate,
                formattedCitation: ''
            };
        }

        // 2. URL 형식 검증
        if (!this.isValidUrl(source.url)) {
            return {
                ...source,
                isValid: false,
                validationStatus: 'invalid',
                accessDate,
                formattedCitation: ''
            };
        }

        // 3. 실존 여부 체크 (HEAD 요청)
        let isReachable = true;
        try {
            // Note: CORS issues might occur in browser, so we use no-cors mode
            // In a real backend, we would do a proper HEAD request.
            await fetch(source.url, { method: 'HEAD', mode: 'no-cors' });
        } catch (e) {
            console.warn(`URL unreachable: ${source.url}`);
            isReachable = false;
        }

        if (!isReachable) {
            return {
                ...source,
                isValid: false,
                validationStatus: 'invalid',
                accessDate,
                formattedCitation: ''
            };
        }

        // 4. 신뢰도 재계산
        const trustScore = this.calculateTrustScore(domain);

        // 5. 인용 포맷 생성
        const formattedCitation = this.formatCitation(source, accessDate);

        return {
            ...source,
            trustScore,
            isValid: trustScore >= 70,
            validationStatus: trustScore >= 70 ? 'valid' : 'unknown',
            accessDate,
            formattedCitation
        };
    },

    /**
     * 차단된 도메인 체크
     */
    isBlockedDomain(domain: string): boolean {
        const lowerDomain = domain.toLowerCase();
        return BLOCKED_DOMAINS.some(blocked => lowerDomain.includes(blocked));
    },

    /**
     * URL 형식 유효성 검사
     */
    isValidUrl(url: string): boolean {
        if (!url) return false;

        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    },

    /**
     * 신뢰도 점수 계산
     */
    calculateTrustScore(domain: string): number {
        const lowerDomain = domain.toLowerCase();

        // 차단
        if (BLOCKED_DOMAINS.some(b => lowerDomain.includes(b))) {
            return 0;
        }

        // 최고 신뢰 (100점)
        if (HIGHEST_TRUST_DOMAINS.some(d => lowerDomain.includes(d))) {
            return 100;
        }

        // 고 신뢰 (90점)
        if (HIGH_TRUST_DOMAINS.some(d => lowerDomain.includes(d))) {
            return 90;
        }

        // 중 신뢰 (80점)
        if (MEDIUM_TRUST_DOMAINS.some(d => lowerDomain.includes(d))) {
            return 80;
        }

        // 낮은 신뢰
        if (lowerDomain.endsWith('.org')) return 60;
        if (lowerDomain.endsWith('.com')) return 50;

        return 40;
    },

    /**
     * 인용 형식 생성
     */
    formatCitation(source: ResearchSource, accessDate: string): string {
        const title = source.title.length > 60
            ? source.title.substring(0, 57) + '...'
            : source.title;

        return `[${title}](${source.url}) - ${source.domain} (접속일: ${accessDate})`;
    },

    /**
     * 참고자료 섹션 마크다운 생성
     */
    formatReferencesSection(sources: ValidatedSource[]): string {
        const validSources = sources
            .filter(s => s.isValid && s.trustScore >= 70)
            .sort((a, b) => b.trustScore - a.trustScore);

        if (validSources.length === 0) {
            return `## 📚 참고자료\n> 신뢰할 수 있는 출처를 찾지 못했습니다.`;
        }

        const references = validSources.map((s, i) => {
            const emoji = s.trustScore >= 90 ? '🏆' : s.trustScore >= 80 ? '✅' : '📄';
            return `${i + 1}. ${emoji} [${s.title}](${s.url})\n   - 출처: ${s.domain} | 신뢰도: ${s.trustScore}점`;
        });

        return `## 📚 참고자료

${references.join('\n\n')}`;
    },

    /**
     * 신뢰 출처만 필터링
     */
    filterReliableSources(
        sources: ValidatedSource[],
        minTrustScore: number = 70
    ): ValidatedSource[] {
        return sources
            .filter(s => s.isValid && s.trustScore >= minTrustScore)
            .sort((a, b) => b.trustScore - a.trustScore);
    },

    /**
     * 출처 통계 생성
     */
    getSourceStats(sources: ValidatedSource[]): {
        total: number;
        valid: number;
        avgTrustScore: number;
        byCategory: Record<string, number>;
    } {
        const valid = sources.filter(s => s.isValid);
        const avgTrustScore = valid.length > 0
            ? valid.reduce((a, s) => a + s.trustScore, 0) / valid.length
            : 0;

        const byCategory: Record<string, number> = {
            'academic': 0,
            'news': 0,
            'official': 0,
            'other': 0
        };

        for (const source of valid) {
            const domain = source.domain.toLowerCase();
            if (HIGHEST_TRUST_DOMAINS.some(d => domain.includes(d))) {
                byCategory.academic++;
            } else if (HIGH_TRUST_DOMAINS.some(d => domain.includes(d))) {
                byCategory.news++;
            } else if (MEDIUM_TRUST_DOMAINS.some(d => domain.includes(d))) {
                byCategory.official++;
            } else {
                byCategory.other++;
            }
        }

        return {
            total: sources.length,
            valid: valid.length,
            avgTrustScore: Math.round(avgTrustScore),
            byCategory
        };
    }
};

export default SourceManager;
