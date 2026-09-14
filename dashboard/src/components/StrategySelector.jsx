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
    <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 rounded-2xl p-6 md:p-8 mb-8 shadow-xl relative overflow-hidden">
      {/* 은은한 배경 글로우 */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 헤더 타이틀 영역 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap mb-2">
            <span className="text-2xl">🏆</span>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
              대표님 전용 초간편 추천전략 (원클릭 완전자동)
            </h2>
            <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              살까요? NO ➔ 매수 완료했어요! YES
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            종목 분석부터 매매 타이밍까지 봇이 100% 전자동으로 처리합니다. 원하시는 투자 스타일에 맞게 전략을 골라주세요!
          </p>
        </div>

        {lastMessage && (
          <div className="text-xs sm:text-sm bg-purple-950/60 border border-purple-500/40 text-purple-200 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow animate-in fade-in self-start lg:self-auto">
            <span>✨</span>
            <span>{lastMessage}</span>
          </div>
        )}
      </div>

      {/* 2대 추천전략 선택 카드 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ── 1호: 우량주 안전 줍줍 ── */}
        <div
          onClick={() => handleSelect('SAFE_DIP')}
          className={`cursor-pointer rounded-2xl p-6 sm:p-7 transition-all duration-300 border flex flex-col justify-between relative group ${
            selected === 'SAFE_DIP'
              ? 'bg-gradient-to-b from-sky-950/40 via-slate-900 to-slate-900 border-sky-500 shadow-xl shadow-sky-500/10 ring-2 ring-sky-500/40'
              : 'bg-slate-800/60 hover:bg-slate-800/90 border-slate-700/80 hover:border-slate-600'
          }`}
        >
          {/* 상단 라벨 & 상태 배지 */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2 bg-sky-950/60 border border-sky-500/30 rounded-xl shadow-inner">🛡️</span>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-100 group-hover:text-sky-300 transition-colors">
                  1호 : 우량주 안전 줍줍 전략
                </h3>
                <span className="text-xs text-sky-400 font-medium">초보 대표님 강력 추천 • 안전 최우선 스타일</span>
              </div>
            </div>

            {selected === 'SAFE_DIP' ? (
              <span className="text-xs bg-sky-500 text-white font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 flex-shrink-0 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                현재 가동중 ⚡
              </span>
            ) : (
              <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 group-hover:border-sky-500/40 group-hover:text-sky-300 transition flex-shrink-0">
                선택 가능
              </span>
            )}
          </div>

          {/* 전략 설명 본문 (여유 있는 행간과 마진) */}
          <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
            삼성전자, 현대차 등 코스피 시총 1~20위 대형 우량주가 일시적인 공포로 과도하게 하락했을 때(RSI &lt; 35 과매도 구간)만 바겐세일 가격으로 안전하게 분할 매수합니다.
          </p>

          {/* 스펙 테이블 박스 (내부 패딩 및 공간 확보) */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950/70 rounded-xl p-4 text-xs border border-slate-800/80 mb-5">
            <div className="space-y-1">
              <span className="text-slate-400 block text-[11px]">대상 종목</span>
              <span className="text-slate-200 font-semibold text-xs sm:text-sm">시총 TOP 20</span>
            </div>
            <div className="space-y-1 border-x border-slate-800/80 px-3">
              <span className="text-slate-400 block text-[11px]">목표 익절</span>
              <span className="text-emerald-400 font-bold text-xs sm:text-sm">+3.5% (안정적)</span>
            </div>
            <div className="space-y-1 pl-1">
              <span className="text-slate-400 block text-[11px]">안전 손절</span>
              <span className="text-red-400 font-bold text-xs sm:text-sm">-2.0% (칼손절)</span>
            </div>
          </div>

          {/* 하단 인터랙션 가이드 버튼 */}
          <div className="pt-2">
            {selected === 'SAFE_DIP' ? (
              <div className="w-full py-2.5 px-4 rounded-xl bg-sky-950/50 border border-sky-500/30 text-sky-200 text-xs font-semibold text-center flex items-center justify-center gap-2">
                <span>🛡️</span>
                <span>대표님의 자산을 지키며 안전하게 시장을 모니터링하고 있어요</span>
              </div>
            ) : (
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white text-xs font-semibold transition shadow text-center"
              >
                👉 1호 [우량주 안전 줍줍]으로 전환하기
              </button>
            )}
          </div>
        </div>

        {/* ── 2호: 거래량 돌파 모멘텀 ── */}
        <div
          onClick={() => handleSelect('BREAKOUT')}
          className={`cursor-pointer rounded-2xl p-6 sm:p-7 transition-all duration-300 border flex flex-col justify-between relative group ${
            selected === 'BREAKOUT'
              ? 'bg-gradient-to-b from-orange-950/40 via-slate-900 to-slate-900 border-orange-500 shadow-xl shadow-orange-500/10 ring-2 ring-orange-500/40'
              : 'bg-slate-800/60 hover:bg-slate-800/90 border-slate-700/80 hover:border-slate-600'
          }`}
        >
          {/* 상단 라벨 & 상태 배지 */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2 bg-orange-950/60 border border-orange-500/30 rounded-xl shadow-inner">🚀</span>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-100 group-hover:text-orange-300 transition-colors">
                  2호 : 거래량 돌파 모멘텀 전략
                </h3>
                <span className="text-xs text-orange-400 font-medium">상승장 특화 • 당일 주도주 수익 극대화</span>
              </div>
            </div>

            {selected === 'BREAKOUT' ? (
              <span className="text-xs bg-orange-500 text-white font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 flex-shrink-0 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                현재 가동중 ⚡
              </span>
            ) : (
              <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 group-hover:border-orange-500/40 group-hover:text-orange-300 transition flex-shrink-0">
                선택 가능
              </span>
            )}
          </div>

          {/* 전략 설명 본문 (여유 있는 행간과 마진) */}
          <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
            장 시작 후 외국인/기관 수급과 거래량이 평소의 2배 이상 폭발하며 전고점과 20일 이평선을 강하게 돌파하는 당일 대장주를 자동 포착하여 달리는 말에 올라탑니다.
          </p>

          {/* 스펙 테이블 박스 (내부 패딩 및 공간 확보) */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950/70 rounded-xl p-4 text-xs border border-slate-800/80 mb-5">
            <div className="space-y-1">
              <span className="text-slate-400 block text-[11px]">대상 종목</span>
              <span className="text-slate-200 font-semibold text-xs sm:text-sm">거래량 폭발주</span>
            </div>
            <div className="space-y-1 border-x border-slate-800/80 px-3">
              <span className="text-slate-400 block text-[11px]">목표 익절</span>
              <span className="text-orange-400 font-bold text-xs sm:text-sm">+6.0% (트레일링)</span>
            </div>
            <div className="space-y-1 pl-1">
              <span className="text-slate-400 block text-[11px]">안전 손절</span>
              <span className="text-red-400 font-bold text-xs sm:text-sm">-2.5% (방어선)</span>
            </div>
          </div>

          {/* 하단 인터랙션 가이드 버튼 */}
          <div className="pt-2">
            {selected === 'BREAKOUT' ? (
              <div className="w-full py-2.5 px-4 rounded-xl bg-orange-950/50 border border-orange-500/30 text-orange-200 text-xs font-semibold text-center flex items-center justify-center gap-2">
                <span>🚀</span>
                <span>당일 가장 강한 거래량 돌파 종목을 실시간으로 추적 중이에요</span>
              </div>
            ) : (
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-orange-600 text-slate-300 hover:text-white text-xs font-semibold transition shadow text-center"
              >
                👉 2호 [거래량 돌파 모멘텀]으로 전환하기
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
