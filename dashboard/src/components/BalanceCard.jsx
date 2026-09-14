import React from 'react'

function fmt(n, dec = 0) {
  if (n == null) return '-'
  return Number(n).toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function PnlValue({ value, suffix = '' }) {
  const n = Number(value) || 0
  const color = n > 0 ? 'text-emerald-400' : n < 0 ? 'text-red-400' : 'text-slate-300'
  const sign  = n > 0 ? '+' : ''
  return <span className={`font-bold ${color}`}>{sign}{fmt(n)}{suffix}</span>
}

export default function BalanceCard({ balance = {} }) {
  const {
    totalEval = 0,
    availableCash = 0,
    todayPnl = 0,
    todayPnlRate = 0,
    totalPnl = 0,
    totalPnlRate = 0,
    todayTradeCount = 0,
    todayWinRate = 0,
  } = balance

  const StatItem = ({ label, children }) => (
    <div className="flex flex-col">
      <span className="text-slate-400 text-xs mb-0.5">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  )

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">계좌 현황</h2>
        </div>
        <span className="text-[11px] bg-sky-950/80 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-medium">
          주월클 (68413157-01)
        </span>
      </div>

      {/* 총 평가금액 */}
      <div className="mb-5">
        <p className="text-slate-400 text-xs mb-1">총 평가금액</p>
        <p className="text-3xl font-bold text-white">
          ₩{fmt(totalEval)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatItem label="예수금 (매수가능)">
          <span className="text-sky-300 font-semibold">₩{fmt(availableCash)}</span>
        </StatItem>
        <StatItem label="오늘 매매 횟수">
          <span className="text-white font-semibold">{todayTradeCount}건</span>
        </StatItem>
      </div>

      {/* 손익 */}
      <div className="border-t border-slate-700 pt-4 grid grid-cols-2 gap-3">
        <div className="bg-slate-700/40 rounded-lg p-3">
          <p className="text-slate-400 text-xs mb-1">오늘 손익</p>
          <p className="text-lg"><PnlValue value={todayPnl} /></p>
          <p className="text-xs mt-0.5"><PnlValue value={todayPnlRate} suffix="%" /></p>
        </div>
        <div className="bg-slate-700/40 rounded-lg p-3">
          <p className="text-slate-400 text-xs mb-1">누적 손익</p>
          <p className="text-lg"><PnlValue value={totalPnl} /></p>
          <p className="text-xs mt-0.5"><PnlValue value={totalPnlRate} suffix="%" /></p>
        </div>
        <div className="bg-slate-700/40 rounded-lg p-3 col-span-2">
          <p className="text-slate-400 text-xs mb-1">오늘 승률</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-600 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, todayWinRate || 0)}%` }}
              />
            </div>
            <span className="text-white font-bold text-sm">{fmt(todayWinRate, 1)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
