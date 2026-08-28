import { describe, expect, test, vi } from 'vitest'

import RainbowIslands from '../src/cheevos/RainbowIslands.js'

const ADDR = {
  score1: 0x115b,
  score2: 0x115c,
  score3: 0x115d,
  score4: 0x115e,
  lives: 0x1160
}

const createRainbowIslands = (memory = {}, overrides = {}) => {
  const cheevos = new RainbowIslands({
    gameId: 'rainbow-islands-game',
    user: { id: 'user1', username: 'player1' },
    cheevosSet: { _id: 'set1', cheevos: [] },
    poppedCheevos: [],
    ...overrides
  })

  cheevos.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)
  return cheevos
}

describe('Rainbow Islands', () => {
  test('submits score when lives switch to game over after game start', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.score1]: 0x00,
      [ADDR.score2]: 0x01,
      [ADDR.score3]: 0x80,
      [ADDR.score4]: 0x60,
      [ADDR.lives]: 0x01
    }
    const cheevos = createRainbowIslands(memory, { postScore })

    cheevos.execute()
    memory[ADDR.lives] = 0xff
    cheevos.execute()

    expect(postScore).toHaveBeenCalledWith(
      'rainbow-islands-game',
      18060,
      'user1',
      'player1'
    )
  })
})
