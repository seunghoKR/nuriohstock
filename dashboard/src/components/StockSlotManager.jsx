import React, { useState } from 'react'
import { updateSlot, toggleSlot, lookupStock } from '../services/api'

const MAX_SLOTS = 9

const STRATEGY_COLORS = {
  GOLDEN_CROSS:    { bg: 'bg-yellow-600/20', border: 'border-yellow-600/50', badge: 'bg-yellow-600/30 text-yellow-300 border-yellow-500' },
  RSI_REVERSAL:    { bg: 'bg-purple-600/20', border: 'border-purple-600/50', badge: 'bg-purple-600/30 text-purple-300 border-purple-500' },
  AI_ORCHESTRATOR: { bg: 'bg-blue-600/20',   border: 'border-blue-600/50',   badge: 'bg-blue-600/30 text-blue-300 border-blue-500' },
}

const STRATEGIES = ['GOLDEN_CROSS', 'RSI_REVERSAL', 'AI_ORCHESTRATOR']

function fmt(n, dec = 0) {
  if (n == null) return '-'
  return Number(n).toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

/* ── 슬롯 편집 모달 ── */
function SlotModal({ slot, onClose, onSave }) {
  const [form, setForm] = useState({
    stockCode:      slot.stockCode || '',
    stockName:      slot.stockName || '',
    strategy:       slot.strategy  || 'GOLDEN_CROSS',
    amount:         slot.amount    || 1000000,
    stopLoss:       slot.stopLoss  || 3,
    takeProfit:     slot.takeProfit || 8,
    trailingStop:   slot.trailingStop ?? false,
  })
  const [looking, setLooking] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleLookup = async () => {
    if (!form.stockCode) return
    setLooking(true)
    try {
      const res = await lookupStock(form.stockCode)
      set('stockName', res.name || form.stockCode)
    } catch {
      set('stockName', '조회 실패')
    } finally {
      setLooking(false)
    }
  }

  const handleSave = () => {
    onSave({ ...slot, ...form })
    onClose()
  }

  const Input = ({ label, value, onChange, type = 'text', suffix }) => (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type={type}
          value={value}
          onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
        />
        {suffix && <span className="text-slate-400 text-sm">{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">슬롯 #{slot.id} 설정</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="space-y-4">
          {/* 종목코드 */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">종목코드</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.stockCode}
                onChange={e => set('stockCode', e.target.value.toUpperCase())}
                placeholder="ex) 005930"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleLookup}
                disabled={looking}
                className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {looking ? '조회중...' : '종목조회'}
              </button>
            </div>
            {form.stockName && (
              <p className="text-emerald-400 text-xs mt-1">✓ {form.stockName}</p>
            )}
          </div>

          {/* 전략 선택 */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">전략</label>
            <div className="grid grid-cols-3 gap-1.5">
              {STRATEGIES.map(s => (
                <button
                  key={s}
                  onClick={() => set('strategy', s)}
                  className={`text-xs py-2 px-1 rounded-lg border font-semibold transition-all ${
                    form.strategy === s
                      ? (STRATEGY_COLORS[s]?.badge || 'bg-sky-600 text-white border-sky-500')
                      : 'bg-slate-700 text-slate-400 border-slate-600 hover:border-slate-500'
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* 투자금액 */}
          <Input label="투자금액 (KRW)" value={form.amount} type="number"
            onChange={v => set('amount', v)} suffix="₩" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="손절선 (%)" value={form.stopLoss} type="number"
              onChange={v => set('stopLoss', v)} suffix="%" />
            <Input label="익절선 (%)" value={form.takeProfit} type="number"
              onChange={v => set('takeProfit', v)} suffix="%" />
          </div>

          {/* 트레일링스톱 */}
          <div className="flex items-center justify-between bg-slate-700/40 rounded-lg px-4 py-3 border border-slate-600">
            <div>
              <p className="text-sm font-semibold text-white">트레일링 스톱</p>
              <p className="text-xs text-slate-400">고점 대비 자동 손절 추적</p>
            </div>
            <button
              onClick={() => set('trailingStop', !form.trailingStop)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
                form.trailingStop ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
                form.trailingStop ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors"
          >취소</button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors"
          >저장</button>
        </div>
      </div>
    </div>
  )
}

/* ── 슬롯 카드 ── */
function SlotCard({ slot, onEdit, onToggle }) {
  const colors = STRATEGY_COLORS[slot.strategy] || { bg: 'bg-slate-700/30', border: 'border-slate-600' }
  const holding = slot.holding || {}
  const pnl = Number(holding.pnl || 0)
  const pnlColor = pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-red-400' : 'text-slate-400'

  if (!slot.stockCode) {
    return (
      <div className="bg-slate-800/60 border border-dashed border-slate-600 rounded-xl p-4 flex flex-col items-center justify-center min-h-[220px] text-slate-500 hover:border-slate-500 transition-colors">
        <span className="text-3xl mb-2">+</span>
        <p className="text-xs">슬롯 #{slot.id}</p>
        <p className="text-xs mt-1">비어있음</p>
        <button
          onClick={() => onEdit(slot)}
          className="mt-3 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
        >설정하기</button>
      </div>
    )
  }

  return (
    <div className={`border rounded-xl p-4 shadow-lg transition-all duration-300 ${colors.bg} ${colors.border} ${!slot.active ? 'opacity-60' : ''}`}>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-slate-500 font-mono">#{slot.id}</span>
            {slot.strategy && (
              <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 ${colors.badge || ''}`}>
                {slot.strategy.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-white truncate">{slot.stockName || slot.stockCode}</p>
          <p className="text-xs text-slate-400 font-mono">{slot.stockCode}</p>
        </div>
        {/* ON/OFF 토글 */}
        <button
          onClick={() => onToggle(slot)}
          className={`relative w-10 h-5 rounded-full transition-colors duration-300 flex-shrink-0 ml-2 ${
            slot.active ? 'bg-emerald-500' : 'bg-slate-600'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
            slot.active ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* 보유현황 */}
      {holding.qty > 0 && (
        <div className="bg-black/20 rounded-lg p-2.5 mb-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">수량</span>
            <span className="text-white font-semibold">{fmt(holding.qty)}주</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">평균단가</span>
            <span className="text-white font-mono">₩{fmt(holding.avgPrice)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">현재가</span>
            <span className="text-white font-mono">₩{fmt(holding.currentPrice)}</span>
          </div>
          <div className="flex justify-between text-xs border-t border-slate-700/50 pt-1 mt-1">
            <span className="text-slate-400">평가손익</span>
            <span className={`font-bold ${pnlColor}`}>
              {pnl > 0 ? '+' : ''}{fmt(pnl)} ({Number(holding.pnlRate||0).toFixed(2)}%)
            </span>
          </div>
        </div>
      )}

      {/* 전략 스펙 미니 표 */}
      <div className="bg-black/20 rounded-lg p-2 mb-3">
        <table className="w-full text-[10px]">
          <tbody>
            <tr>
              <td className="text-slate-500 py-0.5">투자금</td>
              <td className="text-slate-200 text-right font-mono">₩{fmt(slot.amount)}</td>
              <td className="text-slate-500 py-0.5 pl-3">손절</td>
              <td className="text-red-400 text-right font-semibold">-{slot.stopLoss}%</td>
            </tr>
            <tr>
              <td className="text-slate-500 py-0.5">익절</td>
              <td className="text-emerald-400 text-right font-semibold">+{slot.takeProfit}%</td>
              <td className="text-slate-500 py-0.5 pl-3">트레일</td>
              <td className={`text-right font-semibold ${slot.trailingStop ? 'text-sky-400' : 'text-slate-500'}`}>
                {slot.trailingStop ? 'ON' : 'OFF'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button
        onClick={() => onEdit(slot)}
        className="w-full py-1.5 text-xs font-semibold bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 rounded-lg border border-slate-600/50 transition-colors"
      >✏️ 편집</button>
    </div>
  )
}

/* ── 메인 SlotManager ── */
export default function StockSlotManager({ slots = [], onSlotsChange }) {
  const [editingSlot, setEditingSlot] = useState(null)

  // MAX_SLOTS 까지 빈 슬롯으로 채움
  const filled = [...slots]
  while (filled.length < MAX_SLOTS) {
    filled.push({ id: filled.length + 1, stockCode: null, active: false })
  }

  const handleToggle = async (slot) => {
    try {
      await toggleSlot(slot.id)
      if (onSlotsChange) onSlotsChange()
    } catch (e) {
      console.error('Toggle error', e)
    }
  }

  const handleSave = async (updatedSlot) => {
    try {
      await updateSlot(updatedSlot.id, updatedSlot)
      if (onSlotsChange) onSlotsChange()
    } catch (e) {
      console.error('Save error', e)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🎰</span>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">주식 슬롯 매니저</h2>
        <span className="ml-auto text-xs text-slate-500">
          운영중 {slots.filter(s => s.active).length} / {MAX_SLOTS}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {filled.map(slot => (
          <SlotCard
            key={slot.id}
            slot={slot}
            onEdit={setEditingSlot}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {editingSlot && (
        <SlotModal
          slot={editingSlot}
          onClose={() => setEditingSlot(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
