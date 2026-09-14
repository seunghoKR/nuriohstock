import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

function fmt(n) {
  return Number(n || 0).toLocaleString('ko-KR')
}

const PAGE_SIZE = 50

export default function TradeHistory({ trades = [] }) {
  const [page, setPage] = useState(0)

  const totalPages = Math.max(1, Math.ceil(trades.length / PAGE_SIZE))
  const pageData   = trades.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  // 누적 손익 차트 데이터
  let cumPnl = 0
  const chartData = [...trades].reverse().map((t, i) => {
    cumPnl += Number(t.pnl || 0)
    return { idx: i + 1, cum: cumPnl, time: t.time }
  })

  const STRATEGY_COLOR = {
    GOLDEN_CROSS:    'bg-yellow-600/30 text-yellow-300 border-yellow-600',
    RSI_REVERSAL:    'bg-purple-600/30 text-purple-300 border-purple-600',
    AI_ORCHESTRATOR: 'bg-blue-600/30  text-blue-300   border-blue-600',
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">📋</span>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">체결 내역</h2>
        <span className="ml-auto text-xs text-slate-500">총 {trades.length}건</span>
      </div>

      {/* 누적 손익 차트 */}
      {chartData.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-slate-400 mb-2">누적 손익 추이</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="idx" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                formatter={(v) => [`₩${fmt(v)}`, '누적손익']}
              />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="cum"
                stroke={cumPnl >= 0 ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-700/60 text-slate-400">
              {['시간','종목','전략','매수/매도','체결가','수량','손익(₩)','손익률','사유'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-slate-500">체결 내역이 없습니다</td>
              </tr>
            ) : (
              pageData.map((t, i) => {
                const pnl = Number(t.pnl || 0)
                const pnlRate = Number(t.pnlRate || 0)
                const pnlColor = pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-red-400' : 'text-slate-300'
                const isBuy = t.side === 'BUY'
                return (
                  <tr
                    key={i}
                    className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-3 py-2 text-slate-400 whitespace-nowrap font-mono">{t.time || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-white">{t.stockName || t.stockCode || '-'}</div>
                      <div className="text-slate-500">{t.stockCode}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`border rounded px-1.5 py-0.5 text-[10px] font-bold ${STRATEGY_COLOR[t.strategy] || 'bg-slate-600/30 text-slate-300 border-slate-600'}`}>
                        {t.strategy || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`font-bold text-[11px] ${isBuy ? 'text-blue-400' : 'text-orange-400'}`}>
                        {isBuy ? '▲ 매수' : '▼ 매도'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-200">₩{fmt(t.price)}</td>
                    <td className="px-3 py-2 text-slate-300">{fmt(t.qty)}주</td>
                    <td className={`px-3 py-2 font-bold font-mono ${pnlColor}`}>
                      {pnl > 0 ? '+' : ''}{fmt(pnl)}
                    </td>
                    <td className={`px-3 py-2 font-bold ${pnlColor}`}>
                      {pnlRate > 0 ? '+' : ''}{Number(pnlRate).toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-slate-400 max-w-[160px] truncate">{t.reason || '-'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 text-xs disabled:opacity-40 hover:bg-slate-600 transition-colors"
          >◀ 이전</button>
          <span className="text-slate-400 text-xs">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 text-xs disabled:opacity-40 hover:bg-slate-600 transition-colors"
          >다음 ▶</button>
        </div>
      )}
    </div>
  )
}
