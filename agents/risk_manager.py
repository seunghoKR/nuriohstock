from typing import Dict, Any
from loguru import logger

class RiskManager:
    """
    리스크 관리 에이전트: 포지션 규모 산정, 손절/익절 조건 확인, 서킷 브레이커 관리
    """
    def __init__(self, kis_client=None):
        self.kis_client = kis_client
        self.positions = {}
        self.high_prices = {}
        self.daily_loss = 0.0
        self.consecutive_losses = 0
        self.circuit_breaker_active = False

    def check_position_size(self, slot_id: str, ticker: str, amount_krw: float, account_balance: float, max_ratio: float = 0.2) -> bool:
        """종목당 최대 비율 초과 여부 확인"""
        max_allowed_amount = account_balance * max_ratio
        if amount_krw > max_allowed_amount:
            logger.warning(f"[{ticker}] 주문 금액({amount_krw:,.0f})이 최대 허용 금액({max_allowed_amount:,.0f})을 초과합니다.")
            return False
        return True

    def check_daily_loss(self, max_daily_loss: float = 500000.0) -> bool:
        """일일 손실 한도 초과 여부 확인"""
        if self.daily_loss >= max_daily_loss:
            logger.error(f"일일 손실 한도({max_daily_loss:,.0f} KRW) 초과! (현재: {self.daily_loss:,.0f} KRW)")
            return False
        return True

    def check_stop_loss(self, slot_id: str, ticker: str, current_price: float, avg_buy_price: float, fixed_sl_pct: float = 0.05, trailing_sl_pct: float = 0.03) -> dict:
        """손절 및 트레일링 스톱 조건 확인"""
        result = {'triggered': False, 'reason': '', 'type': ''}
        
        # 고정 손절 체크
        if current_price <= avg_buy_price * (1 - fixed_sl_pct):
            result.update({'triggered': True, 'reason': f"고정 손절가 도달 (-{fixed_sl_pct*100}%)", 'type': 'FIXED'})
            return result
            
        # 트레일링 스톱 체크
        key = f"{slot_id}_{ticker}"
        high_price = self.high_prices.get(key, avg_buy_price)
        if current_price <= high_price * (1 - trailing_sl_pct):
            result.update({'triggered': True, 'reason': f"최고가 대비 트레일링 스톱 도달 (-{trailing_sl_pct*100}%)", 'type': 'TRAILING'})
            return result
            
        return result

    def check_take_profit(self, slot_id: str, ticker: str, current_price: float, avg_buy_price: float, tp_pct: float = 0.1) -> dict:
        """익절 조건 충족 여부 확인"""
        result = {'triggered': False, 'reason': ''}
        if current_price >= avg_buy_price * (1 + tp_pct):
            result.update({'triggered': True, 'reason': f"목표 수익률 도달 (+{tp_pct*100}%)"})
        return result

    def circuit_breaker(self, max_consecutive_losses: int = 3):
        """연속 손실 발생 시 당일 매매 강제 정지"""
        if self.consecutive_losses >= max_consecutive_losses:
            self.circuit_breaker_active = True
            logger.critical(f"🚨 서킷 브레이커 발동: 연속 손실 {self.consecutive_losses}회. 매매를 중단합니다.")

    def calculate_position_size(self, account_balance: float, max_ratio: float, ticker_price: float) -> int:
        """적정 주문 수량 계산"""
        if ticker_price <= 0:
            return 0
        allocated_amount = account_balance * max_ratio
        return int(allocated_amount // ticker_price)

    def update_high_price(self, slot_id: str, ticker: str, current_price: float):
        """트레일링 스톱용 최고가 업데이트"""
        key = f"{slot_id}_{ticker}"
        current_high = self.high_prices.get(key, 0.0)
        if current_price > current_high:
            self.high_prices[key] = current_price
            logger.debug(f"[{ticker}] 최고가 갱신: {current_price:,.0f} KRW")
