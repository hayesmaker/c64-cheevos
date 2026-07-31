import { describe, expect, test, vi } from 'vitest'

import BeachHead from '../src/cheevos/BeachHead.js'

const ADDR = {
  skill: 0x9600,
  scoreLo: 0x9606,
  scoreHi: 0x9607,
  ships: 0x960e,
  tanks: 0x960f,
  bunkerHp: 0x9610
}

const createBeachHead = (memory = {}, overrides = {}) => {
  const cheevos = new BeachHead({
    gameId: 'beach-head-game',
    user: { id: 'user1', username: 'player1' },
    cheevosSet: { _id: 'set1', cheevos: [] },
    poppedCheevos: [],
    ...overrides
  })

  cheevos.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)
  return cheevos
}

describe('BeachHead', () => {
  test('submits score when ships reach zero', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.skill]: 0x02,
      [ADDR.scoreLo]: 0x23,
      [ADDR.scoreHi]: 0x01,
      [ADDR.ships]: 10,
      [ADDR.tanks]: 0,
      [ADDR.bunkerHp]: 10
    }
    const cheevos = createBeachHead(memory, { postScore })

    cheevos.execute()
    memory[ADDR.ships] = 0
    cheevos.execute()

    expect(postScore).toHaveBeenCalledWith(
      'beach-head-game',
      12300,
      'user1',
      'player1',
      1
    )
  })

  test('submits score when tanks reach zero during beach head stage', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.skill]: 0x02,
      [ADDR.scoreLo]: 0x23,
      [ADDR.scoreHi]: 0x01,
      [ADDR.ships]: 10,
      [ADDR.tanks]: 8,
      [ADDR.bunkerHp]: 10
    }
    const cheevos = createBeachHead(memory, { postScore })

    cheevos.execute()
    memory[ADDR.tanks] = 0
    cheevos.execute()

    expect(postScore).toHaveBeenCalledWith(
      'beach-head-game',
      12300,
      'user1',
      'player1',
      1
    )
  })
})
