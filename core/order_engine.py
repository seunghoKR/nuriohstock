import os
from loguru import logger
from typing import Optional
from .kis_client import KISClient

class OrderEngine:
    """주문 실행 엔진"""

    def __init__(self, kis_client=None, db_connection=None):
        self.kis_client = kis_client or KISClient()
        self.db = db_connection
        self.mode = os.getenv("TRADING_MODE", "live")
        self.daily_loss_limit = float(os.getenv("DAILY_LOSS_LIMIT", "0.03"))
        self.is_paused = False

    def execute_buy(self, slot_id: int, ticker: str, strategy: str, reason: str, price: Optional[int] = None) -> dict:
        """매수 주문 실행"""
        self.circuit_breaker_check()
        if self.is_paused:
            logger.warning(f"Trading paused. Buy order ignored for {ticker}")
            return {}

        amount_krw = 1000000  # Example: DB에서 슬롯별 설정 금액 조회 필요
        target_price = price or int(self.kis_client.get_current_price(ticker)['output']['stck_prpr'])
        quantity = self._calculate_quantity(ticker, amount_krw, target_price)

        if quantity <= 0:
            logger.warning(f"Not enough amount to buy {ticker}")
            return {}

        logger.info(f"Executing BUY for {ticker}: Qty={quantity}, Price={'MKT' if not price else price}")
        res = self.kis_client.place_order(ticker, "BUY", quantity, price or 0)
        
        trade_data = {
            "slot_id": slot_id,
            "ticker": ticker,
            "action": "BUY",
            "quantity": quantity,
            "price": target_price,
            "reason": reason,
            "status": "EXECUTED" if res.get('rt_cd') == '0' else "FAILED"
        }
        self._save_trade_to_db(trade_data)
        return res

    def execute_sell(self, slot_id: int, ticker: str, quantity: int, reason: str) -> dict:
        """매도 주문 실행"""
        logger.info(f"Executing SELL for {ticker}: Qty={quantity}")
        res = self.kis_client.place_order(ticker, "SELL", quantity, 0) # 시장가 매도
        
        trade_data = {
            "slot_id": slot_id,
            "ticker": ticker,
            "action": "SELL",
            "quantity": quantity,
            "price": 0, # 시장가
            "reason": reason,
            "status": "EXECUTED" if res.get('rt_cd') == '0' else "FAILED"
        }
        self._save_trade_to_db(trade_data)
        return res

    def cancel_pending_orders(self):
        """미체결 주문 전체 취소"""
        logger.info("Cancelling all pending orders (not fully implemented yet)")
        # API 조회 후 루프 돌며 self.kis_client.cancel_order 호출

    def _calculate_quantity(self, ticker: str, amount_krw: float, price: int) -> int:
        """주문 수량 계산"""
        if price == 0:
            return 0
        return int(amount_krw // price)

    def _save_trade_to_db(self, trade_data: dict):
        """MariaDB 체결 기록 저장"""
        if not self.db:
            logger.warning("DB not connected, skipping trade save.")
            return
        logger.info(f"Saving trade to DB: {trade_data}")
        # Insert query execution here

    def circuit_breaker_check(self):
        """연속 손실 또는 일일 손실 한도 초과 시 봇 정지"""
        # DB에서 오늘 수익률 조회 후 limit 비교
        today_loss = 0.01  # Mock
        if today_loss >= self.daily_loss_limit:
            logger.error(f"Circuit Breaker Triggered! Loss {today_loss} >= {self.daily_loss_limit}")
            self.is_paused = True
            self.cancel_pending_orders()
