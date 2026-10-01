import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/api.js', () => ({
  default: { post: vi.fn() },
}))

import api from '../services/api.js'
import { sendChatMessage } from '../services/chatService.js'

describe('sendChatMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the message to the chat endpoint and returns the response data', async () => {
    api.post.mockResolvedValue({ data: { reply: 'Check the Routes page.' } })

    await expect(sendChatMessage('Where can I find routes?')).resolves.toEqual({
      reply: 'Check the Routes page.',
    })
    expect(api.post).toHaveBeenCalledWith('/api/chat', {
      message: 'Where can I find routes?',
    })
  })

  it('keeps network failures catchable by the chat widget', async () => {
    const networkError = new Error('Network unavailable')
    api.post.mockRejectedValue(networkError)

    await expect(sendChatMessage('Hello')).rejects.toBe(networkError)
  })
})