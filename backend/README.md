# DuckDuckGo Search Backend

Python FastAPI 기반의 검색 API 백엔드

## 설치

```bash
cd backend
pip install -r requirements.txt
```

## 실행

```bash
python search_api.py
```

또는

```bash
uvicorn search_api:app --reload --port 8000
```

## 확인

- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 특징

- ✅ DuckDuckGo 검색 (무료, 무제한)
- ✅ Rate Limiting (1초 간격으로 요청 제한)
- ✅ CORS 설정 (프론트엔드 연동)
- ✅ Google Search API 호환 포맷

## 사용법

프론트엔드에서:
```typescript
import { DuckDuckGoSearchAPI } from './services/searchAPI';

const results = await DuckDuckGoSearchAPI.search('query', 5);
```
