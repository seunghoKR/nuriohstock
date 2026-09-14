import os
import datetime
import OpenDartReader
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

class DARTFetcher:
    def __init__(self):
        api_key = os.getenv("DART_API_KEY")
        if api_key:
            self.dart = OpenDartReader(api_key)
        else:
            self.dart = None
            logger.warning("DART_API_KEY not found in .env")
            
        self.cache = {}

    def get_recent_disclosures(self, ticker: str, days: int=7) -> list:
        cache_key = f"disclosures_{ticker}_{days}"
        if cache_key in self.cache:
            return self.cache[cache_key]
            
        if not self.dart:
            return []
            
        try:
            start_date = (datetime.datetime.today() - datetime.timedelta(days=days)).strftime("%Y%m%d")
            reports = self.dart.list(ticker, start=start_date)
            
            if reports is None or reports.empty:
                self.cache[cache_key] = []
                return []
            
            target_keywords = ['주요사항보고', '증권신고', '사업보고서', '분기보고서']
            filtered_reports = reports[reports['report_nm'].str.contains('|'.join(target_keywords), na=False)]
            
            disclosures = []
            for _, row in filtered_reports.iterrows():
                disclosures.append(row.to_dict())
                
            self.cache[cache_key] = disclosures
            return disclosures
        except Exception as e:
            logger.error(f"Error fetching DART disclosures for {ticker}: {e}")
            return []

    def get_financial_summary(self, ticker: str) -> dict:
        if not self.dart:
            return {}
        try:
            year = datetime.datetime.today().year - 1
            fin = self.dart.finstate(ticker, year)
            if fin is None or fin.empty:
                return {}
                
            summary = {"revenue": 0, "operating_profit": 0, "net_profit": 0}
            return summary
        except Exception as e:
            logger.error(f"Error fetching financial summary for {ticker}: {e}")
            return {}

    def is_significant_disclosure(self, disclosure: dict) -> bool:
        title = disclosure.get('report_nm', '')
        significant_keywords = ['최대주주 변경', '유상증자', '감자', '합병', '상장폐지']
        return any(keyword in title for keyword in significant_keywords)
