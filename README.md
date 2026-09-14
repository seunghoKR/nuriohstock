# 📈 주식 자동매매 봇 (Stock Auto Trader)

> 한국투자증권 KIS Open API 기반 AI 멀티 에이전트 주식 자동매매 시스템  
> NURIOH AI TRADER (업비트) 아키텍처 계승  

---

## 🚀 빠른 시작 (Quick Start)

### 1단계: 사전 준비

**한국투자증권 계정 준비**
1. 한국투자증권 앱 설치 및 계좌 개설
2. 모의투자 계좌 신청 (무료, 추천!)
3. [KIS OpenAPI 포털](https://apiportal.koreainvestment.com) 접속 → 앱 등록 → APP KEY 발급

**텔레그램 봇 준비**
1. 텔레그램 앱에서 @BotFather 검색 → /newbot 명령어
2. 봇 이름 설정 후 토큰 발급
3. 봇에게 메시지 보낸 후 Chat ID 확인

### 2단계: Python 환경 설치

`ash
# Python 3.11 이상 필요
python --version

# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate        # Windows

# 패키지 설치
pip install -r requirements.txt
`

### 3단계: 환경변수 설정

`ash
# .env.example 복사
copy .env.example .env

# .env 파일 열어서 실제 값 입력
notepad .env
`

.env 파일에 입력할 내용:
- KIS_APP_KEY — KIS 앱 키
- KIS_APP_SECRET — KIS 앱 시크릿
- KIS_ACCOUNT_NO — 계좌번호
- TELEGRAM_BOT_TOKEN — 텔레그램 봇 토큰
- TELEGRAM_CHAT_ID — 내 Chat ID

### 4단계: 데이터베이스 초기화

`ash
# MariaDB에 스키마 생성
mysql -u root -p < db/migrate.sql
`

### 5단계: 봇 실행

`ash
# 테스트 실행 (일반)
python main.py

# PM2 무중단 실행 (권장)
pm2 start ecosystem.config.js
pm2 save
pm2 startup
`

---

## 🤖 시스템 구조

`
주식자동매매/
├── main.py                  # 봇 진입점
├── core/
│   ├── kis_client.py        # KIS API 클라이언트
│   ├── order_engine.py      # 주문 실행 엔진
│   ├── data_collector.py    # 실시간 데이터 수집
│   └── scheduler.py         # 장 시간 스케줄러
├── agents/
│   ├── technical_analyst.py # 기술적 분석 에이전트
│   ├── risk_manager.py      # 리스크 관리 에이전트
│   ├── signal_agent.py      # 신호 전달·승인 에이전트
│   ├── news_analyst.py      # 뉴스·공시 에이전트 (Phase 5)
│   └── orchestrator.py      # AI 종합 판단 에이전트 (Phase 5)
├── strategies/
│   ├── golden_cross.py      # 골든크로스 전략
│   └── rsi_reversal.py      # RSI 과매도 반등 전략
├── notifications/
│   └── telegram_bot.py      # 텔레그램 봇
├── backtest/
│   └── engine.py            # 백테스팅 엔진
├── dashboard/               # React 대시보드
├── db/migrate.sql           # DB 스키마
└── .env.example             # 환경변수 템플릿
`

---

## 📅 매매 스케줄

| 시간 | 동작 |
|---|---|
| 평일 08:30 | 장 전 시장 분석 실행 |
| 평일 09:00 | 매매 봇 시작 (신호 감지 시작) |
| 평일 15:20 | 장 마감 10분 전 경고 |
| 평일 15:30 | 매매 봇 정지 + 미체결 주문 취소 |
| 평일 15:35 | 일일 결산 리포트 텔레그램 발송 |

---

## ⚙️ 슬롯 설정 방법

대시보드에서 슬롯을 설정하거나, DB에서 직접 추가:

`sql
INSERT INTO stock_slots (ticker, company_name, strategy_type, trade_amount_krw, stop_loss_pct, take_profit_pct)
VALUES ('005930', '삼성전자', 'RSI_REVERSAL', 500000, 3.0, 5.0);
`

---

## 📊 전략 설명

### 골든크로스 (GOLDEN_CROSS)
- 매수: 5일 이평선이 20일 이평선을 상향 돌파
- 매도: 5일 이평선이 20일 이평선을 하향 돌파

### RSI 과매도 반등 (RSI_REVERSAL)
- 매수: RSI < 30 (과매도 구간 진입)
- 매도: RSI > 70 (과매수 구간 진입)

### AI 오케스트레이터 (AI_ORCHESTRATOR)
- 기술적 분석(40%) + 시장 분위기(35%) + 뉴스 감성(25%) 종합 판단

---

## 🛡️ 리스크 관리

- **손절선**: 매수가 대비 -3% (기본, 슬롯별 설정 가능)
- **익절선**: 매수가 대비 +5% (기본, 슬롯별 설정 가능)
- **트레일링 스톱**: 최고가 대비 -2% 실시간 추적 손절
- **서킷 브레이커**: 연속 3회 손실 시 당일 매매 강제 정지
- **일일 손실 한도**: 총 자산 -3% 도달 시 당일 매매 정지

---

## 📱 텔레그램 명령어

| 명령어 | 설명 |
|---|---|
| /status | 봇 상태 확인 |
| /balance | 계좌 잔고 조회 |
| /positions | 보유 종목 조회 |
| /report | 오늘 결산 리포트 |
| /pause | 매매 일시 정지 |
| /resume | 매매 재개 |

---

## ⚠️ 면책 조항

> 본 프로그램은 투자 판단을 보조하는 도구입니다.  
> 최종 투자 결정과 그로 인한 손익에 대한 책임은 사용자 본인에게 있습니다.  
> 반드시 모의투자 환경에서 충분히 검증 후 실전 투자하세요!

---

*Created by AI 디자인실장 영자 × 이승호 대표님*  
*Powered by NURIOH AI TRADER Architecture × KIS Open API*
