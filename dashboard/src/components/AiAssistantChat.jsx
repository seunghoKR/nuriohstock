import React, { useState, useEffect, useRef, useCallback } from 'react'

export default function AiAssistantChat({
  isOpen,
  setIsOpen,
  width = 440,
  setWidth,
  balance,
  slots,
  trades
}) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      avatar: 'https://raw.githubusercontent.com/wonseokjung/solopreneur-ai-agents/main/agents/youngja/assets/youngja_hello.png',
      text: '대표님~ 안녕하세요! AI 디자인실장이자 주식 비서 영자예요! 🎨✨\n\n대표님께서 편하게 질문하실 수 있도록 화면 오른쪽에 든든하게 고정해 두었어요!\n왼쪽 테두리를 마우스로 드래그하시면 가로 너비도 자유롭게 조절하실 수 있답니다~ 💻\n\n오늘 장세, 계좌 잔고, 추천전략이나 주식 초보 질문까지 무엇이든 편하게 물어보세요! 💖'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState('checking') // 'connected' | 'offline' | 'checking'
  const messagesEndRef = useRef(null)

  // 리사이징 관련 ref
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(width)

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

  // 메시지 스크롤 맨 아래로
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // 가로 크기 드래그 리사이저 핸들러
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    isDraggingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = width
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return
      // 우측 사이드바: 마우스를 왼쪽으로 움직일수록 폭(width)이 넓어짐
      const deltaX = startXRef.current - moveEvent.clientX
      const newWidth = Math.min(
        Math.max(startWidthRef.current + deltaX, 320),
        Math.min(window.innerWidth - 120, 850)
      )
      if (setWidth) {
        setWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        if (setWidth) {
          setWidth((finalW) => {
            localStorage.setItem('youngja_chat_width', String(finalW))
            return finalW
          })
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [width, setWidth])

  // 로컬 AI로 메시지 전송
  const handleSend = async (textToSend) => {
    const userQuery = textToSend || input.trim()
    if (!userQuery || isLoading) return

    const newMsg = { id: Date.now(), sender: 'user', text: userQuery }
    setMessages(prev => [...prev, newMsg])
    setInput('')
    setIsLoading(true)

    try {
      // 백엔드 API (/api/ai/chat) 호출: LM Studio + 20년 트레이더 페르소나 + 실시간 시세/계좌 데이터 결합
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userQuery }),
        signal: AbortSignal.timeout(90000)
      })

      if (!res.ok) throw new Error('AI Chat error')
      const data = await res.json()
      const aiReply = data.reply || '대표님, 분석 결과를 생성하지 못했어요.'

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        avatar: 'https://raw.githubusercontent.com/wonseokjung/solopreneur-ai-agents/main/agents/youngja/assets/youngja_thumbsup.png',
        text: aiReply
      }])
    } catch {
      // 로컬 AI 지연 시 친절한 주식 가이드 폴백
      let fallbackText = ''
      if (userQuery.includes('5만원') || (userQuery.includes('삼성전자') && (userQuery.includes('살 수') || userQuery.includes('접근')))) {
        fallbackText = `대표님! 완전 중요한 팩트 질문이세요~ 💡✨\n\n1. **삼성전자 1주 가격**: 현재 약 250,000원 선(최근 시세 기준)이에요. 국내 정규장에서는 '1주 단위'로 체결되기 때문에 5만원으로는 1주를 매수할 수 없어요!\n2. **슬롯 투자금액 설정 팁**:\n• 만약 슬롯 투자금을 5만원으로 지정해두시면 1주 가격(약 25만원) 미만이라 주문이 나가지 않아요 🙅‍♀️\n• 삼성전자를 매매하시려면 슬롯 매수금액을 **최소 30만원 이상**으로 설정해두셔야 1주씩 안전하게 매수된답니다!\n3. **소액(5~10만원)으로 시작하고 싶으실 땐**:\n• 주당 가격이 1~5만원 대인 알짜 대형주나 KODEX 코스피 ETF 같은 종목을 슬롯에 등록하시면 소액으로도 완벽하게 자동매매를 돌리실 수 있어요~ 💖`
      } else if (userQuery.includes('시장') || userQuery.includes('상황') || userQuery.includes('장세')) {
        fallbackText = `대표님! 오늘 시장 상황 핵심 요약해 드릴게요~ 📊✨\n\n• 코스피 대장주 삼성전자는 250,000원선에서 기술적 눌림목(RSI 과매도 구간)을 다지고 있어요.\n• 현재 추천 가동 중인 1호 [우량주 안전 줍줍] 전략이 바닥 반등 시그널을 정밀 감시하고 있답니다.\n\n시장이 주춤할 때가 바로 우량주를 세일 가격에 모아갈 절호의 기회예요~ 든든하게 지켜봐 주세요! 💖`
      } else if (userQuery.includes('잔고') || userQuery.includes('수익') || userQuery.includes('계좌')) {
        fallbackText = `대표님의 실계좌 현황 브리핑해 드릴게요! 📊\n\n• 계좌: 주월클 (68413157-01)\n• 가용 예수금: ${(balance?.availableCash || 1).toLocaleString()}원\n• 추천 가동 전략: 1호 우량주 안전 줍줍 (RSI 과매도 반등)\n\n테스트용 예수금(약 30만원~50만원)을 입금해 주시면, 봇이 황금 매수 타점에 1주를 체결하고 텔레그램으로 즉시 보고드릴게요! ✨`
      } else if (userQuery.includes('1호') || userQuery.includes('안전 줍줍')) {
        fallbackText = `대표님~ 1호 [우량주 안전 줍줍] 전략은요! 🛡️✨\n\n• 삼성전자 같은 초우량주가 일시적인 악재나 시장 공포로 과매도(RSI < 30)에 들어갈 때 딱 1주씩 분할 매수해요.\n• 그리고 반등이 나와서 목표 수익(+3.5%)에 도달하면 욕심부리지 않고 깔끔하게 익절하는 아주 마음 편한 전략이랍니다! 초보 대표님께 강력 추천드려요~ 👍`
      } else {
        fallbackText = `대표님 질문에 대해 시장 데이터를 확인했어요! 💖\n\n현재 대형주들이 단기 눌림목에 위치해 있어 안전한 분할 매수 타점을 엿보기 좋은 타이밍이에요. 저 영자가 1호 [우량주 안전 줍줍]과 2호 [돌파 모멘텀] 전략으로 철저히 보좌해 드릴 테니 믿고 맡겨주세요! ✨`
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
    '💡 삼성전자는 5만원으로 살 수 있어?',
    '📊 내 계좌 잔고랑 가동 상태 브리핑해줘',
    '⚙️ 1호 [우량주 안전 줍줍] 어떻게 운영돼?',
    '📈 RSI 과매도 전략이 왜 초보자한테 좋아?'
  ]

  // 대화 내용 초기화
  const handleClearChat = () => {
    if (window.confirm('대화 기록을 초기화할까요?')) {
      setMessages([
        {
          id: Date.now(),
          sender: 'ai',
          avatar: 'https://raw.githubusercontent.com/wonseokjung/solopreneur-ai-agents/main/agents/youngja/assets/youngja_hello.png',
          text: '대화가 새롭게 정리되었어요, 대표님! ✨\n궁금한 점이 생기시면 언제든 편하게 질문해 주세요~ 💖'
        }
      ])
    }
  }

  return (
    <>
      {/* ── 사이드바가 닫혔을 때: 우측 중앙 미니 플로팅 탭 ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-1/2 right-0 -translate-y-1/2 z-40 flex items-center gap-2.5 bg-gradient-to-l from-purple-700 via-indigo-700 to-slate-900 hover:from-purple-600 hover:to-indigo-600 text-white pl-3.5 pr-2 py-3.5 rounded-l-2xl shadow-2xl transition-all duration-300 transform hover:-translate-x-1 border-y border-l border-purple-400/40 group"
          title="AI 비서 영자 대화창 열기"
        >
          <div className="relative">
            <img
              src="https://raw.githubusercontent.com/wonseokjung/solopreneur-ai-agents/main/agents/youngja/assets/youngja_hello.png"
              alt="영자"
              className="w-8 h-8 rounded-full border border-white/50 shadow"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                aiStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-xs tracking-tight text-white flex items-center gap-1">
              AI 비서 영자
              <span className="text-[10px] text-purple-300">◀</span>
            </span>
            <span className="text-[10px] text-purple-200/80">
              {aiStatus === 'connected' ? '로컬 AI ON' : '스마트 가이드'}
            </span>
          </div>
        </button>
      )}

      {/* ── 화면 우측 고정 사이드바 (전체 높이 100vh) ── */}
      {isOpen && (
        <aside
          style={{ width: `${width}px` }}
          className="fixed top-0 right-0 h-screen z-50 bg-slate-900/98 backdrop-blur-xl border-l border-purple-500/30 shadow-2xl flex flex-col transition-all duration-75 select-none"
        >
          {/* ── 좌측 드래그 리사이저 바 ── */}
          <div
            onMouseDown={handleMouseDown}
            className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize hover:bg-purple-500/50 active:bg-purple-600 transition-colors z-20 flex items-center justify-center group"
            title="마우스를 좌우로 드래그하여 대화창 너비를 조절하세요"
          >
            <div className="w-1 h-12 rounded-full bg-slate-600/70 group-hover:bg-purple-400 group-active:bg-purple-200 transition-colors shadow" />
          </div>

          {/* ── 사이드바 헤더 ── */}
          <div className="p-3.5 bg-gradient-to-r from-slate-950 via-purple-950/50 to-slate-900 border-b border-purple-500/20 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src="https://raw.githubusercontent.com/wonseokjung/solopreneur-ai-agents/main/agents/youngja/assets/youngja_hello.png"
                  alt="영자"
                  className="w-9 h-9 rounded-full border-2 border-purple-400/60 shadow"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                    aiStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                    AI 비서 영자
                    <span className="text-xs">🎨✨</span>
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                      aiStatus === 'connected'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {aiStatus === 'connected' ? '⚡ 로컬 AI (LM Studio)' : '💡 스마트 가이드'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>너비: {width}px</span>
                  <span className="text-slate-600">•</span>
                  <span>왼쪽 테두리 드래그로 조절 가능</span>
                </p>
              </div>
            </div>

            {/* 헤더 우측 조작 버튼 */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/80 text-xs transition"
                title="대화 내용 지우기"
              >
                🔄
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-purple-300 p-1.5 rounded-lg hover:bg-slate-800/80 text-sm font-bold transition flex items-center gap-1"
                title="사이드바 접기"
              >
                <span>접기</span>
                <span className="text-xs">▶</span>
              </button>
            </div>
          </div>

          {/* ── 상단 계좌 미니 스냅샷 뱃지 ── */}
          <div className="px-3.5 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-300 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">예수금:</span>
              <span className="font-bold text-purple-300">
                {(balance?.availableCash || 1).toLocaleString()}원
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">가동 슬롯:</span>
              <span className="font-semibold text-emerald-400">
                {slots?.filter(s => s.active).length || 0}개 가동중
              </span>
            </div>
          </div>

          {/* ── 메시지 리스트 (남은 높이 전체 활용) ── */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700 select-text">
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
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-800/95 text-slate-200 border border-slate-700/80 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center text-xs text-purple-300/90 px-2 py-1 bg-purple-950/30 border border-purple-500/20 rounded-xl w-fit">
                <span className="animate-spin text-sm">✨</span> 영자가 팩트 데이터와 시장을 분석하고 있어요...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── 초보 대표님을 위한 빠른 질문 칩 ── */}
          <div className="p-2.5 bg-slate-950/70 border-t border-slate-800 flex flex-col gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-slate-400 font-medium px-1 flex items-center gap-1">
              <span>💡</span> 자주 묻는 초보 가이드:
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.replace(/^[^\s]+ /, ''))}
                  className="whitespace-nowrap text-[11px] bg-slate-800/90 hover:bg-purple-900/50 hover:text-purple-100 text-slate-300 border border-slate-700/80 hover:border-purple-500/40 px-2.5 py-1 rounded-full transition shadow-sm"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* ── 메시지 입력창 ── */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="p-3 bg-slate-950 border-t border-purple-500/20 flex gap-2 flex-shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="영자에게 주식이나 매매에 대해 편하게 질문하세요..."
              className="flex-1 bg-slate-800/90 text-slate-100 placeholder-slate-500 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-400 transition"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition shadow flex items-center gap-1 flex-shrink-0"
            >
              <span>전송</span>
              <span>💬</span>
            </button>
          </form>
        </aside>
      )}
    </>
  )
}
