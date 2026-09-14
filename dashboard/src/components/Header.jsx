import React, { useState, useEffect } from 'react'

function isMarketOpen() {
  const now = new Date()
  const day = now.getDay()
  if (day === 0 || day === 6) return false
  const h = now.getHours()
  const m = now.getMinutes()
  const t = h * 60 + m
  return t >= 9 * 60 && t < 15 * 60 + 30
}

export default function Header({ systemStatus = 'running', circuitBreaker = false }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const marketOpen = isMarketOpen()
  const fmt = (d) =>
    d.toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    })

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between shadow-lg sticky top-0 z-50">
      {/* 로고 */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">📈</span>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">주식 AI 트레이더</h1>
          <p className="text-xs text-slate-400">NURIOH Stock Automation System</p>
        </div>
      </div>

      {/* 상태 배지들 */}
      <div className="flex items-center gap-3 flex-wrap justify-end">
        {/* 시스템 상태 */}
        {systemStatus === 'running' ? (
          <span className="flex items-center gap-1.5 bg-emerald-900/50 text-emerald-400 border border-emerald-700 rounded-full px-3 py-1 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            🟢 운영중
          </span>
        ) : (
          <span className="flex items-center gap-1.5 bg-red-900/50 text-red-400 border border-red-700 rounded-full px-3 py-1 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            🔴 정지
          </span>
        )}

        {/* 장 시간 */}
        {marketOpen ? (
          <span className="flex items-center gap-1.5 bg-blue-900/50 text-blue-300 border border-blue-700 rounded-full px-3 py-1 text-xs font-semibold">
            ⏰ 장중 <span className="text-blue-400">(09:00~15:30)</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 bg-slate-700/60 text-slate-400 border border-slate-600 rounded-full px-3 py-1 text-xs font-semibold">
            ⏸️ 장 마감
          </span>
        )}

        {/* 서킷브레이커 */}
        {circuitBreaker && (
          <span className="flex items-center gap-1.5 bg-red-600/80 text-white border border-red-500 rounded-full px-3 py-1 text-xs font-bold animate-pulse">
            🚨 매매 정지
          </span>
        )}

        {/* 시간 */}
        <span className="text-slate-400 text-xs font-mono border border-slate-700 rounded px-2 py-1 bg-slate-800">
          🕐 {fmt(now)}
        </span>
      </div>
    </header>
  )
}
