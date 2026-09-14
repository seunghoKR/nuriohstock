import React from 'react'

const AGENT_TYPES = [
  { key: 'technical', label: '기술적분석', icon: '📊' },
  { key: 'risk',      label: '리스크관리', icon: '🛡️' },
  { key: 'signal',    label: '신호전달',   icon: '📡' },
  { key: 'news',      label: '뉴스분석',   icon: '📰' },
  { key: 'orchestrator', label: '오케스트레이터', icon: '🎯' },
]

const STATUS_CONFIG = {
  '대기':    { bg: 'bg-slate-700',   text: 'text-slate-300', dot: 'bg-slate-400' },
  '분석중':  { bg: 'bg-blue-900/50', text: 'text-blue-300',  dot: 'bg-blue-400 animate-pulse' },
  '신호발생':{ bg: 'bg-emerald-900/50', text: 'text-emerald-300', dot: 'bg-emerald-400 animate-pulse' },
  '오류':    { bg: 'bg-red-900/50',  text: 'text-red-300',   dot: 'bg-red-400 animate-pulse' },
}

export default function AgentStatusCard({ agents = {} }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🤖</span>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">에이전트 상태</h2>
      </div>

      <div className="space-y-2.5">
        {AGENT_TYPES.map(({ key, label, icon }) => {
          const info = agents[key] || {}
          const status = info.status || '대기'
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['대기']
          return (
            <div
              key={key}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border border-slate-700 ${cfg.bg} transition-all duration-300`}
            >
              <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{label}</span>
                  <span className={`flex items-center gap-1 text-xs font-medium ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} inline-block`} />
                    {status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 truncate">
                  {info.lastRun && <span>⏱ {info.lastRun}</span>}
                  {info.target  && <span className="text-slate-300">· {info.target}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
