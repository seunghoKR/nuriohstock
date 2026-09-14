from typing import Dict, Any, Tuple
from loguru import logger
from strategies.base_strategy import StrategySignal

class SignalAgent:
    """
    매매 신호 에이전트: 신호를 검증하고, 텔레그램 승인을 거쳐 주문을 처리합니다.
    """
    def __init__(self, telegram_bot=None, risk_manager=None, order_engine=None):
        self.telegram = telegram_bot
        self.risk_manager = risk_manager
        self.order_engine = order_engine
        self.auto_trade = True  # 대표님 요청: 살까요? 말고 '매수 완료했어요' 전자동 모드

    def process_signal(self, signal: StrategySignal, slot_config: dict):
        if signal.action == 'HOLD':
            return
            
        slot_id = slot_config.get('slot_id', '1')
        ticker = signal.ticker
        strategy_name = slot_config.get('strategy_type', '추천전략')
        tp = slot_config.get('take_profit_pct', 3.5)
        sl = slot_config.get('stop_loss_pct', 2.0)
        
        logger.info(f"[{ticker}] {signal.action} 신호 감지 -> 전자동 주문 처리 시작")
        
        # 1. 리스크 관리 체크
        if signal.action == 'BUY':
            if self.risk_manager and self.risk_manager.circuit_breaker_active:
                logger.warning("서킷 브레이커가 활성화되어 있어 매수 주문을 일시 차단합니다.")
                return
            if self.risk_manager and not self.risk_manager.check_daily_loss():
                return

        # 2. 전자동 주문 실행 (살까요? 없이 즉시 실행!)
        if self.auto_trade:
            if signal.action == 'BUY':
                logger.info(f"[{ticker}] 🚀 자동 매수 즉시 집행!")
                res = self.order_engine.execute_buy(slot_id, ticker, strategy_name, signal.reason, int(signal.price))
                
                # 3. 텔레그램 매수 완료 알림 카드 즉시 발송!
                msg = (
                    f"🚀 [매수 체결 완료]\n\n"
                    f"• 종목코드: {ticker}\n"
                    f"• 적용전략: {strategy_name}\n"
                    f"• 체결단가: {int(signal.price):,}원\n"
                    f"• 목표익절: +{tp}%\n"
                    f"• 안전손절: -{sl}%\n"
                    f"• 진입근거: {signal.reason}\n\n"
                    f"✨ 대표님, 주문이 정상 체결되어 지금부터 실시간 익절/손절 감시에 들어갑니다!"
                )
                if self.telegram:
                    self.telegram.send_signal_message(msg)
                    
            elif signal.action == 'SELL':
                logger.info(f"[{ticker}] 💰 자동 매도 즉시 집행!")
                qty = slot_config.get('holding_qty', 1)
                res = self.order_engine.execute_sell(slot_id, ticker, qty, signal.reason)
                
                # 텔레그램 매도 완료 정산 카드 발송
                msg = (
                    f"💰 [매도 체결 완료 (정산)]\n\n"
                    f"• 종목코드: {ticker}\n"
                    f"• 매도사유: {signal.reason}\n"
                    f"• 체결가격: {int(signal.price):,}원\n\n"
                    f"✅ 포지션 정리가 완료되어 다음 줍줍 기회를 탐색합니다!"
                )
                if self.telegram:
                    self.telegram.send_signal_message(msg)
            return

        # 승인 모드 (필요시 레거시)
        msg, reply_markup = self.format_signal_message(signal, slot_config)
        if self.telegram:
            msg_id = self.telegram.send_signal_message(msg, reply_markup)
            if msg_id:
                approved = self.telegram.wait_for_approval(msg_id, timeout=30)
                self.handle_approval(slot_id, signal, approved)

    def format_signal_message(self, signal: StrategySignal, slot: dict) -> Tuple[str, dict]:
        """승인 모드용 텔레그램 메시지"""
        emoji = "🔴" if signal.action == "SELL" else "🔵"
        action_kr = "매도" if signal.action == "SELL" else "매수"
        
        msg = f"📊 {emoji} 신호 발생: {signal.ticker}\n"
        msg += f"전략: {slot.get('strategy_type', 'UNKNOWN')}\n"
        msg += f"액션: {signal.action}\n"
        msg += f"예상가: {signal.price:,.0f} KRW\n"
        msg += f"근거: {signal.reason}\n"
        
        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": f"✅ {action_kr} 승인", "callback_data": f"approve_{signal.ticker}_{signal.action}"},
                    {"text": "❌ 취소", "callback_data": f"reject_{signal.ticker}_{signal.action}"}
                ]
            ]
        }
        return msg, reply_markup
        
    def handle_approval(self, slot_id: str, signal: StrategySignal, approved: bool):
        if approved:
            if signal.action == 'BUY':
                self.order_engine.execute_buy(slot_id, signal.ticker, "MANUAL_APPROVAL", signal.reason, signal.price)
            elif signal.action == 'SELL':
                self.order_engine.execute_sell(slot_id, signal.ticker, 1, signal.reason)
