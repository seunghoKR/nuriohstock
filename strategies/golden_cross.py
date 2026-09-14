import pandas as pd
import pandas_ta as ta
from datetime import datetime
from loguru import logger
from .base_strategy import BaseStrategy, StrategySignal

class GoldenCrossStrategy(BaseStrategy):
    """
    골든크로스 전략: 단기 이평선이 장기 이평선을 상향/하향 돌파할 때 매매 신호 발생
    """
    def validate_params(self):
        self.short_period = self.params.get('short_period', 5)
        self.long_period = self.params.get('long_period', 20)

    def generate_signal(self, df: pd.DataFrame, ticker: str) -> StrategySignal:
        if df.empty or len(df) < self.long_period:
            return StrategySignal('HOLD', 0, 'Not enough data', ticker, 0.0, datetime.now())
            
        short_ma = df.ta.sma(length=self.short_period)
        long_ma = df.ta.sma(length=self.long_period)
        
        if short_ma is None or long_ma is None:
            return StrategySignal('HOLD', 0, 'MA calculation failed', ticker, 0.0, datetime.now())
            
        current_short = short_ma.iloc[-1]
        current_long = long_ma.iloc[-1]
        prev_short = short_ma.iloc[-2]
        prev_long = long_ma.iloc[-2]
        current_price = float(df['close'].iloc[-1])
        
        # 거래량 필터 (최근 5일 평균 대비)
        volume_ratio = 1.0
        if 'volume' in df.columns:
            vol_ma = df['volume'].rolling(5).mean().iloc[-1]
            if vol_ma > 0:
                volume_ratio = df['volume'].iloc[-1] / vol_ma
                
        # 거래량에 따른 신호 강도 (1-5)
        strength = min(5, max(1, int(volume_ratio * 2)))
        
        if prev_short <= prev_long and current_short > current_long:
            return StrategySignal('BUY', strength, 'Golden Cross detected', ticker, current_price, datetime.now())
        elif prev_short >= prev_long and current_short < current_long:
            return StrategySignal('SELL', strength, 'Dead Cross detected', ticker, current_price, datetime.now())
            
        return StrategySignal('HOLD', 0, 'No crossover', ticker, current_price, datetime.now())
