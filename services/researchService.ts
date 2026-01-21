/**
 * Research Service - Refactored with Phase A-D Modules
 * 통합 리서치 서비스: 맥락분석 → 검색 → 추론 → 품질검증 → 템플릿 포맷
 * + 후속 질문 기능 + 심화 분석 (50CR) + 캐싱 + 분석
 */

import { SearchAPI, SearchResult } from './searchAPI';
import { getGroqClient } from './groqClient';
import { ContextAnalyzer, ContextAnalysis, IntentType } from './contextAnalyzer';
import { ReasoningEngine, ReasoningResult } from './reasoningEngine';
import { QualityVerifier, QualityScore } from './qualityVerifier';
import { ResponseTemplates, TemplateVariables, FormattedReport } from './responseTemplates';
import { SourceManager, ValidatedSource } from './sourceManager';
import { storage } from './storage';
import { ResearchCacheService } from './researchCacheService';
import { ResearchAnalyticsService } from './researchAnalyticsService';
import { ErrorRecoveryService } from './researchErrorRecovery';

// ============================================
// Constants
// ============================================

export const DEEP_ANALYSIS_COST = 50; // 심화 분석 비용 (CR)

// ============================================
// Types
// ============================================

export interface ResearchSource {
    title: string;
    url: string;
    snippet: string;
    domain: string;
    trustScore: number;
}

export interface ResearchReport {
    id: string;
    query: string;
    summary: string;
    detailedAnalysis: string;
    sources: ResearchSource[];
    prosAndCons: {
        pros: string[];
        cons: string[];
    };
    relatedTopics: string[];
    createdAt: string;
    searchProgress: SearchProgress[];

    // 새 필드 (Phase A-B)
    contextAnalysis?: ContextAnalysis;
    reasoningResult?: ReasoningResult;
    qualityScore?: QualityScore;
    formattedReport?: FormattedReport;

    // 후속 질문 관련
    parentReportId?: string;       // 원본 리포트 ID (후속 질문인 경우)
    followUpQuestions?: string[];  // 추천 후속 질문
    isDeepAnalysis?: boolean;      // 심화 분석 여부
}

export interface SearchProgress {
    step: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    timestamp: Date;
    details?: string;
}

export interface ResearchOptions {
    isDeepAnalysis?: boolean;      // 심화 분석 모드 (50CR)
    parentReportId?: string;       // 후속 질문인 경우 원본 리포트 ID
    userId?: string;               // CR 차감을 위한 사용자 ID
}

// ============================================
// Research Service
// ============================================

export const ResearchService = {
    /**
     * 🚀 메인 리서치 함수 (Phase A-B 통합)
     */
    async performResearch(
        query: string,
        onProgress?: (progress: SearchProgress) => void,
        options?: ResearchOptions
    ): Promise<ResearchReport> {
        const progress: SearchProgress[] = [];
        const reportId = `research_${Date.now()}`;
        const isDeepAnalysis = options?.isDeepAnalysis ?? false;

        const updateProgress = (step: string, status: SearchProgress['status'], details?: string) => {
            const newProgress: SearchProgress = { step, status, timestamp: new Date(), details };
            progress.push(newProgress);
            if (onProgress) onProgress(newProgress);
        };

        console.log(`🚀 Starting research: "${query}" ${isDeepAnalysis ? '(심화 분석)' : ''}`);

        // ============================================
        // 심화 분석 CR 차감 (50CR)
        // ============================================
        if (isDeepAnalysis && options?.userId) {
            updateProgress('CR 차감', 'in-progress', `${DEEP_ANALYSIS_COST}CR 결제 중...`);

            const user = storage.getUserByRawId(options.userId);
            if (!user) {
                updateProgress('CR 차감', 'failed', '사용자를 찾을 수 없습니다');
                throw new Error('사용자를 찾을 수 없습니다.');
            }

            if (user.points < DEEP_ANALYSIS_COST) {
                updateProgress('CR 차감', 'failed', `CR 부족 (보유: ${user.points})`);
                throw new Error(`CR이 부족합니다. (필요: ${DEEP_ANALYSIS_COST}CR, 보유: ${user.points}CR)`);
            }

            // CR 차감
            user.points -= DEEP_ANALYSIS_COST;
            if (!user.transactions) user.transactions = [];
            user.transactions.push({
                id: `tx-research-${Date.now()}`,
                type: 'spend',
                amount: DEEP_ANALYSIS_COST,
                description: `심화 분석: ${query.substring(0, 30)}...`,
                created_at: new Date().toISOString()
            });

            await storage.saveUser(user);

            // 세션 업데이트
            if (storage.getSession()?.id === user.id) {
                storage.setSession(user);
            }

            updateProgress('CR 차감', 'completed', `${DEEP_ANALYSIS_COST}CR 결제 완료`);
        }

        // ============================================
        // Phase C: 캐시 확인
        // ============================================
        const cachedReport = ResearchCacheService.getReport(query, isDeepAnalysis);
        if (cachedReport) {
            updateProgress('캐시 조회', 'completed', '캐시된 결과 반환');
            ResearchAnalyticsService.trackCacheHit(query);
            return cachedReport;
        }

        const startTime = Date.now();

        // ============================================
        // Phase A1: 맥락 분석
        // ============================================
        updateProgress('맥락 분석', 'in-progress', '질문 의도 파악 중...');

        let contextAnalysis: ContextAnalysis;
        try {
            contextAnalysis = await ContextAnalyzer.analyze(query);
            updateProgress('맥락 분석', 'completed',
                `의도: ${contextAnalysis.intent}, 키워드: ${contextAnalysis.searchKeywords.length}개`);
        } catch (error) {
            console.error('Context analysis failed, using fallback:', error);
            contextAnalysis = {
                originalQuery: query,
                intent: 'definition',
                intentConfidence: 0.5,
                entities: [],
                abbreviationExpansions: [],
                searchKeywords: [query],
                isAmbiguous: false,
                possibleMeanings: [],
                complexity: 'simple'
            };
            updateProgress('맥락 분석', 'completed', '폴백 모드');
        }

        // ============================================
        // 웹 검색 (분석된 키워드 사용)
        // ============================================
        updateProgress('웹 검색', 'in-progress', '신뢰 출처에서 검색 중...');

        let searchResults: SearchResult[] = [];
        try {
            // 맥락 분석된 키워드로 검색 (원본 질문 직접 검색 X)
            searchResults = await SearchAPI.multiSearch(contextAnalysis.searchKeywords);
            updateProgress('웹 검색', 'completed', `${searchResults.length}개 결과`);
        } catch (error: any) {
            updateProgress('웹 검색', 'failed', error.message);
            throw error;
        }

        // ============================================
        // Phase B2: 출처 검증 및 필터링
        // ============================================
        updateProgress('출처 검증', 'in-progress', 'URL 및 신뢰도 검증...');

        const rawSources: ResearchSource[] = searchResults.map(result => ({
            title: result.title,
            url: result.link,
            snippet: result.snippet,
            domain: result.displayLink,
            trustScore: SourceManager.calculateTrustScore(result.displayLink)
        }));

        const validationResult = await SourceManager.validateAndFilter(rawSources);
        const reliableSources = SourceManager.filterReliableSources(validationResult.sources, 70);

        if (reliableSources.length === 0) {
            updateProgress('출처 검증', 'failed', '신뢰 출처 없음');
            throw new Error('신뢰할 수 있는 출처를 찾을 수 없습니다.');
        }

        updateProgress('출처 검증', 'completed',
            `${reliableSources.length}/${rawSources.length}개 신뢰 출처`);

        // ============================================
        // Phase A2: 5단계 추론 엔진
        // ============================================
        updateProgress('AI 추론', 'in-progress',
            contextAnalysis.complexity === 'simple' ? '직접 답변 생성...' : '5단계 추론 수행...');

        const reasoningResult = await ReasoningEngine.process(
            query,
            contextAnalysis,
            reliableSources,
            (step) => {
                if (step.status === 'completed') {
                    console.log(`  ✓ ${step.name}: ${step.result || 'OK'}`);
                }
            }
        );

        updateProgress('AI 추론', 'completed',
            `신뢰도: ${(reasoningResult.confidence * 100).toFixed(0)}%`);

        // ============================================
        // Phase A3: 품질 검증
        // ============================================
        updateProgress('품질 검증', 'in-progress', '교차 검증 및 품질 평가...');

        const qualityScore = QualityVerifier.verify(
            reasoningResult.clearAnswer,
            reliableSources
        );

        updateProgress('품질 검증', 'completed',
            `품질 점수: ${qualityScore.overall}/10 (${qualityScore.passed ? 'PASS' : 'FAIL'})`);

        // ============================================
        // Phase B1: 템플릿 포맷팅 (표준 리포트 구조)
        // ============================================
        updateProgress('리포트 포맷', 'in-progress', `${contextAnalysis.intent} 템플릿 적용...`);

        // 콘텐츠 구조화
        const structuredContent = this.structureContent(
            query,
            contextAnalysis,
            reasoningResult.clearAnswer
        );

        const templateVars: TemplateVariables = ResponseTemplates.createDefaultVariables(
            structuredContent.title,           // 제목
            structuredContent.executiveSummary, // 요약
            structuredContent.introduction,     // 서론
            structuredContent.mainBody,         // 본론
            structuredContent.conclusion,       // 결론
            reliableSources,
            reasoningResult.confidence
        );

        const formattedReport = ResponseTemplates.format(contextAnalysis.intent, templateVars);

        updateProgress('리포트 포맷', 'completed',
            `${formattedReport.metadata.wordCount}단어, ${formattedReport.metadata.sourceCount}개 출처`);

        // ============================================
        // 후속 질문 생성
        // ============================================
        updateProgress('후속 질문 생성', 'in-progress', '관련 질문 추천 중...');

        const followUpQuestions = await this.generateFollowUpQuestions(
            query,
            contextAnalysis,
            reasoningResult.clearAnswer
        );

        updateProgress('후속 질문 생성', 'completed', `${followUpQuestions.length}개 질문 생성`);

        // ============================================
        // 최종 리포트 생성
        // ============================================
        const report: ResearchReport = {
            id: reportId,
            query,
            summary: structuredContent.executiveSummary,
            detailedAnalysis: formattedReport.markdown,
            sources: reliableSources,
            prosAndCons: { pros: [], cons: [] },
            relatedTopics: [],
            createdAt: new Date().toISOString(),
            searchProgress: progress,

            // Phase A-B 필드
            contextAnalysis,
            reasoningResult,
            qualityScore,
            formattedReport,

            // 후속 질문 관련
            parentReportId: options?.parentReportId,
            followUpQuestions,
            isDeepAnalysis
        };

        // ============================================
        // Phase C: 캐시 저장
        // ============================================
        ResearchCacheService.cacheReport(query, isDeepAnalysis, report);

        // ============================================
        // Phase D: 분석 추적
        // ============================================
        const duration = Date.now() - startTime;
        ResearchAnalyticsService.trackReport(query, isDeepAnalysis, duration, true);

        // 저장
        this.saveReport(report);

        console.log(`✅ Research complete: ${reportId} (${duration}ms)`);
        return report;
    },

    /**
     * 🔄 후속 질문 생성
     */
    async generateFollowUpQuestions(
        query: string,
        context: ContextAnalysis,
        answer: string
    ): Promise<string[]> {
        const groqClient = getGroqClient();

        const prompt = `다음 질문과 답변을 바탕으로 사용자가 이어서 물어볼 수 있는 후속 질문 3개를 생성하세요.

## 원본 질문
"${query}"

## 질문 의도
${context.intent}

## 답변 요약
${answer.substring(0, 500)}...

## 지시
JSON 배열 형식으로 3개의 후속 질문을 생성하세요 (순수 JSON만):
["후속 질문 1", "후속 질문 2", "후속 질문 3"]

## 후속 질문 원칙
1. 원본 질문을 더 깊이 파고드는 질문
2. 관련 주제로 확장하는 질문
3. 실용적 적용을 묻는 질문`;

        let response = '';
        try {
            await groqClient.streamChat(
                {
                    model: 'openai/gpt-oss-120b',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.5,
                    max_tokens: 300
                },
                (chunk: string, full: string) => { response = full; }
            );

            const match = response.match(/\[[\s\S]*\]/);
            if (match) {
                return JSON.parse(match[0]).slice(0, 3);
            }
        } catch (e) {
            console.error('Follow-up question generation failed:', e);
        }

        // 폴백
        return [
            `${query}의 장단점은 무엇인가요?`,
            `${query}와 관련된 최신 동향은?`,
            `${query}를 실제로 적용하려면 어떻게 해야 하나요?`
        ];
    },

    /**
     * 🔄 후속 질문으로 리서치 수행
     */
    async performFollowUpResearch(
        followUpQuery: string,
        parentReportId: string,
        onProgress?: (progress: SearchProgress) => void,
        options?: ResearchOptions
    ): Promise<ResearchReport> {
        return this.performResearch(followUpQuery, onProgress, {
            ...options,
            parentReportId
        });
    },

    /**
     * 콘텐츠 구조화 (표준 리포트 구조)
     * 제목 → 요약 → 서론 → 본론 → 결론
     */
    structureContent(
        query: string,
        context: ContextAnalysis,
        rawContent: string
    ): {
        title: string;
        executiveSummary: string;
        introduction: string;
        mainBody: string;
        conclusion: string;
    } {
        const intentTitles: Record<IntentType, string> = {
            'definition': '개념 분석',
            'comparison': '비교 분석',
            'fact-check': '팩트 체크',
            'how-to': '실행 가이드',
            'opinion': '전망 분석',
            'exploration': '동향 분석'
        };

        // 1. 제목 생성
        const mainTopic = context.entities[0]?.text || query.replace(/[?？]/g, '').trim();
        const title = `${mainTopic} - ${intentTitles[context.intent] || '분석 보고서'}`;

        // 2. 본문에서 섹션 추출
        const sections = this.parseSections(rawContent);

        // 3. 요약 (Executive Summary) - 핵심 내용 3-4문장
        let executiveSummary = sections.summary || '';
        if (!executiveSummary) {
            // 첫 번째 의미있는 단락 사용
            const paragraphs = rawContent.split('\n\n').filter(p => p.trim().length > 50);
            executiveSummary = paragraphs[0]?.substring(0, 300) || `${mainTopic}에 대한 분석 결과입니다.`;
        }

        // 4. 서론 - 배경, 목적, 범위
        const introduction = `본 보고서는 "${query}"에 대한 분석을 제공합니다.\n\n` +
            `신뢰할 수 있는 출처를 기반으로 객관적인 정보를 정리하였으며, ` +
            `${context.intent === 'definition' ? '개념 정의와 특징' :
                context.intent === 'comparison' ? '비교 분석과 차이점' :
                    context.intent === 'fact-check' ? '사실 검증 결과' :
                        context.intent === 'how-to' ? '단계별 실행 방법' :
                            context.intent === 'opinion' ? '다양한 시각과 전망' :
                                '최신 동향과 시사점'}을 다룹니다.`;

        // 5. 본론 - 현황 분석 → 문제점/특징 → 대안/시사점
        let mainBody = sections.analysis || sections.content || rawContent;
        // 마크다운 정리
        mainBody = mainBody
            .replace(/^#+\s*요약.*$/gm, '')
            .replace(/^#+\s*결론.*$/gm, '')
            .replace(/^#+\s*장점.*$/gm, '')
            .replace(/^#+\s*단점.*$/gm, '')
            .replace(/^#+\s*긍정적.*$/gm, '')
            .replace(/^#+\s*우려.*$/gm, '')
            .trim();

        // 6. 결론 및 제언
        let conclusion = sections.conclusion || '';
        if (!conclusion) {
            conclusion = `${mainTopic}에 대한 분석 결과, ` +
                `위 내용을 종합하여 의사결정에 참고하시기 바랍니다.\n\n` +
                `**주요 시사점:**\n` +
                `- 신뢰할 수 있는 출처를 기반으로 분석되었습니다.\n` +
                `- 추가적인 검토가 필요한 경우 참고자료를 확인하세요.`;
        }

        return {
            title,
            executiveSummary,
            introduction,
            mainBody,
            conclusion
        };
    },

    /**
     * 본문에서 섹션 파싱
     */
    parseSections(content: string): {
        summary?: string;
        analysis?: string;
        content?: string;
        conclusion?: string;
    } {
        const result: any = {};

        // 요약 섹션
        const summaryMatch = content.match(/#{1,3}\s*요약[:\s]*([\s\S]*?)(?=#{1,3}\s|$)/i);
        if (summaryMatch) result.summary = summaryMatch[1].trim();

        // 분석/본문 섹션
        const analysisMatch = content.match(/#{1,3}\s*(분석|본론|상세)[:\s]*([\s\S]*?)(?=#{1,3}\s*(결론|장점|단점)|$)/i);
        if (analysisMatch) result.analysis = analysisMatch[2].trim();

        // 결론 섹션
        const conclusionMatch = content.match(/#{1,3}\s*결론[:\s]*([\s\S]*?)(?=#{1,3}\s|$)/i);
        if (conclusionMatch) result.conclusion = conclusionMatch[1].trim();

        // 전체 콘텐츠 (폴백)
        result.content = content;

        return result;
    },

    /**
     * 신뢰도 점수 계산 (레거시 호환)
     */
    calculateTrustScore(domain: string): number {
        return SourceManager.calculateTrustScore(domain);
    },

    /**
     * 리포트 저장
     */
    saveReport(report: ResearchReport): void {
        const reports = this.getReports();
        reports.unshift(report);
        localStorage.setItem('research_reports', JSON.stringify(reports.slice(0, 20)));
    },

    /**
     * 저장된 리포트 가져오기
     */
    getReports(): ResearchReport[] {
        const stored = localStorage.getItem('research_reports');
        return stored ? JSON.parse(stored) : [];
    },

    /**
     * 리포트 조회
     */
    getReport(id: string): ResearchReport | null {
        const reports = this.getReports();
        return reports.find(r => r.id === id) || null;
    }
};

export default ResearchService;
