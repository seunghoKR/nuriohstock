import React, { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import BalanceCard from './components/BalanceCard'
import StockSlotManager from './components/StockSlotManager'
import AgentStatusCard from './components/AgentStatusCard'
import TradeHistory from './components/TradeHistory'
import AiAssistantChat from './components/AiAssistantChat'
import StrategySelector from './components/StrategySelector'
import {
  getStatus, getSlots, getBalance,
  getAgentStatus, getTradeHistory
} from './services/api'

/* ─── 데모 데이터 (API 연결 전 UI 확인용) ─── */
const DEMO = {
  systemStatus: 'running',
  circuitBreaker: false,
  balance: {
    totalEval:       28_540_000,
    availableCash:    5_200_000,
    todayPnl:          123_400,
    todayPnlRate:          0.45,
    totalPnl:          880_000,
    totalPnlRate:          3.18,
    todayTradeCount:         7,
    todayWinRate:           71.4,
  },
  slots: [
    { id:1, stockCode:'005930', stockName:'삼성전자', strategy:'GOLDEN_CROSS',    active:true,  amount:5000000, stopLoss:3, takeProfit:8, trailingStop:true,
      holding:{ qty:50, avgPrice:73200, currentPrice:74500, pnl:65000, pnlRate:0.89 }},
    { id:2, stockCode:'000660', stockName:'SK하이닉스', strategy:'RSI_REVERSAL',  active:true,  amount:3000000, stopLoss:5, takeProfit:10, trailingStop:false,
      holding:{ qty:20, avgPrice:148000, currentPrice:145000, pnl:-60000, pnlRate:-2.03 }},
    { id:3, stockCode:'035720', stockName:'카카오',    strategy:'AI_ORCHESTRATOR',active:false, amount:2000000, stopLoss:4, takeProfit:9, trailingStop:true,
      holding:{}},
    { id:4, stockCode:null }, { id:5, stockCode:null }, { id:6, stockCode:null },
    { id:7, stockCode:null }, { id:8, stockCode:null }, { id:9, stockCode:null },
  ],
  agents: {
    technical:    { status:'분석중',  lastRun:'08:30:05', target:'005930' },
    risk:         { status:'대기',    lastRun:'08:29:55', target:'' },
    signal:       { status:'신호발생',lastRun:'08:30:10', target:'005930' },
    news:         { status:'분석중',  lastRun:'08:28:40', target:'005930, 000660' },
    orchestrator: { status:'대기',    lastRun:'08:30:12', target:'' },
  },
  trades: [
    { time:'08:30:12', stockCode:'005930', stockName:'삼성전자',   strategy:'GOLDEN_CROSS',    side:'BUY',  price:73200, qty:50,  pnl:0,       pnlRate:0,     reason:'골든크로스 발생' },
    { time:'08:15:44', stockCode:'000660', stockName:'SK하이닉스', strategy:'RSI_REVERSAL',    side:'BUY',  price:148000,qty:20,  pnl:0,       pnlRate:0,     reason:'RSI 과매도 반등' },
    { time:'07:55:20', stockCode:'373220', stockName:'LG에너지솔루션', strategy:'GOLDEN_CROSS', side:'SELL', price:412000,qty:5,  pnl:35000,   pnlRate:1.73,  reason:'익절선 도달' },
    { time:'07:42:11', stockCode:'035720', stockName:'카카오',     strategy:'RSI_REVERSAL',    side:'SELL', price:54200, qty:40, pnl:-18000,  pnlRate:-0.82, reason:'손절선 도달' },
    { time:'07:30:00', stockCode:'005380', stockName:'현대차',     strategy:'AI_ORCHESTRATOR', side:'BUY',  price:213000,qty:10, pnl:0,       pnlRate:0,     reason:'AI 신호' },
  ],
}

export default function App() {
  const [systemStatus,    setSystemStatus]    = useState(DEMO.systemStatus)
  const [circuitBreaker,  setCircuitBreaker]  = useState(DEMO.circuitBreaker)
  const [balance,         setBalance]         = useState(DEMO.balance)
  const [slots,           setSlots]           = useState(DEMO.slots)
  const [agents,          setAgents]          = useState(DEMO.agents)
  const [trades,          setTrades]          = useState(DEMO.trades)
  const [loading,         setLoading]         = useState(false)
  const [apiError,        setApiError]        = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [status, slotData, balanceData, agentData, tradeData] = await Promise.all([
        getStatus(), getSlots(), getBalance(), getAgentStatus(), getTradeHistory()
      ])
      setSystemStatus(status.systemStatus || 'running')
      setCircuitBreaker(status.circuitBreaker || false)
      setSlots(slotData)
      setBalance(balanceData)
      setAgents(agentData)
      setTrades(tradeData)
      setApiError(false)
    } catch {
      setApiError(true)
      // API 연결 실패 시 데모 데이터 유지
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const timer = setInterval(fetchAll, 5000)
    return () => clearInterval(timer)
  }, [fetchAll])

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Header systemStatus={systemStatus} circuitBreaker={circuitBreaker} />

      <main className="p-4 md:p-6 max-w-[1600px] mx-auto">
        {/* API 연결 오류 배너 */}
        {apiError && (
          <div className="mb-4 bg-yellow-900/40 border border-yellow-600/50 text-yellow-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
            ⚠️ 백엔드 서버(localhost:4001)에 연결 중입니다. 데모 데이터로 표시합니다.
          </div>
        )}

        {/* 상단: 잔고 카드 + 에이전트 상태 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-1">
            <BalanceCard balance={balance} />
          </div>
          <div className="lg:col-span-1">
            <AgentStatusCard agents={agents} />
          </div>
          {/* 요약 KPI */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {[
              { label:'오늘 매수', value: trades.filter(t=>t.side==='BUY').length + '건',   icon:'▲', color:'text-blue-400' },
              { label:'오늘 매도', value: trades.filter(t=>t.side==='SELL').length + '건',  icon:'▼', color:'text-orange-400' },
              { label:'활성 슬롯', value: slots.filter(s=>s.active).length + '/9',          icon:'🎰', color:'text-emerald-400' },
              { label:'신호 발생', value: Object.values(agents).filter(a=>a.status==='신호발생').length + '건', icon:'📡', color:'text-purple-400' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
                <p className="text-slate-400 text-xs">{icon} {label}</p>
                <p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 🏆 대표님 전용 2대 원클릭 추천전략 선택기 */}
        <StrategySelector onStrategyApplied={fetchAll} />

        {/* 슬롯 매니저 */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6 shadow-lg">
          <StockSlotManager slots={slots} onSlotsChange={fetchAll} />
        </section>

        {/* 체결 내역 */}
        <section>
          <TradeHistory trades={trades} />
        </section>
      </main>

      {/* 실시간 AI 주식 매매 비서 영자 */}
      <AiAssistantChat balance={balance} slots={slots} trades={trades} />
    </div>
  )
}
