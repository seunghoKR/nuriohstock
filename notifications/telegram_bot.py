import os
import threading
from typing import Dict, Any, Optional
from loguru import logger
import requests
from dotenv import load_dotenv
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CallbackQueryHandler, ContextTypes
import asyncio

load_dotenv()

class TelegramNotifier:
    """
    텔레그램 봇 알림 시스템 (NURIOH 구조 계승)
    python-telegram-bot v20+ 비동기 프레임워크를 기반으로 합니다.
    """
    def __init__(self, enable_polling: bool = False):
        load_dotenv()
        self.token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID")
        self.approval_events = {}
        self.approval_results = {}
        
        if not self.token or not self.chat_id:
            logger.warning("TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID가 .env에 설정되지 않았습니다.")
            
        if self.token and enable_polling:
            try:
                self.application = Application.builder().token(self.token).build()
                self.application.add_handler(CallbackQueryHandler(self._button_callback))
                self._loop_thread = threading.Thread(target=self._run_polling_loop, daemon=True)
                self._loop_thread.start()
            except Exception as e:
                logger.warning(f"텔레그램 폴링 초기화 생략: {e}")

    def _run_polling_loop(self):
        """비동기 폴링을 위한 이벤트 루프 실행"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            self.application.run_polling(drop_pending_updates=True, stop_signals=None)
        except Exception as e:
            logger.warning(f"Telegram polling warning: {e}")

    async def _button_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """콜백 버튼 처리 핸들러"""
        query = update.callback_query
        await query.answer()
        
        data = query.data
        msg_id = query.message.message_id
        
        # 버튼 처리 결과 화면에 반영
        if data.startswith("approve_"):
            self.approval_results[msg_id] = True
            await query.edit_message_text(text=f"{query.message.text}\n\n✅ [승인 완료]")
        elif data.startswith("reject_"):
            self.approval_results[msg_id] = False
            await query.edit_message_text(text=f"{query.message.text}\n\n❌ [거부됨]")
            
        # 이벤트 세팅 (승인 대기 해제)
        if msg_id in self.approval_events:
            self.approval_events[msg_id].set()

    async def send_message(self, message: str, reply_markup: Any = None) -> Optional[int]:
        """비동기 메시지 발송"""
        if not self.token or not self.chat_id:
            return None
        try:
            bot = Bot(token=self.token)
            msg = await bot.send_message(chat_id=self.chat_id, text=message, reply_markup=reply_markup)
            return msg.message_id
        except Exception as e:
            logger.error(f"텔레그램 메시지 발송 실패: {e}")
            return None

    def send_signal_message(self, message: str, reply_markup_dict: dict = None) -> Optional[int]:
        """메시지를 발송하고 message_id를 반환합니다. (스레드 안전)"""
        if not self.token or not self.chat_id:
            return None
            
        try:
            url = f"https://api.telegram.org/bot{self.token}/sendMessage"
            payload = {
                "chat_id": self.chat_id,
                "text": message,
                "disable_web_page_preview": True
            }
            if reply_markup_dict:
                payload["reply_markup"] = reply_markup_dict

            res = requests.post(url, json=payload, timeout=10)
            if res.ok:
                data = res.json()
                return data.get("result", {}).get("message_id")
            else:
                logger.error(f"텔레그램 발송 실패: {res.status_code} - {res.text}")
                return None
        except Exception as e:
            logger.error(f"텔레그램 메시지 발송 예외: {e}")
            return None

    def wait_for_approval(self, message_id: int, timeout: int = 30) -> bool:
        """사용자의 버튼 클릭 응답을 대기합니다."""
        if not message_id:
            return False
            
        event = threading.Event()
        self.approval_events[message_id] = event
        
        logger.info(f"승인 대기 중... (msg_id: {message_id}, timeout: {timeout}s)")
        event.wait(timeout=timeout)
        
        result = self.approval_results.get(message_id, False)
        
        # 리소스 정리
        self.approval_events.pop(message_id, None)
        self.approval_results.pop(message_id, None)
        
        return result

    def send_trade_result(self, trade: dict):
        """체결 완료 알림 (정산 카드 형식)"""
        action_kr = "매수" if trade.get('action') == 'BUY' else "매도"
        icon = "📈" if trade.get('action') == 'BUY' else "📉"
        
        msg = f"{icon} {action_kr} 체결 완료\n"
        msg += f"종목: {trade.get('ticker')}\n"
        msg += f"전략: {trade.get('strategy', 'Unknown')}\n"
        msg += f"체결가: {trade.get('price', 0):,.0f} KRW\n"
        msg += f"수량: {trade.get('qty', 0)} 주\n"
        
        if trade.get('action') == 'SELL':
            msg += f"손익금: {trade.get('pnl_krw', 0):,.0f} KRW\n"
            msg += f"손익률: {trade.get('pnl_pct', 0):.2f}%\n"
            
        self.send_signal_message(msg)

    def send_daily_report(self, report: dict):
        """일일 결산 리포트 알림"""
        msg = f"📊 일일 결산 리포트 ({report.get('date', '')})\n\n"
        msg += f"총 거래횟수: {report.get('total_trades', 0)}회\n"
        msg += f"승률: {report.get('win_rate', 0):.1f}%\n"
        msg += f"총 손익금: {report.get('total_pnl', 0):,.0f} KRW\n\n"
        msg += f"수익 종목:\n{report.get('profitable_tickers', '없음')}"
        
        self.send_signal_message(msg)

    def send_circuit_breaker_alert(self):
        """서킷브레이커 발동 긴급 알림"""
        msg = "🚨 [긴급] 서킷브레이커 발동!\n\n"
        msg += "연속 손실 횟수 초과로 당일 매매가 강제 정지되었습니다.\n"
        msg += "시스템을 점검해주세요."
        self.send_signal_message(msg)
