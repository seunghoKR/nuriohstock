from loguru import logger
from enum import Enum
import requests
import datetime
from data.pykrx_fetcher import PyKRXFetcher
from agents.news_analyst import NewsAnalyst, StrategySignal

class TechnicalAnalyst:
    def analyze(self, ticker: str, slot_config: dict) -> StrategySignal:
        return StrategySignal.HOLD

class Orchestrator:
    def __init__(self):
        self.technical_analyst = TechnicalAnalyst()
        self.news_analyst = NewsAnalyst()
        self.pykrx = PyKRXFetcher()

    def analyze(self, ticker: str, slot_config: dict) -> StrategySignal:
        logger.info(f"Orchestrator analyzing {ticker}")
        
        tech_signal = self.technical_analyst.analyze(ticker, slot_config)
        
        # fallback if company_name search isn't provided
        company_name = self.pykrx.search_ticker(ticker) 
        
        news_signal = self.news_analyst.get_news_signal(ticker, company_name)
        market_sentiment = self._evaluate_market_sentiment()
        
        logger.info(f"Tech Signal: {tech_signal.name}, News Signal: {news_signal.name}, Market Sentiment: {market_sentiment:.2f}")
        
        def sig_to_val(sig):
            if sig == StrategySignal.BUY: return 1.0
            if sig == StrategySignal.SELL: return -1.0
            return 0.0
            
        tech_val = sig_to_val(tech_signal) * 0.40
        news_val = sig_to_val(news_signal) * 0.25
        market_val = market_sentiment * 0.35
        
        total = tech_val + news_val + market_val
        
        final_signal = StrategySignal.HOLD
        if total > 0.2:
            final_signal = StrategySignal.BUY
        elif total < -0.2:
            final_signal = StrategySignal.SELL
            
        reasoning = self._generate_reasoning({
            "tech": tech_signal.name,
            "news": news_signal.name,
            "market": market_sentiment,
            "total_score": total,
            "final": final_signal.name
        })
        logger.info(f"Reasoning: {reasoning}")
        return final_signal

    def _evaluate_market_sentiment(self) -> float:
        try:
            end = datetime.datetime.today()
            start = end - datetime.timedelta(days=7)
            from pykrx import stock
            df = stock.get_index_ohlcv_by_date(start.strftime("%Y%m%d"), end.strftime("%Y%m%d"), "1001")
            if df.empty:
                return 0.0
            returns = (df['종가'].iloc[-1] - df['종가'].iloc[0]) / df['종가'].iloc[0]
            if returns > 0.01:
                return 0.5
            elif returns < -0.01:
                return -0.5
            return 0.0
        except Exception as e:
            logger.warning(f"Failed to evaluate market sentiment: {e}")
            return 0.0

    def _generate_reasoning(self, signals: dict) -> str:
        try:
            url = "http://localhost:1234/v1/chat/completions"
            prompt = f"한국어로 매매 근거를 자연스럽게 1-2문장으로 작성해주세요. 분석 결과 요약: 기술적 분석 {signals['tech']}, 뉴스 분석 {signals['news']}, 시장 상황 스코어 {signals['market']:.2f}, 최종 스코어 {signals['total_score']:.2f} -> 최종 결정 {signals['final']}."
            payload = {
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7
            }
            res = requests.post(url, json=payload, timeout=5)
            if res.status_code == 200:
                return res.json()['choices'][0]['message']['content'].strip()
        except Exception:
            pass
            
        return f"기술적 지표({signals['tech']}), 뉴스 지표({signals['news']}), 시장 상황({signals['market']:.2f})을 종합하여 {signals['final']} 의견을 냅니다."
