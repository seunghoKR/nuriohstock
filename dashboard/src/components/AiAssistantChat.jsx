import React, { useState, useEffect, useRef } from 'react'

export default function AiAssistantChat({ balance, slots, trades }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      avatar: 'https://raw.githubusercontent.com/wonseokjung/solopreneur-ai-agents/main/agents/youngja/assets/youngja_hello.png',
      text: '대표님~ 안녕하세요! AI 주식 매매 비서 영자예요! 🎨✨\n\n오늘 장세나 보유 종목, 매매 전략에 대해 무엇이든 편하게 물어보세요~ 제가 실시간 데이터와 함께 친절하게 브리핑해 드릴게요! 💖'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState('checking') // 'connected' | 'offline' | 'checking'
  const messagesEndRef = useRef(null)

  // 로컬 AI 연결 상태 체크 (LM Studio 1234 포트)
  useEffect(() => {
    const checkLocalAi = async () => {
      try {
        const res = await fetch('/local-ai/models', { signal: AbortSignal.timeout(2000) })
        if (res.ok) {
          setAiStatus('connected')
        } else {
          setAiStatus('offline')
        }
      } catch {
        setAiStatus('offline')
      }
    }
    checkLocalAi()
    const interval = setInterval(checkLocalAi, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // 로컬 AI로 메시지 전송
  const handleSend = async (textToSend) => {
    const userQuery = textToSend || input.trim()
    if (!userQuery || isLoading) return

    const newMsg = { id: Date.now(), sender: 'user', text: userQuery }
    setMessages(prev => [...prev, newMsg])
    setInput('')
    setIsLoading(true)

    // 시스템 컨텍스트 (실시간 계좌/슬롯 정보 주입)
    const contextPrompt = `
당신은 1인 기업가 이승호 대표님을 보좌하는 친절하고 똑똑한 AI 주식 매매 비서이자 디자인실장 '영자'입니다.
말투는 항상 상냥하고 감각적인 한국어로, "대표님~", "저 영자가요~"를 사용하며 이모지를 적절히 섞어 따뜻하고 전문적으로 답변하세요.

[현재 대표님의 실시간 주식 포트폴리오 데이터]
- 총 평가금액: ${(balance?.totalEval || 0).toLocaleString()}원
- 예수금(매수 가능 현금): ${(balance?.availableCash || 0).toLocaleString()}원
- 오늘 실현 손익: ${(balance?.todayPnl || 0).toLocaleString()}원 (${balance?.todayPnlRate || 0}%)
- 활성 슬롯 현황:
${slots?.filter(s => s.stockCode).map(s => `  * 슬롯 ${s.id}: ${s.stockName}(${s.stockCode}) | 전략: ${s.strategy} | 가동상태: ${s.active ? '가동중' : '정지'}`).join('\n')}

대표님의 질문에 대해 위 포트폴리오 상황을 참고하여 전문적이고 실행 가능한 조언을 해주세요.
`.trim()

    try {
      // 1. 로컬 AI (LM Studio) 호출 시도 (Gemma 4 E2B 및 로컬 모델 완벽 지원)
      const res = await fetch('/local-ai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemma-4-e2b',
          messages: [
            { role: 'system', content: contextPrompt },
            ...messages.slice(-3).map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text
            })),
            { role: 'user', content: userQuery }
          ],
          temperature: 0.7,
          max_tokens: 1200
        }),
        signal: AbortSignal.timeout(45000)
      })

      if (!res.ok) throw new Error('Local AI error')
      const data = await res.json()
      const msgObj = data.choices?.[0]?.message || {}
      let aiReply = msgObj.content?.trim()
      
      // 추론형(Thinking) 모델 대응 (content가 비어있을 경우 reasoning_content 활용)
      if (!aiReply && msgObj.reasoning_content) {
        aiReply = msgObj.reasoning_content.trim()
      }
      if (!aiReply) {
        aiReply = '대표님, 분석 결과를 생성하지 못했어요. 다시 한 번 말씀해 주세요~ 💖'
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        avatar: 'https://raw.githubusercontent.com/wonseokjung/solopreneur-ai-agents/main/agents/youngja/assets/youngja_thumbsup.png',
        text: aiReply
      }])
    } catch {
      // 2. 로컬 AI 서버 미실행 시 지능형 로컬 규칙 폴백 답변
      let fallbackText = ''
      if (userQuery.includes('삼성전자') || userQuery.includes('005930')) {
        fallbackText = `대표님! 삼성전자는 현재 1번 슬롯에서 RSI 과매도 반등 전략으로 모니터링하기 딱 좋아요! 📉➔📈\n\n현재 예수금이 ${(balance?.availableCash || 0).toLocaleString()}원 있으시니까, 1주(약 6~7만원) 소액으로 1회 매수금액을 맞추고 [익절 +4% / 손절 -2%]로 설정해두시면 아주 안전한 연습이 된답니다~!`
      } else if (userQuery.includes('잔고') || userQuery.includes('수익') || userQuery.includes('계좌')) {
        fallbackText = `대표님 계좌 브리핑해 드릴게요! 📊\n\n• 총 평가금액: ${(balance?.totalEval || 0).toLocaleString()}원\n• 가용 예수금: ${(balance?.availableCash || 0).toLocaleString()}원\n• 오늘 손익: ${(balance?.todayPnl || 0).toLocaleString()}원\n\n무리한 매수보다는 예수금의 10% 이내로만 분할 진입하는 게 안전해요~!`
      } else if (userQuery.includes('RSI') || userQuery.includes('전략')) {
        fallbackText = `RSI(상대강도지수)는 주식이 지금 '너무 과하게 팔렸는지(과매도)'를 알려주는 마법 지표예요! 💡\n\nRSI가 30 이하로 떨어지면 시장 공포 때문에 억울하게 빠진 상태라, 저가에 줍줍해서 기술적 반등(+3~5%)을 노리는 게 초보자분들께 가장 승률 높은 전략이에요~ ✨`
      } else {
        fallbackText = `대표님 말씀 잘 들었어요! 💖\n\n💡 (안내) 현재 LM Studio(로컬 AI)가 꺼져 있어서 지능형 기본 가이드 모드로 답변드리고 있어요. LM Studio를 켜고 모델을 로드하시면 무제한 딥러닝 분석이 가능해져요!\n\n현재 시스템은 정상 가동 중이니 1번 슬롯의 설정을 언제든 말씀해 주세요~!`
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        avatar: 'https://raw.githubusercontent.com/wonseokjung/solopreneur-ai-agents/main/agents/youngja/assets/youngja_idea.png',
        text: fallbackText
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const quickChips = [
    '💡 삼성전자 지금 살 타이밍이야?',
    '📊 내 계좌 잔고랑 손익 브리핑해줘',
    '⚙️ 초보자 1번 슬롯 세팅 추천해줘',
    '📈 RSI 과매도 전략이 왜 좋아?'
  ]

  return (
    <>
      {/* ── 우측 하단 플로팅 챗 버튼 ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-3.5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 border border-purple-400/40 group"
      >
        <div className="relative">
          <img
            src="https://raw.githubusercontent.com/wonseokjung/solopreneur-ai-agents/main/agents/youngja/assets/youngja_hello.png"
            alt="영자"
            className="w-8 h-8 rounded-full border border-white/40 shadow-sm"
          />
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${aiStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </div>
        <span className="font-semibold text-sm tracking-wide">AI 비서 영자</span>
        <span className="text-xs bg-purple-900/60 px-2 py-0.5 rounded-full text-purple-200 border border-purple-400/30">
          {aiStatus === 'connected' ? '로컬 AI ON' : '스마트 비서'}
        </span>
      </button>

      {/* ── 챗 모달 윈도우 ── */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[580px] bg-slate-900/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* 헤더 */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border-b border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://raw.githubusercontent.com/wonseokjung/solopreneur-ai-agents/main/agents/youngja/assets/youngja_hello.png"
                alt="영자"
                className="w-9 h-9 rounded-full border-2 border-purple-400/60 shadow"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-100">AI 주식 매매 비서 영자</h3>
                  <span className={`w-2 h-2 rounded-full ${aiStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                </div>
                <p className="text-[11px] text-slate-400">
                  {aiStatus === 'connected' ? '⚡ 로컬 AI (LM Studio) 연결됨' : '💡 지능형 주식 가이드 가동중'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/60 text-lg transition"
            >
              ✕
            </button>
          </div>

          {/* 메시지 리스트 */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <img
                    src={msg.avatar}
                    alt="AI"
                    className="w-7 h-7 rounded-full border border-purple-400/30 flex-shrink-0 mt-0.5"
                  />
                )}
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center text-xs text-purple-300/80 px-2 py-1">
                <span className="animate-spin text-sm">✨</span> 영자가 분석하고 있어요...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 빠른 추천 칩 */}
          <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800 flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.replace(/^[^\s]+ /, ''))}
                className="whitespace-nowrap text-[11px] bg-slate-800 hover:bg-purple-900/40 text-purple-200 border border-purple-500/20 px-2.5 py-1 rounded-full transition"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* 입력창 */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="p-3 bg-slate-950 border-t border-purple-500/20 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="영자에게 주식이나 매매에 대해 물어보세요..."
              className="flex-1 bg-slate-800/90 text-slate-100 placeholder-slate-500 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-400 transition"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition shadow"
            >
              전송
            </button>
          </form>
        </div>
      )}
    </>
  )
}
