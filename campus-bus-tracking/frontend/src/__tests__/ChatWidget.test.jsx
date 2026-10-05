import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/chatService.js', () => ({ sendChatMessage: vi.fn() }))

import { sendChatMessage } from '../services/chatService.js'
import ChatWidget from '../components/ChatWidget.jsx'

describe('ChatWidget', () => {
  beforeEach(() => {
    sendChatMessage.mockResolvedValue({ answer: 'The Routes page has the schedule.', source: 'pollinations' })
  })

  it('opens the panel, sends a question, and renders the assistant reply', async () => {
    const user = userEvent.setup()
    render(<ChatWidget />)

    await user.click(screen.getByRole('button', { name: 'Open DHSGU assistant' }))
    expect(screen.getByRole('region', {
      name: 'DHSGU Transit and Safety Assistant',
    })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Ask a question'), 'Where are the routes?')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(sendChatMessage).toHaveBeenCalledWith('Where are the routes?')
    expect(await screen.findByText('The Routes page has the schedule.')).toBeInTheDocument()
  })

  it('renders the user-facing fallback after a rejected request', async () => {
    const user = userEvent.setup()
    sendChatMessage.mockRejectedValue(new Error('Network unavailable'))
    render(<ChatWidget />)

    await user.click(screen.getByRole('button', { name: 'Open DHSGU assistant' }))
    await user.type(screen.getByLabelText('Ask a question'), 'Is the assistant online?')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('The assistant is unavailable. Please try again later.'))
      .toBeInTheDocument()
  })

  it('keeps no more than 21 messages in conversation history', async () => {
    const user = userEvent.setup()
    let timestamp = 0
    vi.spyOn(Date, 'now').mockImplementation(() => ++timestamp)
    sendChatMessage.mockImplementation(async (question) => ({ answer: `Answer to ${question}`, source: 'offline' }))
    render(<ChatWidget />)
    await user.click(screen.getByRole('button', { name: 'Open DHSGU assistant' }))
    const input = screen.getByLabelText('Ask a question')

    for (let index = 0; index < 11; index += 1) {
      const question = `question-${index}`
      await user.type(input, question)
      await user.click(screen.getByRole('button', { name: 'Send' }))
      await screen.findByText(`Answer to ${question}`)
    }

    const panel = screen.getByRole('region', {
      name: 'DHSGU Transit and Safety Assistant',
    })
    expect(within(panel).queryByText(/Ask about DHSGU facts/)).not.toBeInTheDocument()
    expect(panel.querySelectorAll('p')).toHaveLength(21)
  })

  it('disables sending during an in-flight request and ignores another submission', async () => {
    const user = userEvent.setup()
    let resolveMessage
    sendChatMessage.mockReturnValue(new Promise((resolve) => { resolveMessage = resolve }))
    render(<ChatWidget />)
    await user.click(screen.getByRole('button', { name: 'Open DHSGU assistant' }))
    await user.type(screen.getByLabelText('Ask a question'), 'Is the bus delayed?')

    const sendButton = screen.getByRole('button', { name: 'Send' })
    await user.click(sendButton)
    await waitFor(() => expect(sendButton).toBeDisabled())
    fireEvent.submit(screen.getByLabelText('Ask a question').closest('form'))
    expect(sendChatMessage).toHaveBeenCalledTimes(1)

    resolveMessage({ answer: 'Check the alerts page.', source: 'offline' })
    expect(await screen.findByText('Check the alerts page.')).toBeInTheDocument()
  })
})