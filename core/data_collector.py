import asyncio
import websockets
import json
import os
from loguru import logger
from typing import Dict, Set

class DataCollector:
    """실시간 데이터 수집기 (Websocket 기반)"""

    def __init__(self, kis_client=None):
        self.kis_client = kis_client
        self.url = "ws://ops.koreainvestment.com:21000"  # Example WS URL (Requires check for real vs mock)
        self.app_key = os.getenv("KIS_APP_KEY")
        self.app_secret = os.getenv("KIS_APP_SECRET")
        self.subscribed_tickers: Set[str] = set()
        self.price_cache: Dict[str, float] = {}
        self._connection = None

    async def connect(self):
        """웹소켓 연결 및 지수 백오프(Exponential Backoff) 적용 재접속"""
        retry_count = 0
        while True:
            try:
                logger.info(f"Connecting to WS: {self.url}")
                async with websockets.connect(self.url) as websocket:
                    self._connection = websocket
                    retry_count = 0  # 성공시 리셋
                    logger.info("WebSocket connected.")
                    
                    # 재접속 시 기존 구독 복구
                    for ticker in self.subscribed_tickers:
                        await self._send_subscribe(ticker)
                        
                    await self._listen(websocket)
                    
            except Exception as e:
                logger.error(f"WebSocket connection error: {e}")
                
            # 백오프 재접속
            retry_count += 1
            wait_time = min(2 ** retry_count, 60)
            logger.warning(f"Reconnecting in {wait_time} seconds...")
            await asyncio.sleep(wait_time)

    async def _listen(self, websocket):
        """메시지 수신 리스너"""
        async for message in websocket:
            try:
                # KIS WS 데이터 파싱 로직 (간소화)
                if "|" in message:
                    parts = message.split("|")
                    if len(parts) >= 4:
                        data = parts[3].split("^")
                        ticker = data[0]
                        price = float(data[2])
                        self.price_cache[ticker] = price
            except Exception as e:
                logger.error(f"Error parsing message: {e}")

    async def _send_subscribe(self, ticker: str, is_unsub=False):
        if not self._connection:
            return
        
        tr_type = "2" if is_unsub else "1"
        body = {
            "header": {
                "approval_key": "YOUR_APPROVAL_KEY", # Requires WS approval key API call
                "custtype": "P",
                "tr_type": tr_type,
                "content-type": "utf-8"
            },
            "body": {
                "input": {
                    "tr_id": "H0STCNT0",
                    "tr_key": ticker
                }
            }
        }
        await self._connection.send(json.dumps(body))
        logger.info(f"{'Unsubscribed' if is_unsub else 'Subscribed'} to {ticker}")

    def subscribe_ticker(self, ticker: str):
        """종목 실시간 구독"""
        if ticker not in self.subscribed_tickers:
            self.subscribed_tickers.add(ticker)
            asyncio.create_task(self._send_subscribe(ticker))

    def unsubscribe_ticker(self, ticker: str):
        """종목 구독 해제"""
        if ticker in self.subscribed_tickers:
            self.subscribed_tickers.remove(ticker)
            asyncio.create_task(self._send_subscribe(ticker, is_unsub=True))

    def get_latest_price(self, ticker: str) -> float:
        """최신 현재가 반환"""
        return self.price_cache.get(ticker, 0.0)
