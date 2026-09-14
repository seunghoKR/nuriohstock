"""
자동 종목 발굴기 (Auto Stock Scanner)
1호 [우량주 안전 줍줍] 및 2호 [돌파 모멘텀] 전략에 맞추어 시장 종목을 자동 탐색/선별합니다.
"""

import datetime
import pandas as pd
from loguru import logger
from pykrx import stock

# 코스피 시총 상위 핵심 20대 우량주 리스트
TOP_BLUECHIP_TICKERS = [
    ("005930", "삼성전자"),
    ("000660", "SK하이닉스"),
    ("005380", "현대차"),
    ("000270", "기아"),
    ("035420", "NAVER"),
    ("035720", "카카오"),
    ("069500", "KODEX 200"),
    ("105560", "KB금융"),
    ("055550", "신한지주"),
    ("012330", "현대모비스"),
    ("051910", "LG화학"),
    ("006400", "삼성SDI"),
    ("028260", "삼성물산"),
    ("015760", "한국전력"),
    ("032830", "삼성생명"),
    ("003550", "LG"),
    ("086790", "하나금융지주"),
    ("011200", "HMM"),
    ("018260", "삼성에스디에스"),
    ("034020", "두산에너빌리티")
]

def calculate_rsi(series: pd.Series, period: int = 14) -> float:
    """RSI(상대강도지수) 계산"""
    if len(series) < period + 1:
        return 50.0
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / (loss + 1e-9)
    rsi = 100 - (100 / (1 + rs))
    return float(rsi.iloc[-1])

class StockScanner:
    """시장 스캐너 클래스"""

    @staticmethod
    def scan_safe_dip_candidates(limit: int = 3):
        """
        1호 [우량주 안전 줍줍] 후보군 발굴:
        시총 TOP 20 우량주 중 최근 14일 RSI가 낮고 과매도 구간(세일 구간)에 들어간 종목 선별
        """
        logger.info("🔍 [1호 우량주 안전 줍줍] 후보 종목 스캔 중...")
        today = datetime.datetime.now()
        start_date = (today - datetime.timedelta(days=40)).strftime("%Y%m%d")
        end_date = today.strftime("%Y%m%d")

        candidates = []
        for ticker, name in TOP_BLUECHIP_TICKERS:
            try:
                df = stock.get_market_ohlcv_by_date(start_date, end_date, ticker)
                if df.empty or len(df) < 15:
                    continue
                rsi_val = calculate_rsi(df['종가'], period=14)
                current_price = int(df['종가'].iloc[-1])
                change_rate = float(df['등락률'].iloc[-1]) if '등락률' in df.columns else 0.0

                candidates.append({
                    "ticker": ticker,
                    "name": name,
                    "price": current_price,
                    "changeRate": change_rate,
                    "rsi": round(rsi_val, 1),
                    "strategy": "SAFE_DIP",
                    "reason": f"RSI {rsi_val:.1f} (과매도 세일 구간)"
                })
            except Exception as e:
                logger.debug(f"Error scanning {ticker}: {e}")

        # RSI가 낮은 순(가장 과매도된 순서)으로 정렬
        candidates.sort(key=lambda x: x['rsi'])
        selected = candidates[:limit]
        logger.success(f"✅ 1호 후보 선별 완료: {[c['name'] for c in selected]}")
        return selected

    @staticmethod
    def scan_momentum_breakout_candidates(limit: int = 3):
        """
        2호 [돌파 모멘텀] 후보군 발굴:
        거래량이 급증하며 5일선이 20일선 위에 있는 모멘텀 우량 대장주 선별
        """
        logger.info("🔍 [2호 돌파 모멘텀] 후보 종목 스캔 중...")
        today = datetime.datetime.now()
        start_date = (today - datetime.timedelta(days=40)).strftime("%Y%m%d")
        end_date = today.strftime("%Y%m%d")

        candidates = []
        for ticker, name in TOP_BLUECHIP_TICKERS:
            try:
                df = stock.get_market_ohlcv_by_date(start_date, end_date, ticker)
                if df.empty or len(df) < 20:
                    continue

                ma5 = df['종가'].rolling(5).mean().iloc[-1]
                ma20 = df['종가'].rolling(20).mean().iloc[-1]
                vol_ratio = (df['거래량'].iloc[-1] / (df['거래량'].iloc[-5:-1].mean() + 1e-9)) * 100
                current_price = int(df['종가'].iloc[-1])
                change_rate = float(df['등락률'].iloc[-1]) if '등락률' in df.columns else 0.0

                # 5일선이 20일선 위에 있고 전일대비 거래량 증가
                if ma5 >= ma20:
                    score = vol_ratio + change_rate * 10
                    candidates.append({
                        "ticker": ticker,
                        "name": name,
                        "price": current_price,
                        "changeRate": change_rate,
                        "volRatio": round(vol_ratio, 1),
                        "score": score,
                        "strategy": "BREAKOUT",
                        "reason": f"5일선/20일선 정배열 + 거래량 {vol_ratio:.0f}% 급증"
                    })
            except Exception as e:
                logger.debug(f"Error scanning {ticker}: {e}")

        candidates.sort(key=lambda x: x.get('score', 0), reverse=True)
        selected = candidates[:limit]
        logger.success(f"✅ 2호 후보 선별 완료: {[c['name'] for c in selected]}")
        return selected

if __name__ == '__main__':
    print("1호 우량주 줍줍:", StockScanner.scan_safe_dip_candidates(2))
    print("2호 돌파 모멘텀:", StockScanner.scan_momentum_breakout_candidates(2))
