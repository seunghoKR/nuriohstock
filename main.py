"""
 주식 자동매매 봇 -- 메인 진입점
 KIS Open API 연동 | PM2 무중단 실행
"""

import asyncio
import signal
import sys
from pathlib import Path
from dotenv import load_dotenv
from loguru import logger

load_dotenv(Path(__file__).parent / ".env")

from core.scheduler import StockScheduler
from core.kis_client import KISClient
from core.data_collector import DataCollector
from core.order_engine import OrderEngine
from agents.technical_analyst import TechnicalAnalyst
from agents.risk_manager import RiskManager
from agents.signal_agent import SignalAgent
from notifications.telegram_bot import TelegramNotifier

logger.remove()
logger.add(sys.stdout, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan> - <level>{message}</level>", level="INFO", colorize=True)
logger.add("logs/stock_trader_{time:YYYY-MM-DD}.log", rotation="00:00", retention="30 days", compression="zip", level="DEBUG", encoding="utf-8")


class StockTraderBot:
    def __init__(self):
        logger.info("주식 자동매매 봇 초기화 시작...")
        self.kis_client = KISClient()
        self.data_collector = DataCollector(self.kis_client)
        self.order_engine = OrderEngine(self.kis_client)
        self.technical_analyst = TechnicalAnalyst(self.kis_client)
        self.risk_manager = RiskManager(self.kis_client)
        self.telegram = TelegramNotifier()
        self.signal_agent = SignalAgent(telegram_bot=self.telegram, order_engine=self.order_engine, risk_manager=self.risk_manager)
        self.scheduler = StockScheduler(technical_analyst=self.technical_analyst, signal_agent=self.signal_agent, order_engine=self.order_engine, telegram=self.telegram)
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        logger.success("주식 자동매매 봇 초기화 완료")

    async def start(self):
        logger.info("주식 자동매매 봇 시작")
        try:
            token = self.kis_client.get_access_token()
            logger.success(f"KIS API 연결 성공 (토큰: ...{token[-8:]})")
        except Exception as e:
            logger.error(f"KIS API 연결 실패: {e}")
        await self.telegram.send_message("주식 자동매매 봇 시작\n평일 09:00~15:30 자동 매매\n매매 신호 발생 시 승인 요청 드릴게요!")
        await self.scheduler.start()

    def _handle_shutdown(self, signum, frame):
        asyncio.create_task(self._graceful_shutdown())

    async def _graceful_shutdown(self):
        await self.order_engine.cancel_pending_orders()
        self.scheduler.stop()
        await self.telegram.send_message("주식 자동매매 봇이 안전하게 종료되었습니다.")
        sys.exit(0)


async def main():
    bot = StockTraderBot()
    await bot.start()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
