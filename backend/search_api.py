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

from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from duckduckgo_search import DDGS
import time
import asyncio
from typing import List

# curl_cffi 설치 확인 (Vercel 배포 시 의존성 문제 방지)
try:
    from curl_cffi import requests as cffi_requests
    from bs4 import BeautifulSoup
    CURL_CFFI_AVAILABLE = True
except ImportError:
    CURL_CFFI_AVAILABLE = False
    print("Warning: curl_cffi or beautifulsoup4 not found. /api/visit will fail.")

app = FastAPI(title="DuckDuckGo Search API")
router = APIRouter(prefix="/api") # prefix="/api"


# CORS 설정 (프론트엔드 연동)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Vercel 등 다양한 환경 지원을 위해 * 허용 (보안 필요 시 수정)
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
    return {"message": "DuckDuckGo Search API (Please use /api/search)"}

@router.get("/health")
async def health():
    return {"status": "healthy"}

@router.post("/search", response_model=SearchResponse)
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

class VisitRequest(BaseModel):
    url: str

@router.post("/visit")
async def visit_page(request: VisitRequest):
    """
    URL 콘텐츠 스크래핑 (Bot 차단 우회)
    - curl_cffi 사용하여 TLS Fingerprint 변조
    - 실제 브라우저 헤더 사용
    """
    if not CURL_CFFI_AVAILABLE:
        return {
            "url": request.url,
            "status": 500,
            "error": "curl_cffi not installed on server",
            "content": ""
        }

    try:
        print(f"[Visit] Fetching: {request.url}")
        
        # 1. 헤더 위장 (User Provided)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        }

        # 2. TLS Fingerprint Impression (Chrome 110)
        # cffi_requests는 여기서 이미 import됨 (top-level check)
        response = cffi_requests.get(
            request.url,
            headers=headers,
            impersonate="chrome110",
            timeout=15
        )
        
        # 인코딩 자동 감지
        if response.encoding is None:
            response.encoding = 'utf-8'

        print(f"[Visit] Status: {response.status_code}")
        
        if response.status_code >= 400:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch page")

        # 3. HTML 파싱 & 텍스트 추출
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 불필요한 태그 제거
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'iframe']):
            tag.decompose()
            
        text = soup.get_text(separator='\n', strip=True)
        title = soup.title.string if soup.title else ""
        
        # 요약 (최대 5000자)
        summary = text[:5000]
        
        return {
            "url": request.url,
            "status": response.status_code,
            "title": title,
            "content": summary,
            "length": len(text)
        }

    except Exception as e:
        print(f"[Error] Visit error: {str(e)}")
        # 에러 나도 200으로 반환하되 에러 메시지 포함 (프론트 핸들링 용이)
        return {
            "url": request.url,
            "status": 500,
            "error": str(e),
            "content": ""
        }

# 라우터 등록
app.include_router(router)

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
