"""
텔레그램 봇 알림 & 1:1 양방향 대화 시스템 (Telegram Notifier & Conversational Assistant)
대표님과 실시간 1:1 대화(Gemini 3.6 Flash 연동) 및 자동매매 체결/시황 알림을 총괄합니다.
"""

import os
import time
import threading
from typing import Dict, Any, Optional
from loguru import logger
import requests
from dotenv import load_dotenv

load_dotenv()

class TelegramNotifier:
    def __init__(self, enable_polling: bool = False, ai_callback = None):
        load_dotenv()
        self.token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID")
        self.approval_events = {}
        self.approval_results = {}
        self.ai_callback = ai_callback
        self._polling_running = False
        self._poll_thread = None

        if not self.token or not self.chat_id:
            logger.warning("TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID가 .env에 설정되지 않았습니다.")

        if enable_polling:
            self.start_polling(ai_callback)

    def set_ai_callback(self, ai_callback):
        """AI 추론 콜백 함수 등록"""
        self.ai_callback = ai_callback

    def send_chat_action(self, action: str = "typing"):
        """채팅방에 '입력중...' 상태 표시"""
        if not self.token or not self.chat_id:
            return
        try:
            url = f"https://api.telegram.org/bot{self.token}/sendChatAction"
            requests.post(url, json={"chat_id": self.chat_id, "action": action}, timeout=5)
        except Exception:
            pass

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

            res = requests.post(url, json=payload, timeout=12)
            if res.ok:
                data = res.json()
                return data.get("result", {}).get("message_id")
            else:
                logger.error(f"텔레그램 발송 실패: {res.status_code} - {res.text}")
                return None
        except Exception as e:
            logger.error(f"텔레그램 메시지 발송 예외: {e}")
            return None

    # ─────────────────────────────────────────────────────────
    # 📱 1:1 양방향 대화 리스너 (HTTP Long Polling)
    # ─────────────────────────────────────────────────────────
    def start_polling(self, ai_callback = None):
        """텔레그램 메시지 수신 백그라운드 스레드 가동"""
        if not self.token:
            logger.warning("텔레그램 토큰이 없어 폴링을 시작할 수 없습니다.")
            return

        if ai_callback:
            self.ai_callback = ai_callback

        if self._polling_running:
            return

        self._polling_running = True
        self._poll_thread = threading.Thread(target=self._http_polling_worker, daemon=True)
        self._poll_thread.start()
        logger.info("📱 텔레그램 1:1 양방향 대화 리스너 가동 완료")

    def stop_polling(self):
        """폴링 중지"""
        self._polling_running = False

    def _http_polling_worker(self):
        """requests 기반 롱폴링 작업자 스레드"""
        offset = None
        # 시작 시 기존 대기 중인 오래된 메시지는 건너뛰기
        try:
            init_res = requests.get(f"https://api.telegram.org/bot{self.token}/getUpdates?offset=-1&timeout=2", timeout=5)
            if init_res.ok:
                results = init_res.json().get("result", [])
                if results:
                    offset = results[-1]["update_id"] + 1
        except Exception:
            pass

        while self._polling_running:
            try:
                url = f"https://api.telegram.org/bot{self.token}/getUpdates"
                params = {"timeout": 20}
                if offset is not None:
                    params["offset"] = offset

                res = requests.get(url, params=params, timeout=25)
                if not res.ok:
                    time.sleep(3)
                    continue

                data = res.json()
                updates = data.get("result", [])
                for update in updates:
                    offset = update["update_id"] + 1
                    message = update.get("message")
                    if not message:
                        continue

                    chat_id = str(message.get("chat", {}).get("id", ""))
                    text = message.get("text", "").strip()

                    # 보안 체크: 인가된 대표님 CHAT_ID만 응답
                    if str(self.chat_id) and chat_id != str(self.chat_id):
                        logger.warning(f"미인가 사용자 접근 차단 (Chat ID: {chat_id})")
                        continue

                    if not text:
                        continue

                    # 비동기 스레드로 사용자 메시지 처리 (블로킹 방지)
                    threading.Thread(target=self._handle_user_message, args=(text,), daemon=True).start()

            except Exception as e:
                logger.warning(f"텔레그램 폴링 루프 경고: {e}")
                time.sleep(3)

    def _handle_user_message(self, text: str):
        """대표님의 텔레그램 질문 처리 및 AI 답변 발송"""
        try:
            # 1. 텔레그램 화면에 '입력중...' 표시
            self.send_chat_action("typing")

            # 2. 기본 커맨드 처리
            if text in ["/start", "/help", "도움말", "안녕", "영자야"]:
                welcome = (
                    "안녕하세요, 대표님! AI 주식 매매 비서 영자예요! 🎨✨💖\n\n"
                    "이제 텔레그램에서도 저와 24시간 실시간으로 대화하실 수 있어요!\n\n"
                    "💡 이런 질문들을 편하게 해보세요:\n"
                    "• '삼성전자 지금 얼마고 살 타이밍이야?'\n"
                    "• '내 계좌 잔고랑 수익률 브리핑해줘'\n"
                    "• '1호 우량주 안전 줍줍 전략 어떻게 돌아가?'\n"
                    "• '오늘 시장 분위기 팩트로 요약해줘'\n\n"
                    "대표님께서 궁금하신 점을 말씀해 주시면, 제가 실시간 데이터와 제미나이 AI로 즉시 분석해 드릴게요! 🚀"
                )
                self.send_signal_message(welcome)
                return

            # 3. AI 답변 생성 (Google Gemini 3.6 Flash 엔진)
            logger.info(f"텔레그램 질문 수신: '{text}' -> AI 분석 시작")
            if self.ai_callback:
                ai_res = self.ai_callback(text)
                reply = ai_res.get("reply", "대표님, 분석 결과를 생성하지 못했어요. 잠시 후 다시 질문해 주세요!")
            else:
                reply = "대표님, AI 엔진이 준비 중입니다. 잠시 후 다시 질문해 주세요! 🥺"

            # 4. 텔레그램 메시지 분할 발송 (최대 4000자 단위)
            if len(reply) <= 3900:
                self.send_signal_message(reply)
            else:
                for chunk in [reply[i:i+3900] for i in range(0, len(reply), 3900)]:
                    self.send_signal_message(chunk)

            logger.info("텔레그램 AI 답변 발송 완료")

        except Exception as e:
            logger.error(f"텔레그램 메시지 처리 오류: {e}")
            self.send_signal_message("대표님, 답변 생성 중 일시적인 오류가 발생했습니다. 잠시 후 다시 질문해 주세요! 🥺")

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
