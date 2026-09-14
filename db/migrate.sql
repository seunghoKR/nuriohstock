-- ============================================================
--  주식 자동매매 봇 데이터베이스 스키마
--  Stock Auto Trader DB Schema
--  MariaDB / MySQL 호환
-- ============================================================

-- 데이터베이스 생성 (없으면)
CREATE DATABASE IF NOT EXISTS stock_trader
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE stock_trader;

-- ── 1. 매매 슬롯 테이블 ────────────────────────────────────
-- 각 슬롯은 독립적인 종목+전략 조합
CREATE TABLE IF NOT EXISTS stock_slots (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED NOT NULL DEFAULT 1,
    slot_name           VARCHAR(50) NOT NULL DEFAULT '',           -- 슬롯 별칭 (예: "삼성전자 골든크로스")
    ticker              VARCHAR(10) NOT NULL DEFAULT '',           -- 종목코드 (예: 005930)
    company_name        VARCHAR(100) NOT NULL DEFAULT '',          -- 회사명 (자동 조회)
    strategy_type       ENUM('GOLDEN_CROSS','RSI_REVERSAL','AI_ORCHESTRATOR') NOT NULL DEFAULT 'RSI_REVERSAL',
    is_enabled          TINYINT(1) NOT NULL DEFAULT 0,             -- ON/OFF
    trade_amount_krw    INT UNSIGNED NOT NULL DEFAULT 500000,      -- 1회 매수 금액 (원)
    stop_loss_pct       DECIMAL(5,2) NOT NULL DEFAULT 3.00,        -- 손절선 (%)
    take_profit_pct     DECIMAL(5,2) NOT NULL DEFAULT 5.00,        -- 익절선 (%)
    use_trailing_stop   TINYINT(1) NOT NULL DEFAULT 0,             -- 트레일링 스톱 사용 여부
    trailing_stop_pct   DECIMAL(5,2) NOT NULL DEFAULT 2.00,        -- 트레일링 스톱 폭 (%)
    min_signal_strength TINYINT UNSIGNED NOT NULL DEFAULT 3,       -- 최소 신호 강도 (1-5)
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_enabled (user_id, is_enabled),
    INDEX idx_ticker (ticker)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='매매 슬롯 설정';

-- ── 2. 체결 내역 테이블 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_trades (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slot_id             INT UNSIGNED NOT NULL,
    ticker              VARCHAR(10) NOT NULL,
    company_name        VARCHAR(100) NOT NULL DEFAULT '',
    action              ENUM('BUY','SELL') NOT NULL,
    quantity            INT UNSIGNED NOT NULL DEFAULT 0,           -- 주문 수량
    price               DECIMAL(15,2) NOT NULL DEFAULT 0,          -- 체결 단가
    amount_krw          BIGINT NOT NULL DEFAULT 0,                  -- 체결 금액 (원)
    profit_loss_krw     BIGINT NOT NULL DEFAULT 0,                  -- 실현 손익 (매도 시)
    profit_loss_pct     DECIMAL(8,4) NOT NULL DEFAULT 0,           -- 실현 손익률 (%)
    strategy_type       VARCHAR(30) NOT NULL DEFAULT '',
    reason              TEXT,                                       -- 매매 근거
    order_no            VARCHAR(50) DEFAULT NULL,                   -- KIS 주문번호
    status              ENUM('PENDING','EXECUTED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    is_paper_trade      TINYINT(1) NOT NULL DEFAULT 1,             -- 모의투자 여부
    executed_at         DATETIME DEFAULT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_slot_id (slot_id),
    INDEX idx_ticker_action (ticker, action),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (slot_id) REFERENCES stock_slots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='체결 내역';

-- ── 3. 보유 포지션 테이블 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_positions (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slot_id             INT UNSIGNED NOT NULL UNIQUE,
    ticker              VARCHAR(10) NOT NULL,
    quantity            INT UNSIGNED NOT NULL DEFAULT 0,
    avg_price           DECIMAL(15,2) NOT NULL DEFAULT 0,          -- 평균 매수단가
    current_price       DECIMAL(15,2) NOT NULL DEFAULT 0,
    high_price          DECIMAL(15,2) NOT NULL DEFAULT 0,          -- 트레일링용 최고가
    unrealized_pnl      BIGINT NOT NULL DEFAULT 0,                  -- 평가 손익 (원)
    unrealized_pnl_pct  DECIMAL(8,4) NOT NULL DEFAULT 0,           -- 평가 손익률 (%)
    entry_at            DATETIME DEFAULT NULL,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ticker (ticker),
    FOREIGN KEY (slot_id) REFERENCES stock_slots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='보유 포지션';

-- ── 4. 시스템 설정 테이블 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_settings (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id                 INT UNSIGNED NOT NULL DEFAULT 1 UNIQUE,
    trading_mode            ENUM('paper','live') NOT NULL DEFAULT 'paper',
    max_position_ratio      DECIMAL(4,2) NOT NULL DEFAULT 0.10,    -- 종목당 최대 비율
    daily_loss_limit        DECIMAL(4,2) NOT NULL DEFAULT 0.03,    -- 일일 최대 손실
    circuit_breaker_count   TINYINT NOT NULL DEFAULT 3,            -- 연속 손실 한도
    is_trading_paused       TINYINT(1) NOT NULL DEFAULT 0,         -- 일시 정지 여부
    pause_reason            VARCHAR(255) DEFAULT NULL,
    consecutive_losses      TINYINT NOT NULL DEFAULT 0,            -- 현재 연속 손실 횟수
    today_realized_pnl      BIGINT NOT NULL DEFAULT 0,             -- 오늘 실현 손익 (초기화: 매일 자정)
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='시스템 설정';

-- ── 5. 일일 결산 리포트 테이블 ────────────────────────────
CREATE TABLE IF NOT EXISTS stock_daily_reports (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_date         DATE NOT NULL UNIQUE,
    total_trades        INT NOT NULL DEFAULT 0,
    buy_trades          INT NOT NULL DEFAULT 0,
    sell_trades         INT NOT NULL DEFAULT 0,
    winning_trades      INT NOT NULL DEFAULT 0,
    losing_trades       INT NOT NULL DEFAULT 0,
    win_rate            DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_profit_krw    BIGINT NOT NULL DEFAULT 0,
    total_loss_krw      BIGINT NOT NULL DEFAULT 0,
    net_pnl_krw         BIGINT NOT NULL DEFAULT 0,
    best_ticker         VARCHAR(10) DEFAULT NULL,
    worst_ticker        VARCHAR(10) DEFAULT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='일일 결산';

-- ── 기본 설정 데이터 삽입 ──────────────────────────────────
INSERT IGNORE INTO stock_settings (user_id, trading_mode, max_position_ratio, daily_loss_limit)
VALUES (1, 'paper', 0.10, 0.03);

SELECT 'DB 스키마 생성 완료!' AS message;
