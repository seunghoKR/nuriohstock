import pandas as pd
import pandas_ta as ta
from datetime import datetime
from .base_strategy import BaseStrategy, StrategySignal

class RSIReversalStrategy(BaseStrategy):
    """
    RSI 과매도 반등 전략: RSI 과매도/과매수 및 볼린저밴드, MACD 보조 지표 활용
    """
    def validate_params(self):
        self.rsi_period = self.params.get('rsi_period', 14)
        self.oversold = self.params.get('oversold', 30)
        self.overbought = self.params.get('overbought', 70)

    def generate_signal(self, df: pd.DataFrame, ticker: str) -> StrategySignal:
        if df.empty or len(df) < self.rsi_period:
            return StrategySignal('HOLD', 0, 'Not enough data', ticker, 0.0, datetime.now())
            
        rsi = df.ta.rsi(length=self.rsi_period)
        bbands = df.ta.bbands()
        macd = df.ta.macd()
        
        if rsi is None or bbands is None or macd is None:
            return StrategySignal('HOLD', 0, 'Indicator calculation failed', ticker, 0.0, datetime.now())
            
        current_rsi = rsi.iloc[-1]
        current_price = float(df['close'].iloc[-1])
        
        # Extract BB and MACD values dynamically based on pandas_ta column naming conventions
        bb_cols = bbands.columns
        bb_lower = bbands[bb_cols[0]].iloc[-1] if len(bb_cols) > 0 else 0.0 # BBL
        
        macd_cols = macd.columns
        macd_hist = macd[macd_cols[1]].iloc[-1] if len(macd_cols) > 1 else 0.0 # MACDh
        
        # 신호 강도 계산
        strength = 3
        if current_price <= bb_lower:
            strength += 1
        if macd_hist > 0:
            strength += 1
            
        strength = min(5, strength)
        
        if current_rsi < self.oversold:
            return StrategySignal('BUY', strength, f'RSI Oversold ({current_rsi:.2f})', ticker, current_price, datetime.now())
        elif current_rsi > self.overbought:
            return StrategySignal('SELL', strength, f'RSI Overbought ({current_rsi:.2f})', ticker, current_price, datetime.now())
            
        return StrategySignal('HOLD', 0, 'RSI Neutral', ticker, current_price, datetime.now())
