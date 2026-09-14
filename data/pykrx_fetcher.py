import pandas as pd
from pykrx import stock
from loguru import logger
import datetime
import os
from functools import lru_cache

class PyKRXFetcher:
    def __init__(self):
        self.cache_dir = "cache"
        os.makedirs(self.cache_dir, exist_ok=True)
        self.data_cache = {}
        
    def get_ohlcv(self, ticker: str, start: str, end: str) -> pd.DataFrame:
        cache_key = f"ohlcv_{ticker}_{start}_{end}"
        if cache_key in self.data_cache:
            return self.data_cache[cache_key]
            
        logger.info(f"Fetching OHLCV for {ticker} from {start} to {end}")
        try:
            df = stock.get_market_ohlcv_by_date(start, end, ticker)
            if df.empty:
                logger.warning(f"No OHLCV data found for {ticker}")
                return df
                
            df = df.reset_index()
            df.columns = ['date', 'open', 'high', 'low', 'close', 'volume', 'change_pct']
            
            self.data_cache[cache_key] = df
            return df
        except Exception as e:
            logger.error(f"Error fetching OHLCV for {ticker}: {e}")
            return pd.DataFrame()

    def get_market_cap(self, ticker: str) -> dict:
        cache_key = f"marketcap_{ticker}"
        if cache_key in self.data_cache:
            return self.data_cache[cache_key]
            
        logger.info(f"Fetching market cap for {ticker}")
        try:
            today = datetime.datetime.today().strftime("%Y%m%d")
            df_fundamental = stock.get_market_fundamental_by_ticker(today, market="ALL")
            
            result = {}
            if ticker in df_fundamental.index:
                row = df_fundamental.loc[ticker]
                result = {
                    "PER": row.get("PER"),
                    "PBR": row.get("PBR"),
                }
                
            df_cap = stock.get_market_cap_by_ticker(today, market="ALL")
            if ticker in df_cap.index:
                result["market_cap"] = df_cap.loc[ticker, "시가총액"]
                
            self.data_cache[cache_key] = result
            return result
        except Exception as e:
            logger.error(f"Error fetching market cap for {ticker}: {e}")
            return {}

    @lru_cache(maxsize=1)
    def get_sector_list(self) -> list:
        return stock.get_index_ticker_list()

    def get_sector_tickers(self, sector: str) -> list:
        return stock.get_index_portfolio_deposit_file(sector)

    def search_ticker(self, company_name: str) -> str:
        try:
            tickers = stock.get_market_ticker_list()
            for t in tickers:
                name = stock.get_market_ticker_name(t)
                if company_name in name:
                    return t
            return ""
        except Exception as e:
            logger.error(f"Error searching ticker for {company_name}: {e}")
            return ""

    def get_52week_high_low(self, ticker: str) -> dict:
        try:
            end = datetime.datetime.today()
            start = end - datetime.timedelta(days=365)
            df = self.get_ohlcv(ticker, start.strftime("%Y%m%d"), end.strftime("%Y%m%d"))
            if df.empty:
                return {}
            return {
                "high": df['high'].max(),
                "low": df['low'].min()
            }
        except Exception as e:
            logger.error(f"Error fetching 52 week high/low for {ticker}: {e}")
            return {}
