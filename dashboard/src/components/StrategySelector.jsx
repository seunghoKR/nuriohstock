import React, { useState, useEffect } from 'react'

export default function StrategySelector({ onStrategyApplied }) {
  const [selected, setSelected] = useState('SAFE_DIP')
  const [loading, setLoading] = useState(false)
  const [lastMessage, setLastMessage] = useState('')

  useEffect(() => {
    fetch('/api/strategy/current')
      .then(res => res.json())
      .then(data => {
        if (data.selected) setSelected(data.selected)
      })
      .catch(() => {})
  }, [])

  const handleSelect = async (strategyKey) => {
    if (loading) return
    setLoading(true)
    setLastMessage('🔍 시장 20대 우량주를 실시간 스캔하여 슬롯에 자동 배치 중입니다...')

    try {
      const res = await fetch('/api/strategy/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: strategyKey })
      })
      const data = await res.json()
      if (data.success) {
        setSelected(strategyKey)
        setLastMessage(`✅ [${data.strategy.title}] 활성화 완료! 텔레그램으로 안내 톡을 보냈습니다.`)
        if (onStrategyApplied) onStrategyApplied()
      }
    } catch {
      setLastMessage('⚠️ 전략 적용 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-5 mb-6 shadow-xl relative overflow-hidden">
      {/* 장식 배경 */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🏆</span>
            <h2 className="text-base font-bold text-white tracking-wide">
              대표님 전용 초간편 추천전략 (원클릭 완전자동)
            </h2>
            <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[11px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              살까요? NO ➔ 매수 완료했어요! YES
            </span>
          </div>
          <p className="text-slate-400 text-xs">
            종목 분석·선택·매매 타이밍까지 봇이 100% 전자동으로 처리합니다. 마음에 드는 전략을 골라주세요!
          </p>
        </div>

        {lastMessage && (
          <div className="text-xs bg-slate-950/70 border border-purple-500/30 text-purple-200 px-3 py-1.5 rounded-xl flex items-center gap-2 animate-in fade-in">
            {lastMessage}
          </div>
        )}
      </div>

      {/* 2대 추천전략 선택 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 1호: 우량주 안전 줍줍 */}
        <div
          onClick={() => handleSelect('SAFE_DIP')}
          className={`cursor-pointer rounded-xl p-4.5 transition-all duration-200 border relative ${
            selected === 'SAFE_DIP'
              ? 'bg-gradient-to-b from-sky-950/40 to-slate-900 border-sky-500 shadow-lg shadow-sky-500/10 ring-2 ring-sky-500/30'
              : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80'
          }`}
        >
          {selected === 'SAFE_DIP' && (
            <span className="absolute top-3 right-3 text-[11px] bg-sky-500 text-white font-bold px-2 py-0.5 rounded-md shadow">
              현재 가동중 ⚡
            </span>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🛡️</span>
            <div>
              <h3 className="font-bold text-sm text-slate-100">1호 : 우량주 안전 줍줍 전략</h3>
              <span className="text-[11px] text-sky-400 font-medium">초보자 강력 추천 • 안전 최우선 스타일</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            삼성전자, 현대차 등 코스피 시총 1~20위 대형 우량주가 공포에 과하게 빠졌을 때(RSI &lt; 35)만 바겐세일 가격에 주워 담습니다.
          </p>
          <div className="grid grid-cols-3 gap-2 bg-slate-900/60 rounded-lg p-2.5 text-[11px] border border-slate-800">
            <div>
              <span className="text-slate-400 block">대상 종목</span>
              <span className="text-slate-200 font-semibold">시총 TOP 20 우량주</span>
            </div>
            <div>
              <span className="text-slate-400 block">목표 익절</span>
              <span className="text-emerald-400 font-bold">+3.5%</span>
            </div>
            <div>
              <span className="text-slate-400 block">안전 손절</span>
              <span className="text-red-400 font-bold">-2.0%</span>
            </div>
          </div>
        </div>

        {/* 2호: 거래량 돌파 모멘텀 */}
        <div
          onClick={() => handleSelect('BREAKOUT')}
          className={`cursor-pointer rounded-xl p-4.5 transition-all duration-200 border relative ${
            selected === 'BREAKOUT'
              ? 'bg-gradient-to-b from-orange-950/40 to-slate-900 border-orange-500 shadow-lg shadow-orange-500/10 ring-2 ring-orange-500/30'
              : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80'
          }`}
        >
          {selected === 'BREAKOUT' && (
            <span className="absolute top-3 right-3 text-[11px] bg-orange-500 text-white font-bold px-2 py-0.5 rounded-md shadow">
              현재 가동중 ⚡
            </span>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🚀</span>
            <div>
              <h3 className="font-bold text-sm text-slate-100">2호 : 거래량 돌파 모멘텀 전략</h3>
              <span className="text-[11px] text-orange-400 font-medium">상승장 특화 • 시원한 수익 극대화</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            장 시작 후 수급과 거래량이 2배 이상 급증하며 전고점과 20일선을 강하게 돌파하는 당일 대장주를 자동 포착하여 달리는 말에 올라탑니다.
          </p>
          <div className="grid grid-cols-3 gap-2 bg-slate-900/60 rounded-lg p-2.5 text-[11px] border border-slate-800">
            <div>
              <span className="text-slate-400 block">대상 종목</span>
              <span className="text-slate-200 font-semibold">거래량 폭발 대장주</span>
            </div>
            <div>
              <span className="text-slate-400 block">목표 익절</span>
              <span className="text-orange-400 font-bold">+6.0% (트레일링)</span>
            </div>
            <div>
              <span className="text-slate-400 block">안전 손절</span>
              <span className="text-red-400 font-bold">-2.5%</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
