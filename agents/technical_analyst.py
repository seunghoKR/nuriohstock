from typing import Dict, Any, Optional, List
from loguru import logger
import pandas as pd
from strategies.golden_cross import GoldenCrossStrategy
from strategies.rsi_reversal import RSIReversalStrategy
from strategies.base_strategy import StrategySignal

class TechnicalAnalyst:
    """
    기술적 분석 에이전트: 데이터를 조회하고 전략을 적용하여 신호를 생성합니다.
    """
    def __init__(self, kis_client):
        self.kis_client = kis_client
        self.strategies = {
            'GOLDEN_CROSS': GoldenCrossStrategy(),
            'RSI_REVERSAL': RSIReversalStrategy()
        }
        
    def analyze(self, ticker: str, slot_config: dict) -> Optional[StrategySignal]:
        try:
            logger.info(f"[{ticker}] 기술적 분석 시작...")
            
            # KIS API로 OHLCV 데이터 100봉 조회 (가상 메서드 호출 - 구현 필요)
            # df = self.kis_client.get_ohlcv(ticker, limit=100)
            df = pd.DataFrame() # Mocking for now
            
            strategy_type = slot_config.get('strategy_type', 'GOLDEN_CROSS')
            strategy = self.strategies.get(strategy_type)
            
            if not strategy:
                logger.error(f"[{ticker}] 지원하지 않는 전략: {strategy_type}")
                return None
                
            signal = strategy.generate_signal(df, ticker)
            logger.info(f"[{ticker}] 분석 완료: {signal.action} (강도: {signal.strength})")
            return signal
            
        except Exception as e:
            logger.error(f"[{ticker}] 분석 중 에러 발생: {e}")
            return None
            
    def analyze_all_active_slots(self, active_slots: List[dict]) -> List[StrategySignal]:
        """
        DB에서 조회한 활성 슬롯을 순회하며 분석을 수행합니다.
        """
        results = []
        for slot in active_slots:
            ticker = slot.get('ticker')
            if not ticker:
                continue
                
            signal = self.analyze(ticker, slot)
            if signal:
                results.append(signal)
        return results
