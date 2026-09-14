from apscheduler.schedulers.background import BackgroundScheduler
from loguru import logger
import datetime

import asyncio

class StockScheduler:
    """장 시간 기반 스케줄러"""

    def __init__(self, technical_analyst=None, signal_agent=None, order_engine=None, telegram=None):
        self.technical_analyst = technical_analyst
        self.signal_agent = signal_agent
        self.order_engine = order_engine
        self.telegram = telegram
        self.scheduler = BackgroundScheduler(timezone="Asia/Seoul")
        self._is_running = True
        self._setup_jobs()

    def _setup_jobs(self):
        # 평일 08:30: 장 전 시장 분석
        self.scheduler.add_job(self.pre_market_analysis, 'cron', day_of_week='mon-fri', hour=8, minute=30)
        # 평일 09:00: 매매 봇 시작
        self.scheduler.add_job(self.start_trading, 'cron', day_of_week='mon-fri', hour=9, minute=0)
        # 평일 15:20: 장 마감 10분 전 경고
        self.scheduler.add_job(self.closing_warning, 'cron', day_of_week='mon-fri', hour=15, minute=20)
        # 평일 15:30: 매매 봇 정지 + 미체결 주문 취소
        self.scheduler.add_job(self.stop_trading, 'cron', day_of_week='mon-fri', hour=15, minute=30)
        # 평일 15:35: 일일 결산 리포트
        self.scheduler.add_job(self.daily_report, 'cron', day_of_week='mon-fri', hour=15, minute=35)
        # 매주 월요일 08:00: 주간 포트폴리오 리포트
        self.scheduler.add_job(self.weekly_report, 'cron', day_of_week='mon', hour=8, minute=0)

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
