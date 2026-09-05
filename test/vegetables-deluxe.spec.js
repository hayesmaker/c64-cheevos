import { describe, expect, test, vi } from 'vitest'

import VegetablesDeluxe from '../src/cheevos/VegetablesDeluxe.js'

const ADDR = {
  inGame: 0x0314,
  gameMode: 0x08c9,
  score1: 0x51c4,
  score2: 0x51c5,
  score3: 0x51c6,
  shuffles: 0x51cb
}

const createVegetablesDeluxe = (memory = {}, overrides = {}) => {
  const cheevos = new VegetablesDeluxe({
    gameId: 'vegetables-deluxe-game',
    user: { id: 'user1', username: 'player1' },
    cheevosSet: { _id: 'set1', cheevos: [] },
    poppedCheevos: [],
    ...overrides
  })

  cheevos.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)
  return cheevos
}

describe('VegetablesDeluxe', () => {
  test('can be constructed before a memory reader is attached', () => {
    expect(() => new VegetablesDeluxe({
      gameId: 'vegetables-deluxe-game',
      user: { id: 'user1', username: 'player1' },
      cheevosSet: { _id: 'set1', cheevos: [] },
      poppedCheevos: []
    })).not.toThrow()
  })

  test('defines compact Ultimate memory polling ranges', () => {
    expect(VegetablesDeluxe.ultimate.pollIntervalMs).toBe(250)
    expect(VegetablesDeluxe.ultimateMemoryRanges).toEqual([
      { address: 0x0314, length: 1, label: 'Game state' },
      { address: 0x08c9, length: 1, label: 'Game mode' },
      { address: 0x51c4, length: 8, label: 'Score and shuffles' }
    ])
  })

  test('submits score when shuffles reach game-over value', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.inGame]: 0x95,
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

  test('dispatches newGame when a new game starts', () => {
    const memory = {
      [ADDR.inGame]: 0x95,
      [ADDR.gameMode]: 0x02,
      [ADDR.shuffles]: 1
    }
    const cheevos = createVegetablesDeluxe(memory)
    const newGame = vi.fn()
    cheevos.watcher.on('newGame', newGame)

    cheevos.execute()

    expect(newGame).toHaveBeenCalledWith({ gameMode: 1 })
  })

  test('does not dispatch newGame from title screen state', () => {
    const memory = {
      [ADDR.inGame]: 0x8c,
      [ADDR.gameMode]: 0x02,
      [ADDR.score1]: 0x00,
      [ADDR.score2]: 0x20,
      [ADDR.score3]: 0x15,
      [ADDR.shuffles]: 32
    }
    const cheevos = createVegetablesDeluxe(memory)
    const newGame = vi.fn()
    cheevos.watcher.on('newGame', newGame)

    cheevos.execute()

    expect(newGame).not.toHaveBeenCalled()
    expect(cheevos.score).toBe(0)
  })

  test('detects gameplay after title screen when exact start shuffle poll is missed', () => {
    const memory = {
      [ADDR.inGame]: 0x8c,
      [ADDR.gameMode]: 0x02,
      [ADDR.score1]: 0x00,
      [ADDR.score2]: 0x20,
      [ADDR.score3]: 0x15,
      [ADDR.shuffles]: 32
    }
    const cheevos = createVegetablesDeluxe(memory)
    const newGame = vi.fn()
    cheevos.watcher.on('newGame', newGame)

    cheevos.execute()
    memory[ADDR.inGame] = 0x95
    memory[ADDR.score1] = 0x03
    memory[ADDR.score2] = 0x00
    memory[ADDR.score3] = 0x00
    cheevos.execute()

    expect(newGame).toHaveBeenCalledWith({ gameMode: 1 })
    expect(cheevos.score).toBe(300)
  })
})
