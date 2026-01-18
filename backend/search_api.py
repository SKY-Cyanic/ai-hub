"""
DuckDuckGo Search API Backend
- duckduckgo-search 라이브러리 사용
- Rate limiting으로 차단 방지 (1초 간격)
- CORS 설정으로 프론트엔드 연동
"""

# Windows cp949 인코딩 문제 해결
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from duckduckgo_search import DDGS
import time
import asyncio
from typing import List

app = FastAPI(title="DuckDuckGo Search API")

# CORS 설정 (프론트엔드 연동)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Vite 기본 포트
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchResult(BaseModel):
    title: str
    link: str
    snippet: str
    displayLink: str
    formattedUrl: str

class SearchRequest(BaseModel):
    query: str
    num: int = 5

class SearchResponse(BaseModel):
    items: List[SearchResult]

# Rate limiting: 마지막 요청 시간 추적
last_request_time = 0
MIN_INTERVAL = 1.0  # 최소 1초 간격

async def rate_limit():
    """요청 간격 제한 (1초)"""
    global last_request_time
    current_time = time.time()
    elapsed = current_time - last_request_time
    
    if elapsed < MIN_INTERVAL:
        wait_time = MIN_INTERVAL - elapsed
        print(f"[Rate Limit] waiting {wait_time:.2f}s")
        await asyncio.sleep(wait_time)
    
    last_request_time = time.time()

@app.get("/")
async def root():
    return {
        "message": "DuckDuckGo Search API",
        "endpoints": {
            "/search": "POST with {query, num}",
            "/health": "GET health check"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    DuckDuckGo 검색 수행
    - Rate limiting 적용 (1초 간격)
    - 최대 10개 결과 반환
    """
    try:
        # Rate limiting
        await rate_limit()
        
        print(f"[Search] Searching for: {request.query} (num: {request.num})")
        
        # DuckDuckGo 검색
        with DDGS() as ddgs:
            results = list(ddgs.text(
                request.query,
                max_results=min(request.num, 10)  # 최대 10개
            ))
        
        print(f"[Success] Found {len(results)} results")
        
        # 결과 포맷 변환
        items = []
        for result in results:
            # DuckDuckGo 결과를 Google Search API 형식으로 변환
            items.append(SearchResult(
                title=result.get('title', ''),
                link=result.get('href', ''),
                snippet=result.get('body', ''),
                displayLink=extract_domain(result.get('href', '')),
                formattedUrl=result.get('href', '')
            ))
        
        return SearchResponse(items=items)
    
    except Exception as e:
        print(f"[Error] Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

def extract_domain(url: str) -> str:
    """URL에서 도메인 추출"""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return parsed.netloc
    except:
        return url

if __name__ == "__main__":
    import uvicorn
    print("[START] Starting DuckDuckGo Search API on http://localhost:8000")
    print("[INFO] Docs available at http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
