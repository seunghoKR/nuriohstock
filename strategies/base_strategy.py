from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, Optional
from datetime import datetime
import pandas as pd

@dataclass
class StrategySignal:
    action: str  # 'BUY', 'SELL', 'HOLD'
    strength: int  # 1 to 5
    reason: str
    ticker: str
    price: float
    timestamp: datetime

class BaseStrategy(ABC):
    """
    전략 베이스 추상 클래스
    """
    def __init__(self, **kwargs):
        self.params = kwargs
        self.validate_params()

    @abstractmethod
    def generate_signal(self, df: pd.DataFrame, ticker: str) -> StrategySignal:
        """
        주어진 DataFrame(OHLCV)을 분석하여 매매 신호를 생성합니다.
        
        :param df: OHLCV 데이터가 포함된 pandas DataFrame
        :param ticker: 종목 코드
        :return: StrategySignal 객체
        """
        pass

    def get_name(self) -> str:
        """
        전략명을 반환합니다.
        """
        return self.__class__.__name__

    def validate_params(self):
        """
        파라미터 유효성을 검사하고 기본값을 설정합니다.
        """
        pass
