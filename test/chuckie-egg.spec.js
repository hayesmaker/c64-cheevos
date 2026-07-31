import { describe, expect, test, vi } from 'vitest'

import ChuckieEgg from '../src/cheevos/ChuckieEgg.js'

const ADDR = {
  score1: 0x0064,
  score2: 0x0065,
  score3: 0x0066,
  score4: 0x0067,
  score5: 0x0068,
  lives: 0x006a
}

const createChuckieEgg = (memory = {}, overrides = {}) => {
  const cheevos = new ChuckieEgg({
    gameId: 'chuckie-egg-game',
    user: { id: 'user1', username: 'player1' },
    cheevosSet: { _id: 'set1', cheevos: [] },
    poppedCheevos: [],
    ...overrides
  })

  cheevos.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)
  return cheevos
}

describe('ChuckieEgg', () => {
  test('submits score when lives reach zero after game start', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.score1]: 1,
      [ADDR.score2]: 2,
      [ADDR.score3]: 3,
      [ADDR.score4]: 4,
      [ADDR.score5]: 5,
      [ADDR.lives]: 5
    }
    const cheevos = createChuckieEgg(memory, { postScore })

    cheevos.execute()
    cheevos.execute()
    memory[ADDR.lives] = 0
    cheevos.execute()
    cheevos.execute()

    expect(postScore).toHaveBeenCalledWith(
      'chuckie-egg-game',
      123450,
      'user1',
      'player1'
    )
  })
})
