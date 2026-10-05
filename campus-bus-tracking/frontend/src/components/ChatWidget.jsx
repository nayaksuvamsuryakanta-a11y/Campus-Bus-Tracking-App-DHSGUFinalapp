import { useEffect, useRef, useState } from 'react'
import Loader from './Loader.jsx'
import { sendChatMessage } from '../services/chatService.js'

const WELCOME_MESSAGE =
  'Ask about DHSGU facts, campus places, routes, or alerts. Route and location details marked Demo data are not official.'

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', text: WELCOME_MESSAGE },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const messageEndRef = useRef(null)

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages, isLoading])

  async function handleSubmit(event) {
    event.preventDefault()
    const question = message.trim()
    if (!question || isLoading) return

    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: 'user', text: question },
    ].slice(-21))
    setMessage('')
    setIsLoading(true)

    try {
      const result = await sendChatMessage(question)
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-assistant`, role: 'assistant', text: result.answer },
      ].slice(-21))
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant-error`,
          role: 'assistant',
          text: error.response?.data?.error || 'The assistant is unavailable. Please try again later.',
        },
      ].slice(-21))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="position-fixed bottom-0 end-0 m-3 m-md-4" style={{ zIndex: 1055 }}>
      {isOpen && (
        <section
          className="card shadow mb-3"
          aria-label="DHSGU Transit and Safety Assistant"
          style={{ width: 'min(360px, calc(100vw - 2rem))' }}
        >
          <header className="card-header d-flex justify-content-between align-items-center gap-2">
            <div>
              <h2 className="h6 mb-0">DHSGU Transit &amp; Safety Assistant</h2>
              <span className="small text-body-secondary">AI answers use available university data</span>
            </div>
            <button
              className="btn-close"
              type="button"
              aria-label="Close assistant"
              onClick={() => setIsOpen(false)}
            />
          </header>
          <div
            className="card-body d-flex flex-column gap-2 overflow-auto"
            aria-live="polite"
            style={{ height: 'min(52vh, 380px)' }}
          >
            {messages.map((item) => (
              <div
                key={item.id}
                className={`d-flex ${item.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
              >
                <p
                  className={`mb-0 p-2 rounded ${item.role === 'user' ? 'bg-primary text-white' : 'bg-body-tertiary'}`}
                  style={{ maxWidth: '88%', whiteSpace: 'pre-wrap' }}
                >
                  {item.text}
                </p>
              </div>
            ))}
            {isLoading && <Loader label="Assistant is thinking" />}
            <div ref={messageEndRef} />
          </div>
          <form className="card-footer" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="assistant-message">Ask a question</label>
            <div className="input-group">
              <input
                className="form-control"
                id="assistant-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask a campus question"
                maxLength={2000}
                disabled={isLoading}
              />
              <button className="btn btn-primary" type="submit" disabled={isLoading || !message.trim()}>
                Send
              </button>
            </div>
          </form>
        </section>
      )}
      <div className="d-flex justify-content-end">
        <button
          className="btn btn-primary shadow"
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close DHSGU assistant' : 'Open DHSGU assistant'}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? 'Close assistant' : 'Ask DHSGU'}
        </button>
      </div>
    </div>
  )
}

export default ChatWidget