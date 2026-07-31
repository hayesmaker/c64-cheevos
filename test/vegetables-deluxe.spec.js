import { describe, expect, test, vi } from 'vitest'

import VegetablesDeluxe from '../src/cheevos/VegetablesDeluxe.js'

const ADDR = {
  inGame: 0x00c5,
  gameMode: 0x08c9,
  score1: 0x51c4,
  score2: 0x51c5,
  score3: 0x51c6,
  shuffles: 0x51cb
}

const createVegetablesDeluxe = (memory = {}, overrides = {}) => {
  const originalCpuReadNS = VegetablesDeluxe.prototype.cpuReadNS
  VegetablesDeluxe.prototype.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)

  const cheevos = new VegetablesDeluxe({
    gameId: 'vegetables-deluxe-game',
    user: { id: 'user1', username: 'player1' },
    cheevosSet: { _id: 'set1', cheevos: [] },
    poppedCheevos: [],
    ...overrides
  })

  if (originalCpuReadNS) {
    VegetablesDeluxe.prototype.cpuReadNS = originalCpuReadNS
  } else {
    delete VegetablesDeluxe.prototype.cpuReadNS
  }

  cheevos.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)
  return cheevos
}

describe('VegetablesDeluxe', () => {
  test('submits score when shuffles reach game-over value', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.inGame]: 64,
      [ADDR.gameMode]: 0x02,
      [ADDR.score1]: 0x45,
      [ADDR.score2]: 0x23,
      [ADDR.score3]: 0x01,
      [ADDR.shuffles]: 1
    }
    const cheevos = createVegetablesDeluxe(memory, { postScore })

    cheevos.execute()
    memory[ADDR.shuffles] = 255
    cheevos.execute()

    expect(postScore).toHaveBeenCalledWith(
      'vegetables-deluxe-game',
      1234500,
      'user1',
      'player1',
      1
    )
  })
})
