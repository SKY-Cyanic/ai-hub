/**
 * Quality Verification Manager - Phase 4.1 Checkpoint 4
 * AI 기반 콘텐츠 품질 검증 시스템
 */

import { getGroqClient } from './groqClient';
import { ResearchReport } from './researchService';

export interface QualityScore {
    overall: number;         // 전체 점수 (1-10)
    reliability: number;     // 신뢰도 (1-10)
    completeness: number;    // 완성도 (1-10)
    objectivity: number;     // 객관성 (1-10)
    sourceQuality: number;   // 출처 품질 (1-10)
    feedback: string;        // AI 피드백
    shouldPublish: boolean;  // 게시 가능 여부
    timestamp: number;       // 평가 시간
}

const MIN_QUALITY_THRESHOLD = 7.0; // 최소 품질 기준
const MIN_SOURCE_TRUST_RATIO = 0.6; // 신뢰 출처 최소 60%

export const QualityVerificationManager = {
    /**
     * AI 품질 평가
     */
    async evaluateQuality(
        content: string,
        sources: Array<{ domain: string; trustScore: number }>,
        title: string
    ): Promise<QualityScore> {
        console.log(`🔍 Evaluating quality for: "${title}"`);

        const groqClient = getGroqClient();

        const prompt = `다음 AI 큐레이터 생성 콘텐츠의 품질을 평가해주세요.

**제목**: ${title}

**본문**:
${content.substring(0, 2000)} ${content.length > 2000 ? '...(truncated)' : ''}

**참고 출처**:
${sources.map(s => `- ${s.domain} (신뢰도: ${s.trustScore}점)`).join('\n')}

---

다음 4가지 기준으로 각각 1-10점을 매겨주세요:

1. **Reliability (신뢰도)**: 정보의 정확성과 출처의 신뢰성
2. **Completeness (완성도)**: 내용의 충실함과 깊이
3. **Objectivity (객관성)**: 편향 없는 균형잡힌 시각
4. **SourceQuality (출처 품질)**: 참고자료의 다양성과 신뢰도

응답 형식:
reliability: [점수]
completeness: [점수]
objectivity: [점수]
sourceQuality: [점수]
feedback: [1-2문장의 간단한 피드백]

**중요**: 각 점수는 정확히 숫자로만 제공하세요.`;

        let response = '';
        await groqClient.streamChat(
            {
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3, // 낮은 temperature로 일관성 확보
                max_tokens: 500
            },
            (chunk, full) => {
                response = full;
            }
        );

        // 응답 파싱
        const parsed = this.parseQualityResponse(response);

        // 전체 점수 계산 (가중 평균)
        const overall = (
            parsed.reliability * 0.3 +      // 30%
            parsed.completeness * 0.25 +    // 25%
            parsed.objectivity * 0.25 +     // 25%
            parsed.sourceQuality * 0.2      // 20%
        );

        // 출처 신뢰도 검증
        const trustSourceRatio = this.calculateTrustSourceRatio(sources);

        const score: QualityScore = {
            overall: Math.round(overall * 10) / 10, // 소수점 1자리
            reliability: parsed.reliability,
            completeness: parsed.completeness,
            objectivity: parsed.objectivity,
            sourceQuality: parsed.sourceQuality,
            feedback: parsed.feedback,
            shouldPublish: overall >= MIN_QUALITY_THRESHOLD && trustSourceRatio >= MIN_SOURCE_TRUST_RATIO,
            timestamp: Date.now()
        };

        console.log(`📊 Quality Score: ${score.overall}/10`);
        console.log(`   Reliability: ${score.reliability}/10`);
        console.log(`   Completeness: ${score.completeness}/10`);
        console.log(`   Objectivity: ${score.objectivity}/10`);
        console.log(`   Source Quality: ${score.sourceQuality}/10`);
        console.log(`   Trust Source Ratio: ${(trustSourceRatio * 100).toFixed(1)}%`);
        console.log(`   Should Publish: ${score.shouldPublish ? '✅ YES' : '❌ NO'}`);

        if (!score.shouldPublish) {
            if (overall < MIN_QUALITY_THRESHOLD) {
                console.log(`   ⚠️ Reason: Quality too low (${overall.toFixed(1)} < ${MIN_QUALITY_THRESHOLD})`);
            }
            if (trustSourceRatio < MIN_SOURCE_TRUST_RATIO) {
                console.log(`   ⚠️ Reason: Trust source ratio too low (${(trustSourceRatio * 100).toFixed(1)}% < 60%)`);
            }
        }

        return score;
    },

    /**
     * AI 응답 파싱
     */
    parseQualityResponse(response: string): {
        reliability: number;
        completeness: number;
        objectivity: number;
        sourceQuality: number;
        feedback: string;
    } {
        const lines = response.split('\n');
        const result = {
            reliability: 7, // 기본값
            completeness: 7,
            objectivity: 7,
            sourceQuality: 7,
            feedback: '평가 완료'
        };

        for (const line of lines) {
            const lower = line.toLowerCase().trim();

            if (lower.startsWith('reliability:')) {
                const match = line.match(/(\d+(?:\.\d+)?)/);
                if (match) result.reliability = Math.min(10, Math.max(1, parseFloat(match[1])));
            } else if (lower.startsWith('completeness:')) {
                const match = line.match(/(\d+(?:\.\d+)?)/);
                if (match) result.completeness = Math.min(10, Math.max(1, parseFloat(match[1])));
            } else if (lower.startsWith('objectivity:')) {
                const match = line.match(/(\d+(?:\.\d+)?)/);
                if (match) result.objectivity = Math.min(10, Math.max(1, parseFloat(match[1])));
            } else if (lower.startsWith('sourcequality:') || lower.startsWith('source quality:')) {
                const match = line.match(/(\d+(?:\.\d+)?)/);
                if (match) result.sourceQuality = Math.min(10, Math.max(1, parseFloat(match[1])));
            } else if (lower.startsWith('feedback:')) {
                result.feedback = line.substring(line.indexOf(':') + 1).trim();
            }
        }

        return result;
    },

    /**
     * 신뢰 출처 비율 계산
     */
    calculateTrustSourceRatio(sources: Array<{ domain: string; trustScore: number }>): number {
        if (sources.length === 0) return 0;

        const trustSources = sources.filter(s => s.trustScore >= 70);
        return trustSources.length / sources.length;
    },

    /**
     * ResearchReport에서 출처 추출
     */
    extractSourcesFromReport(report: ResearchReport): Array<{ domain: string; trustScore: number }> {
        return report.sources.map(s => ({
            domain: s.domain,
            trustScore: s.trustScore
        }));
    },

    /**
     * 품질 평가 (간단 버전 - ResearchReport 기반)
     */
    async evaluateFromReport(report: ResearchReport, title: string): Promise<QualityScore> {
        const content = `${report.summary}\n\n${report.detailedAnalysis}`;
        const sources = this.extractSourcesFromReport(report);

        return this.evaluateQuality(content, sources, title);
    }
};
