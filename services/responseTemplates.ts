/**
 * Response Templates - Professional Report Structure
 * 두괄식 + MECE + 개조식 표준 리포트
 */

import { IntentType } from './contextAnalyzer';

export interface TemplateVariables {
    [key: string]: any;
}

export const ResponseTemplates = {
    selectTemplate(intentType: IntentType): (vars: TemplateVariables) => string {
        const templates = {
            definition: this.standardReportTemplate,
            comparison: this.comparisonReportTemplate,
            'fact-check': this.factCheckReportTemplate,
            'how-to': this.howToReportTemplate,
            opinion: this.opinionReportTemplate,
            exploration: this.standardReportTemplate
        };

        return templates[intentType] || this.standardReportTemplate;
    },

    /**
     * 표준 리포트 템플릿 (Definition/Exploration)
     * 구조: 제목 → 요약 → 본론 → 결론
     */
    standardReportTemplate(vars: TemplateVariables): string {
        return `# ${vars.title || '리서치 결과'}

## 📋 Executive Summary (핵심 요약)

${vars.executiveSummary || vars.summary || ''}

**신뢰도**: ${vars.confidence || 'N/A'} | **출처 수**: ${vars.sourceCount || 0}개

---

## 🎯 서론 (Introduction)

${vars.introduction || `"${vars.query || vars.title}"에 대한 리서치 결과입니다.`}

---

## 📊 본론 (Main Content)

### 1. 현황 분석
${vars.currentStatus || vars.mainContent || ''}

${vars.keyPoints ? `### 2. 주요 발견사항 (Key Findings)\n${this.formatBulletPoints(vars.keyPoints)}` : ''}

${vars.analysis ? `### 3. 상세 분석\n${vars.analysis}` : ''}

---

## ✅ 결론 및 제언 (Conclusion & Recommendations)

${vars.conclusion || ''}

${vars.recommendations ? `\n**실행 방안 (Action Plan)**:\n${this.formatBulletPoints(vars.recommendations)}` : ''}

---

## 📚 참고자료 (References)
${this.formatReferences(vars.references)}`;
    },

    /**
     * 비교 리포트 (Comparison)
     */
    comparisonReportTemplate(vars: TemplateVariables): string {
        return `# ${vars.title || `${vars.itemA} vs ${vars.itemB}`}

## 📋 Executive Summary

${vars.executiveSummary || `${vars.itemA}와 ${vars.itemB}의 비교 분석 결과입니다.`}

**결론**: ${vars.finalVerdict || '상황에 따라 선택'}

---

## 📊 비교표 (Comparison Matrix)

| 평가 항목 | ${vars.itemA} | ${vars.itemB} | 우위 |
|----------|--------------|--------------|------|
${this.formatComparisonRows(vars.comparisonRows)}

---

## 🔍 상세 분석 (Detailed Analysis)

### ${vars.itemA}의 특징
${this.formatBulletPoints(vars.itemA_features || [])}

**장점**:
${this.formatBulletPoints(vars.itemA_pros || [])}

**단점**:
${this.formatBulletPoints(vars.itemA_cons || [])}

### ${vars.itemB}의 특징
${this.formatBulletPoints(vars.itemB_features || [])}

**장점**:
${this.formatBulletPoints(vars.itemB_pros || [])}

**단점**:
${this.formatBulletPoints(vars.itemB_cons || [])}

---

## ✅ 추천 (Recommendation)

${vars.recommendation || ''}

**선택 기준**:
${this.formatBulletPoints(vars.selectionCriteria || [])}

---

## 📚 참고자료
${this.formatReferences(vars.references)}`;
    },

    /**
     * 사실 확인 리포트 (Fact-Check)
     */
    factCheckReportTemplate(vars: TemplateVariables): string {
        const verdictIcon = {
            'true': '✅',
            'partially-true': '⚠️',
            'false': '❌',
            'unverified': '❓'
        };

        return `# 사실 확인: ${vars.claim}

## 📋 검증 결과 (Verdict)

${verdictIcon[vars.verdict as keyof typeof verdictIcon] || '❓'} **${vars.verdictText || '확인 불가'}**

**신뢰도**: ${vars.confidence || 'N/A'} | **출처 일치도**: ${vars.agreementScore || 'N/A'}%

---

## 🔍 검증 과정 (Verification Process)

### 1. 출처 분석
${this.formatBulletPoints(vars.sourceAnalysis || [])}

### 2. 팩트 체크
${this.formatBulletPoints(vars.factChecks || [])}

### 3. 교차 검증
${vars.crossVerification || ''}

---

## 📊 근거 (Evidence)

${vars.evidence || ''}

${vars.supportingData ? `\n**데이터 지표**:\n${this.formatBulletPoints(vars.supportingData)}` : ''}

---

## ⚠️ 주의사항 (Caveats)

${this.formatBulletPoints(vars.caveats || [])}

---

## 📚 참고자료
${this.formatReferences(vars.references)}`;
    },

    /**
     * How-To 리포트
     */
    howToReportTemplate(vars: TemplateVariables): string {
        return `# ${vars.title || vars.task}

## 📋 Executive Summary

${vars.executiveSummary || `"${vars.task}" 실행 가이드입니다.`}

**예상 소요시간**: ${vars.estimatedTime || 'N/A'} | **난이도**: ${vars.difficulty || '중'}

---

## 🎯 실행 단계 (Step-by-Step Guide)

${this.formatHowToSteps(vars.steps || [])}

---

## ⚠️ 주의사항 (Precautions)

${this.formatBulletPoints(vars.warnings || [])}

---

## 💡 Pro Tips

${this.formatBulletPoints(vars.proTips || [])}

${vars.alternatives ? `\n## 🔄 대안 방법 (Alternatives)\n\n${vars.alternatives}` : ''}

---

## 📚 참고자료
${this.formatReferences(vars.references)}`;
    },

    /**
     * 의견/논쟁 리포트 (Opinion)
     */
    opinionReportTemplate(vars: TemplateVariables): string {
        return `# ${vars.title || vars.topic}

## 📋 Executive Summary

${vars.executiveSummary || `"${vars.topic}"에 대한 다양한 관점 분석입니다.`}

**편향도**: ${vars.biasScore || 'Low'} | **신뢰도**: ${vars.confidence || 'N/A'}

---

## 🔍 관점 분석 (Perspective Analysis)

### 찬성 입장 (Pro)
${vars.proArgument || ''}

**주요 근거**:
${this.formatBulletPoints(vars.proEvidence || [])}

### 반대 입장 (Con)
${vars.conArgument || ''}

**주요 근거**:
${this.formatBulletPoints(vars.conEvidence || [])}

${vars.neutralPerspective ? `\n### 중립 입장 (Neutral)\n${vars.neutralPerspective}` : ''}

---

## 📊 비교 분석

| 요소 | 찬성 | 반대 |
|------|------|------|
${this.formatOpinionRows(vars.opinionRows || [])}

---

## ✅ 균형잡힌 결론 (Balanced Conclusion)

${vars.balancedConclusion || ''}

**고려사항**:
${this.formatBulletPoints(vars.considerations || [])}

---

## 📚 참고자료
${this.formatReferences(vars.references)}`;
    },

    // ============================================
    // 헬퍼 함수들
    // ============================================

    /**
     * Bullet points 포맷
     */
    formatBulletPoints(items: string[] | any[]): string {
        if (!Array.isArray(items) || items.length === 0) {
            return '- (정보 없음)';
        }

        return items.map((item, i) => {
            if (typeof item === 'string') {
                return `${i + 1}. ${item}`;
            } else if (item.title && item.description) {
                return `${i + 1}. **${item.title}**: ${item.description}`;
            }
            return `${i + 1}. ${JSON.stringify(item)}`;
        }).join('\n');
    },

    /**
     * 비교표 행 포맷
     */
    formatComparisonRows(rows: any[]): string {
        if (!Array.isArray(rows) || rows.length === 0) {
            return '| 성능 | 데이터 없음 | 데이터 없음 | - |';
        }

        return rows.map(row => {
            const winner = row.winner || '-';
            return `| ${row.category} | ${row.itemA} | ${row.itemB} | ${winner} |`;
        }).join('\n');
    },

    /**
     * 의견 비교표 행 포맷
     */
    formatOpinionRows(rows: any[]): string {
        if (!Array.isArray(rows) || rows.length === 0) {
            return '| 근거 강도 | 데이터 없음 | 데이터 없음 |';
        }

        return rows.map(row => {
            return `| ${row.aspect} | ${row.pro} | ${row.con} |`;
        }).join('\n');
    },

    /**
     * How-To 단계 포맷
     */
    formatHowToSteps(steps: any[]): string {
        if (!Array.isArray(steps) || steps.length === 0) {
            return '1. (단계 정보 없음)';
        }

        return steps.map((step, i) => {
            let output = `### 단계 ${i + 1}: ${step.title}\n\n${step.description}`;

            if (step.code) {
                output += `\n\n\`\`\`${step.language || ''}\n${step.code}\n\`\`\``;
            }

            if (step.notes) {
                output += `\n\n> 💡 **참고**: ${step.notes}`;
            }

            return output;
        }).join('\n\n');
    },

    /**
     * 참고자료 포맷
     */
    formatReferences(refs: any[]): string {
        if (!Array.isArray(refs) || refs.length === 0) {
            return '(참고자료 없음)';
        }

        return refs.map((ref, i) => {
            const title = ref.title || ref.domain || 'Unknown';
            const url = ref.url || '#';
            const domain = ref.domain || '';
            const trustScore = ref.trustScore ? ` (신뢰도: ${ref.trustScore}점)` : '';

            return `${i + 1}. [${title}](${url}) - ${domain}${trustScore}`;
        }).join('\n');
    }
};

/**
 * GPT 프롬프트 생성 헬퍼
 */
export const PromptTemplates = {
    /**
     * 표준 리포트 작성 프롬프트
     */
    getStandardReportPrompt(query: string, sources: string): string {
        return `"${query}"에 대한 전문 리포트를 작성하세요.

**출처**:
${sources}

**작성 원칙**:
1. **두괄식**: 결론부터 먼저 제시
2. **MECE**: 중복 없이, 누락 없이
3. **개조식**: 번호 붙인 항목별 나열
4. **수치 명확**: "매우" 대신 "15% 증가" 등 구체적 수치 사용

**필수 구조**:
1. Executive Summary (핵심 내용 3-5문장)
2. 현황 분석 (객관적 사실)
3. 주요 발견사항 (번호 목록)
4. 결론 및 제언 (action plan 포함)

JSON 형식으로 응답:
{
  "executiveSummary": "...",
  "currentStatus": "...",
  "keyPoints": ["1. ...", "2. ..."],
  "conclusion": "...",
  "recommendations": ["1. ...", "2. ..."]
}`;
    }
};
