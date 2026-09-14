import os
import json
import time
import requests
import pandas as pd
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

class KISClient:
    """한국투자증권(KIS) Open API 클라이언트"""

    def __init__(self):
        self.app_key = os.getenv("KIS_APP_KEY")
        self.app_secret = os.getenv("KIS_APP_SECRET")
        self.account_no = os.getenv("KIS_ACCOUNT_NO")
        self.account_type = os.getenv("KIS_ACCOUNT_TYPE", "01")
        self.base_url = os.getenv("KIS_BASE_URL", "https://openapi.koreainvestment.com:9443")
        self.token_file = os.path.join(os.path.dirname(__file__), "..", "kis_token.json")
        self.access_token = None
        self.token_expired_at = 0

        # 기존 캐시 파일 확인
        if os.path.exists(self.token_file):
            try:
                with open(self.token_file, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                    if cached.get("token_expired_at", 0) > time.time() + 600:
                        self.access_token = cached.get("access_token")
                        self.token_expired_at = cached.get("token_expired_at")
            except Exception:
                pass

        if not all([self.app_key, self.app_secret, self.account_no, self.base_url]):
            logger.warning("KIS API credentials are not fully set in environment variables.")

    def get_access_token(self) -> str:
        """OAuth2 토큰 발급 및 캐싱 (24시간 유효)"""
        if self.access_token and time.time() < self.token_expired_at:
            return self.access_token

        # 파일 캐시 재확인
        if os.path.exists(self.token_file):
            try:
                with open(self.token_file, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                    if cached.get("token_expired_at", 0) > time.time() + 600:
                        self.access_token = cached.get("access_token")
                        self.token_expired_at = cached.get("token_expired_at")
                        return self.access_token
            except Exception:
                pass

        url = f"{self.base_url}/oauth2/tokenP"
        headers = {"content-type": "application/json"}
        body = {
            "grant_type": "client_credentials",
            "appkey": self.app_key,
            "appsecret": self.app_secret
        }
        try:
            res = requests.post(url, headers=headers, data=json.dumps(body))
            res.raise_for_status()
            data = res.json()
            self.access_token = data.get("access_token")
            expires_in = data.get("expires_in", 86400)
            self.token_expired_at = time.time() + expires_in - 60

            # 캐시 파일 저장
            try:
                with open(self.token_file, "w", encoding="utf-8") as f:
                    json.dump({
                        "access_token": self.access_token,
                        "token_expired_at": self.token_expired_at
                    }, f)
            except Exception as fe:
                logger.warning(f"Failed to write token cache: {fe}")

            logger.info("KIS access token issued successfully.")
            return self.access_token
        except Exception as e:
            logger.error(f"Failed to get KIS access token: {e}")
            raise

    def _request(self, method: str, path: str, params: dict = None, body: dict = None, tr_id: str = None) -> dict:
        """공통 API 요청 + 에러 처리 + Rate Limiting"""
        url = f"{self.base_url}{path}"
        token = self.get_access_token()
        headers = {
            "content-type": "application/json",
            "authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": tr_id,
            "custtype": "P"
        }
        try:
            time.sleep(0.1) # Basic rate limiting
            if method.upper() == 'GET':
                res = requests.get(url, headers=headers, params=params)
            else:
                res = requests.post(url, headers=headers, data=json.dumps(body) if body else None)
            res.raise_for_status()
            return res.json()
        except Exception as e:
            logger.error(f"API request failed: {e} | path: {path}")
            raise

    def get_current_price(self, ticker: str) -> dict:
        """국내주식 현재가 조회"""
        path = "/uapi/domestic-stock/v1/quotations/inquire-price"
        params = {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_INPUT_ISCD": ticker
        }
        return self._request("GET", path, params=params, tr_id="FHKST01010100")

    def get_ohlcv(self, ticker: str, period: str = 'D', count: int = 100) -> pd.DataFrame:
        """일봉/분봉 데이터 조회"""
        # Placeholder implementation
        logger.info(f"Fetching OHLCV for {ticker}, period={period}, count={count}")
        return pd.DataFrame()

    def get_account_balance(self) -> dict:
        """계좌 잔고 조회"""
        path = "/uapi/domestic-stock/v1/trading/inquire-balance"
        tr_id = "TTTC8434R" if "openapi" in self.base_url else "VTTC8434R"
        params = {
            "CANO": self.account_no,
            "ACNT_PRDT_CD": self.account_type,
            "AFHR_FLPR_YN": "N",
            "OFL_YN": "",
            "INQR_DVSN": "02",
            "UNPR_DVSN": "01",
            "FUND_STTL_ICLD_YN": "N",
            "FNCG_AMT_AUTO_RDPT_YN": "N",
            "PRCS_DVSN": "00",
            "CTX_AREA_FK100": "",
            "CTX_AREA_NK100": ""
        }
        return self._request("GET", path, params=params, tr_id=tr_id)

    def get_positions(self) -> list:
        """보유 종목 조회"""
        res = self.get_account_balance()
        return res.get('output1', [])

    def place_order(self, ticker: str, order_type: str, quantity: int, price: int = 0) -> dict:
        """주문 요청"""
        path = "/uapi/domestic-stock/v1/trading/order-cash"
        is_mock = "vts" in self.base_url
        if order_type.upper() == 'BUY':
            tr_id = "VTTC0802U" if is_mock else "TTTC0802U"
        else:
            tr_id = "VTTC0801U" if is_mock else "TTTC0801U"

        body = {
            "CANO": self.account_no,
            "ACNT_PRDT_CD": self.account_type,
            "PDNO": ticker,
            "ORD_DVSN": "01" if price == 0 else "00", # 01: 시장가, 00: 지정가
            "ORD_QTY": str(quantity),
            "ORD_UNPR": str(price)
        }
        return self._request("POST", path, body=body, tr_id=tr_id)

    def cancel_order(self, order_no: str) -> dict:
        """주문 취소"""
        path = "/uapi/domestic-stock/v1/trading/order-rvsecncl"
        is_mock = "vts" in self.base_url
        tr_id = "VTTC0803U" if is_mock else "TTTC0803U"
        
        body = {
            "CANO": self.account_no,
            "ACNT_PRDT_CD": self.account_type,
            "KRX_FWDG_ORD_ORGNO": "",
            "ORGN_ODNO": order_no,
            "ORD_DVSN": "00",
            "RVSE_CNCL_DVSN_CD": "02", # 취소
            "ORD_QTY": "0",
            "ORD_UNPR": "0"
        }
        return self._request("POST", path, body=body, tr_id=tr_id)
