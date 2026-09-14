"""
주식 자동매매 백엔드 REST API 서버 (포트 4001)
대시보드와 한국투자증권 실계좌를 실시간으로 직접 연결합니다.
"""

import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path
from dotenv import load_dotenv

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# 환경변수 로드
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

sys.path.append(str(Path(__file__).parent))
from core.kis_client import KISClient
from core.stock_scanner import StockScanner
from notifications.telegram_bot import TelegramNotifier

kis = KISClient()
telegram = TelegramNotifier()

current_strategy = {
    "selected": "SAFE_DIP",
    "title": "1호 우량주 안전 줍줍",
    "autoTrade": True,
    "lastScanned": "정상"
}

# 기본 슬롯 메모리 데이터 (DB 연결 전/호환용)
slots_db = [
    {
        "id": 1,
        "stockCode": "005930",
        "stockName": "삼성전자",
        "strategy": "RSI_REVERSAL",
        "active": True,
        "amount": 50000,
        "stopLoss": 2.0,
        "takeProfit": 3.5,
        "trailingStop": False,
        "holding": {}
    },
    { "id": 2, "stockCode": "005380", "stockName": "현대차", "strategy": "RSI_REVERSAL", "active": True, "amount": 50000, "stopLoss": 2.0, "takeProfit": 3.5, "trailingStop": False, "holding": {} },
    { "id": 3, "stockCode": "069500", "stockName": "KODEX 200", "strategy": "GOLDEN_CROSS", "active": False, "amount": 50000, "stopLoss": 2.0, "takeProfit": 3.0, "trailingStop": False, "holding": {} },
    { "id": 4, "stockCode": None }, { "id": 5, "stockCode": None },
    { "id": 6, "stockCode": None }, { "id": 7, "stockCode": None }, { "id": 8, "stockCode": None },
    { "id": 9, "stockCode": None }
]

class RequestHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def _json(self, data, status=200):
        self.send_response(status)
        self._send_cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # 1. 상태 조회
        if path == '/api/status' or path == '/status':
            self._json({
                "systemStatus": "running",
                "circuitBreaker": False,
                "accountNo": os.getenv("KIS_ACCOUNT_NO", "68413157"),
                "tradingMode": os.getenv("TRADING_MODE", "live")
            })

        # 2. 실시간 실계좌 잔고 조회 (증권사 직통!)
        elif path == '/api/balance' or path == '/balance':
            try:
                bal = kis.get_account_balance()
                out2 = bal.get('output2', [{}])[0] if bal.get('output2') else {}
                out1 = bal.get('output1', [])

                total_eval = int(out2.get('tot_evlu_amt', 0) or 0)
                avail_cash = int(out2.get('dnca_tot_amt', 0) or 0)
                total_pnl = int(out2.get('evlu_amt_smtl_amt', 0) or 0) # 평가손익합계

                self._json({
                    "totalEval": total_eval,
                    "availableCash": avail_cash,
                    "todayPnl": 0,
                    "todayPnlRate": 0.0,
                    "totalPnl": total_pnl,
                    "totalPnlRate": 0.0,
                    "todayTradeCount": 0,
                    "todayWinRate": 0.0,
                    "holdings": out1
                })
            except Exception as e:
                # 에러 시 기본값
                self._json({
                    "totalEval": 1,
                    "availableCash": 1,
                    "todayPnl": 0,
                    "todayPnlRate": 0.0,
                    "totalPnl": 0,
                    "totalPnlRate": 0.0,
                    "todayTradeCount": 0,
                    "todayWinRate": 0.0
                })

        # 3. 슬롯 목록 조회
        elif path == '/api/slots' or path == '/slots':
            self._json(slots_db)

        # 4. 에이전트 상태 조회
        elif path == '/api/agents/status' or path == '/agents/status':
            self._json({
                "technical":    { "status": "가동중", "lastRun": "정상", "target": "005930" },
                "risk":         { "status": "감시중", "lastRun": "정상", "target": "손절 -2%" },
                "signal":       { "status": "대기",   "lastRun": "정상", "target": "텔레그램 연동됨" },
                "news":         { "status": "준비됨", "lastRun": "정상", "target": "DART / 로컬 AI" },
                "orchestrator": { "status": "가동중", "lastRun": "정상", "target": "Gemma-4-E2B" }
            })

        # 5. 체결 내역
        elif path == '/api/trades' or path == '/trades':
            self._json([])

        # 6. 현재 선택 전략 조회
        elif path == '/api/strategy/current' or path == '/strategy/current':
            self._json(current_strategy)

        else:
            self._json({"error": "Not Found"}, status=404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length).decode('utf-8')) if length > 0 else {}

        # 0. 추천전략 선택 및 자동 종목 재배치
        if path == '/api/strategy/select' or path == '/strategy/select':
            strat = body.get('strategy', 'SAFE_DIP')
            if strat == 'SAFE_DIP':
                current_strategy['selected'] = 'SAFE_DIP'
                current_strategy['title'] = '1호 우량주 안전 줍줍'
                candidates = StockScanner.scan_safe_dip_candidates(2)
                tp, sl = 3.5, 2.0
                strat_type = 'RSI_REVERSAL'
            else:
                current_strategy['selected'] = 'BREAKOUT'
                current_strategy['title'] = '2호 거래량 돌파 모멘텀'
                candidates = StockScanner.scan_momentum_breakout_candidates(2)
                tp, sl = 6.0, 2.5
                strat_type = 'GOLDEN_CROSS'

            # 1, 2번 슬롯 자동 세팅
            for idx, c in enumerate(candidates):
                if idx < len(slots_db):
                    slots_db[idx]['stockCode'] = c['ticker']
                    slots_db[idx]['stockName'] = c['name']
                    slots_db[idx]['strategy'] = strat_type
                    slots_db[idx]['active'] = True
                    slots_db[idx]['amount'] = 50000
                    slots_db[idx]['stopLoss'] = sl
                    slots_db[idx]['takeProfit'] = tp

            # 텔레그램 안내 메시지 발송
            c_names = ', '.join([c['name'] for c in candidates])
            msg = (
                f"🎯 [자동매매 전략 활성화]\n\n"
                f"• 선택전략: {current_strategy['title']}\n"
                f"• 자동발굴 종목: {c_names}\n"
                f"• 1회 매수금액: 50,000원\n"
                f"• 익절선: +{tp}% / 손절선: -{sl}%\n\n"
                f"⚡ '살까요?' 승인 대기 없이 조건 포착 시 즉시 [매수 체결 완료]로 실행됩니다!"
            )
            telegram.send_signal_message(msg)
            return self._json({"success": True, "strategy": current_strategy, "slots": slots_db})

        # 슬롯 토글
        if '/toggle' in path:
            parts = path.strip('/').split('/')
            slot_id = int(parts[1] if parts[0] == 'slots' else parts[2])
            for s in slots_db:
                if s['id'] == slot_id:
                    s['active'] = not s.get('active', False)
                    return self._json(s)

        # 슬롯 수정
        if path.startswith('/api/slots/') or path.startswith('/slots/'):
            parts = path.strip('/').split('/')
            slot_id = int(parts[1] if parts[0] == 'slots' else parts[2])
            for s in slots_db:
                if s['id'] == slot_id:
                    s.update(body)
                    return self._json(s)

        self._json({"success": True})

def run():
    port = 4001
    server = HTTPServer(('127.0.0.1', port), RequestHandler)
    print(f"✅ 주식 대시보드 백엔드 API 서버 가동 중: http://127.0.0.1:{port}")
    server.serve_forever()

if __name__ == '__main__':
    run()
