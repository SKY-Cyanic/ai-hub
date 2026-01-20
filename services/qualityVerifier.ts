/**
 * Quality Verifier - Phase A3
 * 콘텐츠 품질 검증 시스템
 */

import { ResearchSource } from './researchService';

// ============================================
// Types
// ============================================

export interface QualityScore {
    overall: number;        // 1-10 종합 점수

    // 개별 점수
    sourceQuality: number;   // 출처 품질
    crossValidation: number; // 교차 검증
    completeness: number;    // 완전성
    clarity: number;         // 명확성

    // 상세
    issues: string[];
    recommendations: string[];
    passed: boolean;
}

export interface CrossValidationResult {
    topic: string;
    sourceCount: number;
    agreementLevel: 'high' | 'medium' | 'low' | 'conflict';
    conflictingInfo: string[];
}

// ============================================
// Constants
// ============================================

const MIN_SOURCES = 3;
const MIN_TRUST_SCORE = 70;
const MIN_TRUST_RATIO = 0.6;
const QUALITY_THRESHOLD = 6;

// ============================================
// Quality Verifier
// ============================================

export const QualityVerifier = {
    /**
     * 종합 품질 검증
     */
    verify(
        content: string,
        sources: ResearchSource[],
        previousContents?: string[]
    ): QualityScore {
        console.log('🔍 Verifying content quality...');

        const issues: string[] = [];
        const recommendations: string[] = [];

        // 1. 출처 품질 검증
        const sourceQuality = this.verifySourceQuality(sources, issues, recommendations);

        // 2. 교차 검증
        const crossValidation = this.verifyCrossValidation(sources, issues, recommendations);

        // 3. 완전성 검증
        const completeness = this.verifyCompleteness(content, issues, recommendations);

        // 4. 명확성 검증
        const clarity = this.verifyClarity(content, issues, recommendations);

        // 5. 중복 검증 (이전 콘텐츠와 비교)
        if (previousContents && previousContents.length > 0) {
            this.verifyDuplication(content, previousContents, issues, recommendations);
        }

        // 종합 점수 계산 (가중 평균)
        const overall = Math.round(
            (sourceQuality * 0.3) +
            (crossValidation * 0.3) +
            (completeness * 0.2) +
            (clarity * 0.2)
        );

        const passed = overall >= QUALITY_THRESHOLD && issues.filter(i => i.startsWith('❌')).length === 0;

        console.log(`✅ Quality verification: ${overall}/10 (${passed ? 'PASSED' : 'FAILED'})`);

        return {
            overall,
            sourceQuality,
            crossValidation,
            completeness,
            clarity,
            issues,
            recommendations,
            passed
        };
    },

    /**
     * 1. 출처 품질 검증
     */
    verifySourceQuality(
        sources: ResearchSource[],
        issues: string[],
        recommendations: string[]
    ): number {
        let score = 10;

        // 최소 출처 수 확인
        if (sources.length < MIN_SOURCES) {
            issues.push(`⚠️ 출처 부족: ${sources.length}/${MIN_SOURCES}개`);
            recommendations.push('최소 3개 이상의 출처를 사용하세요');
            score -= 3;
        }

        // 신뢰도 높은 출처 비율
        const trustedSources = sources.filter(s => s.trustScore >= MIN_TRUST_SCORE);
        const trustRatio = sources.length > 0 ? trustedSources.length / sources.length : 0;

        if (trustRatio < MIN_TRUST_RATIO) {
            issues.push(`⚠️ 신뢰 출처 비율 낮음: ${Math.round(trustRatio * 100)}%`);
            recommendations.push('신뢰도 70점 이상 출처를 60% 이상 사용하세요');
            score -= 2;
        }

        // 평균 신뢰도
        const avgTrust = sources.length > 0
            ? sources.reduce((a, s) => a + s.trustScore, 0) / sources.length
            : 0;

        if (avgTrust < 75) {
            issues.push(`⚠️ 평균 신뢰도 낮음: ${avgTrust.toFixed(0)}점`);
            score -= 1;
        }

        // 차단된 출처 감지
        const blockedDomains = ['namu.wiki', 'tistory.com', 'blog.naver.com'];
        const hasBlocked = sources.some(s =>
            blockedDomains.some(b => s.domain.includes(b))
        );

        if (hasBlocked) {
            issues.push('❌ 신뢰할 수 없는 출처 포함');
            recommendations.push('나무위키, 개인 블로그 등을 제거하세요');
            score -= 3;
        }

        return Math.max(1, score);
    },

    /**
     * 2. 교차 검증
     */
    verifyCrossValidation(
        sources: ResearchSource[],
        issues: string[],
        recommendations: string[]
    ): number {
        let score = 10;

        if (sources.length < 2) {
            issues.push('❌ 교차 검증 불가: 출처 1개');
            recommendations.push('최소 2개 이상의 출처로 교차 검증하세요');
            return 3;
        }

        // 다양한 도메인 확인
        const uniqueDomains = new Set(sources.map(s => s.domain.replace(/^www\./, '')));
        if (uniqueDomains.size < 2) {
            issues.push('⚠️ 단일 출처: 다양성 부족');
            recommendations.push('다양한 출처에서 정보를 수집하세요');
            score -= 2;
        }

        // 학술/뉴스/공식 출처 균형
        const hasAcademic = sources.some(s =>
            s.domain.includes('.edu') || s.domain.includes('arxiv') || s.domain.includes('scholar')
        );
        const hasNews = sources.some(s =>
            s.domain.includes('news') || s.domain.includes('reuters') || s.domain.includes('bloomberg')
        );

        if (!hasAcademic && !hasNews) {
            issues.push('⚠️ 학술/뉴스 출처 없음');
            score -= 1;
        }

        return Math.max(1, score);
    },

    /**
     * 3. 완전성 검증
     */
    verifyCompleteness(
        content: string,
        issues: string[],
        recommendations: string[]
    ): number {
        let score = 10;

        // 최소 길이
        if (content.length < 500) {
            issues.push('⚠️ 내용 부족: 500자 미만');
            recommendations.push('더 상세한 분석을 추가하세요');
            score -= 2;
        }

        // 필수 섹션 확인
        const requiredSections = ['요약', '분석', '결론'];
        const missingSections = requiredSections.filter(s =>
            !content.includes(s) && !content.toLowerCase().includes(s.toLowerCase())
        );

        if (missingSections.length > 0) {
            issues.push(`⚠️ 누락된 섹션: ${missingSections.join(', ')}`);
            score -= missingSections.length;
        }

        // 참고자료 섹션 확인
        if (!content.includes('참고자료') && !content.includes('참고 자료') && !content.includes('출처')) {
            issues.push('⚠️ 참고자료 섹션 없음');
            recommendations.push('참고자료 섹션을 추가하세요');
            score -= 1;
        }

        return Math.max(1, score);
    },

    /**
     * 4. 명확성 검증
     */
    verifyClarity(
        content: string,
        issues: string[],
        recommendations: string[]
    ): number {
        let score = 10;

        // 모호한 표현 감지
        const vaguePatterns = [
            /상당히\s/g,
            /매우\s/g,
            /아주\s/g,
            /거의\s/g,
            /대략\s/g,
            /약간\s/g,
            /어느\s*정도/g
        ];

        let vagueCount = 0;
        for (const pattern of vaguePatterns) {
            const matches = content.match(pattern);
            if (matches) vagueCount += matches.length;
        }

        if (vagueCount > 5) {
            issues.push(`⚠️ 모호한 표현 다수: ${vagueCount}개`);
            recommendations.push('구체적인 수치와 데이터를 사용하세요');
            score -= 2;
        }

        // 두괄식 확인 (첫 단락에 결론)
        const firstParagraph = content.split('\n\n')[0] || '';
        if (firstParagraph.length > 500) {
            issues.push('⚠️ 두괄식 위반: 서론이 너무 김');
            recommendations.push('첫 단락에 핵심 결론을 요약하세요');
            score -= 1;
        }

        return Math.max(1, score);
    },

    /**
     * 5. 중복 검증
     */
    verifyDuplication(
        content: string,
        previousContents: string[],
        issues: string[],
        recommendations: string[]
    ): void {
        const contentWords = new Set(content.toLowerCase().split(/\s+/));

        for (let i = 0; i < previousContents.length; i++) {
            const prevWords = new Set(previousContents[i].toLowerCase().split(/\s+/));

            const intersection = new Set([...contentWords].filter(w => prevWords.has(w)));
            const similarity = intersection.size / Math.max(contentWords.size, prevWords.size);

            if (similarity > 0.7) {
                issues.push(`❌ 중복 콘텐츠 감지: 이전 콘텐츠 ${i + 1}과 ${Math.round(similarity * 100)}% 유사`);
                recommendations.push('새로운 관점이나 정보를 추가하세요');
                break;
            }
        }
    },

    /**
     * 교차 검증 상세 분석
     */
    analyzeCrossValidation(sources: ResearchSource[]): CrossValidationResult[] {
        // 키워드별 그룹화 및 분석
        const topics = new Map<string, ResearchSource[]>();

        // 간단한 키워드 추출
        for (const source of sources) {
            const keywords = source.snippet.toLowerCase()
                .split(/\s+/)
                .filter(w => w.length > 3)
                .slice(0, 5);

            for (const keyword of keywords) {
                if (!topics.has(keyword)) {
                    topics.set(keyword, []);
                }
                topics.get(keyword)!.push(source);
            }
        }

        const results: CrossValidationResult[] = [];

        for (const [topic, topicSources] of topics) {
            if (topicSources.length >= 2) {
                results.push({
                    topic,
                    sourceCount: topicSources.length,
                    agreementLevel: topicSources.length >= 3 ? 'high' : 'medium',
                    conflictingInfo: []
                });
            }
        }

        return results.slice(0, 5);
    }
};

export default QualityVerifier;
