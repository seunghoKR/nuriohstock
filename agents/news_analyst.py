import requests
import feedparser
from loguru import logger
from enum import Enum
from data.dart_fetcher import DARTFetcher

class StrategySignal(Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"

class NewsAnalyst:
    def __init__(self):
        self.dart_fetcher = DARTFetcher()

    def analyze(self, ticker: str, company_name: str) -> dict:
        logger.info(f"Analyzing news and disclosures for {company_name} ({ticker})")
        disclosures = self.dart_fetcher.get_recent_disclosures(ticker)
        news = self._fetch_naver_news(company_name)
        
        texts = [d.get('report_nm', '') for d in disclosures] + [n.get('title', '') for n in news]
        if not texts:
            score = 0.0
        else:
            score = self._analyze_with_llm(texts)
        
        return {
            "ticker": ticker,
            "company_name": company_name,
            "score": score
        }

    def _fetch_naver_news(self, company_name: str) -> list:
        url = f"https://newssearch.naver.com/search.naver?where=rss&query={company_name}"
        try:
            d = feedparser.parse(url)
            return [{'title': entry.title, 'link': entry.link} for entry in d.entries[:10]]
        except Exception as e:
            logger.error(f"Error fetching news for {company_name}: {e}")
            return []

    def _analyze_with_llm(self, texts: list) -> float:
        try:
            url = "http://localhost:1234/v1/chat/completions"
            payload = {
                "messages": [{"role": "user", "content": f"Analyze sentiment of these texts and return a score between -1.0 and 1.0 (Only return the number, nothing else): {texts}"}],
                "temperature": 0.0
            }
            res = requests.post(url, json=payload, timeout=5)
            if res.status_code == 200:
                content = res.json()['choices'][0]['message']['content'].strip()
                try:
                    return float(content)
                except ValueError:
                    logger.warning(f"Failed to parse LLM response to float: {content}")
        except Exception as e:
            logger.warning(f"LLM failed, falling back to rules: {e}")
            
        pos_words = ['신고가', '호실적', '수주', '계약 체결', '상승']
        neg_words = ['적자', '손실', '하락', '조사', '리콜', '분쟁']
        
        score = 0.0
        text_str = " ".join(texts)
        for w in pos_words:
            if w in text_str:
                score += 0.2
        for w in neg_words:
            if w in text_str:
                score -= 0.2
                
        return max(-1.0, min(1.0, score))

    def get_news_signal(self, ticker: str, company_name: str = "") -> StrategySignal:
        analysis = self.analyze(ticker, company_name)
        score = analysis["score"]
        if score > 0.3:
            return StrategySignal.BUY
        elif score < -0.3:
            return StrategySignal.SELL
        return StrategySignal.HOLD
