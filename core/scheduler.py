from apscheduler.schedulers.background import BackgroundScheduler
from loguru import logger
import datetime
import asyncio
from core.market_reporter import MarketReporter

class StockScheduler:
    """장 시간 기반 스케줄러 & 시장 브리핑 리포터"""

    def __init__(self, technical_analyst=None, signal_agent=None, order_engine=None, telegram=None):
        self.technical_analyst = technical_analyst
        self.signal_agent = signal_agent
        self.order_engine = order_engine
        self.telegram = telegram
        self.reporter = MarketReporter()
        self.scheduler = BackgroundScheduler(timezone="Asia/Seoul")
        self._is_running = True
        self._setup_jobs()

    def _setup_jobs(self):
        # 1. 매주 월요일 08:15: [주간 증시 대전망 리포트] (글로벌 캘린더 & 주간 밴드)
        self.scheduler.add_job(self.reporter.send_weekly_outlook, 'cron', day_of_week='mon', hour=8, minute=15)

        # 2. 평일 08:35: [모닝 장전 브리핑] (큰 그림 & 작은 그림 시장 분석)
        self.scheduler.add_job(self.reporter.send_morning_briefing, 'cron', day_of_week='mon-fri', hour=8, minute=35)

        # 3. 평일 09:00: 매매 봇 감시 가동
        self.scheduler.add_job(self.start_trading, 'cron', day_of_week='mon-fri', hour=9, minute=0)

        # 4. 평일 11:30: [점심 증시 핵심 속보 & 1줄 해설]
        self.scheduler.add_job(self.reporter.send_breaking_news_alert, 'cron', day_of_week='mon-fri', hour=11, minute=30)

        # 5. 평일 14:00: [오후 증시 핵심 속보 & 1줄 해설]
        self.scheduler.add_job(self.reporter.send_breaking_news_alert, 'cron', day_of_week='mon-fri', hour=14, minute=0)

        # 6. 평일 15:20: 장 마감 10분 전 경고 (신규 진입 차단)
        self.scheduler.add_job(self.closing_warning, 'cron', day_of_week='mon-fri', hour=15, minute=20)

        # 7. 평일 15:30: 매매 봇 정지 + 미체결 주문 안전 취소
        self.scheduler.add_job(self.stop_trading, 'cron', day_of_week='mon-fri', hour=15, minute=30)

        # 8. 평일 15:40: [장 마감 결산 & 내일 전망 브리핑] (수급 복기 및 정산)
        self.scheduler.add_job(self.reporter.send_closing_briefing, 'cron', day_of_week='mon-fri', hour=15, minute=40)

    async def start(self):
        """스케줄러 시작 및 무한 대기 루프"""
        self.scheduler.start()
        logger.info("StockScheduler started successfully.")
        try:
            while self._is_running:
                await asyncio.sleep(1)
        except (asyncio.CancelledError, KeyboardInterrupt):
            self.stop()

    def stop(self):
        """스케줄러 정지"""
        self._is_running = False
        if self.scheduler.running:
            self.scheduler.shutdown()
        logger.info("StockScheduler stopped.")

    def pre_market_analysis(self):
        logger.info("[08:30] 장 전 시장 분석을 시작합니다.")

    def start_trading(self):
        logger.info("[09:00] 매매 봇이 거래를 시작합니다.")

    def closing_warning(self):
        logger.info("[15:20] 장 마감 10분 전입니다. 신규 진입을 중지합니다.")

    def stop_trading(self):
        logger.info("[15:30] 장이 마감되었습니다. 매매 봇 정지 및 미체결 주문을 취소합니다.")

    def daily_report(self):
        logger.info("[15:35] 일일 결산 리포트를 텔레그램으로 발송합니다.")

    def weekly_report(self):
        logger.info("[월요일 08:00] 주간 포트폴리오 리포트를 발송합니다.")

    def is_trading_hours(self) -> bool:
        """현재 장 시간(09:00 ~ 15:30) 여부 반환"""
        now = datetime.datetime.now()
        if not self.is_weekday():
            return False
        
        start_time = now.replace(hour=9, minute=0, second=0, microsecond=0)
        end_time = now.replace(hour=15, minute=30, second=0, microsecond=0)
        return start_time <= now <= end_time

    def is_weekday(self) -> bool:
        """주말/공휴일 체크 (공휴일은 별도 캘린더 API 필요, 기본 주말만 체크)"""
        return datetime.datetime.now().weekday() < 5
