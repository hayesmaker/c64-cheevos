import { describe, expect, test, vi } from 'vitest'

import MariosCementFactory from '../src/cheevos/MariosCementFactory.js'

const ADDR = {
  gameMode: 0x20c9,
  scoreLow: 0x8121,
  scoreHigh: 0x8122,
  livesLost: 0x824c,
  col: 0x8da0,
  row: 0x8da1
}

const createMariosCementFactory = (memory = {}, overrides = {}) => {
  const cheevos = new MariosCementFactory({
    gameId: 'marios-cement-factory-game',
    user: { id: 'user1', username: 'player1' },
    cheevosSet: { _id: 'set1', cheevos: [] },
    poppedCheevos: [],
    ...overrides
  })

  cheevos.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)
  return cheevos
}

describe('MariosCementFactory', () => {
  test('defines compact Ultimate memory polling ranges', () => {
    expect(MariosCementFactory.ultimate.pollIntervalMs).toBe(1000)
    expect(MariosCementFactory.ultimateMemoryRanges).toEqual([
      { address: 0x20c9, length: 1, label: 'Game mode' },
      { address: 0x8121, length: 2, label: 'Score' },
      { address: 0x824c, length: 1, label: 'Lives lost' },
      { address: 0x8da0, length: 2, label: 'Player position' }
    ])
  })

  test('submits score when lives lost reaches three', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.gameMode]: 1,
      [ADDR.scoreLow]: 0x23,
      [ADDR.scoreHigh]: 0x01,
      [ADDR.livesLost]: 0,
      [ADDR.col]: 0,
      [ADDR.row]: 0
    }
    const cheevos = createMariosCementFactory(memory, { postScore })

    cheevos.execute()
    memory[ADDR.livesLost] = 1
    cheevos.execute()
    memory[ADDR.livesLost] = 2
    cheevos.execute()
    memory[ADDR.livesLost] = 3
    cheevos.execute()

    expect(postScore).toHaveBeenCalledWith(
      'marios-cement-factory-game',
      123,
      'user1',
      'player1',
      1
    )
  })

  test('dispatches new game when lives lost resets to zero', () => {
    const memory = {
      [ADDR.gameMode]: 1,
      [ADDR.scoreLow]: 0,
      [ADDR.scoreHigh]: 0,
      [ADDR.livesLost]: 1,
      [ADDR.col]: 0,
      [ADDR.row]: 0
    }
    const cheevos = createMariosCementFactory(memory)
    const onNewGame = vi.fn()
    cheevos.watcher.on('newGame', onNewGame)
    cheevos.livesLost = 1

    memory[ADDR.livesLost] = 0
    cheevos.execute()

    expect(onNewGame).toHaveBeenCalledWith({ gameMode: 1 })
  })

  test('does not submit duplicate scores while game-over state is polled repeatedly', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.gameMode]: 1,
      [ADDR.scoreLow]: 0x23,
      [ADDR.scoreHigh]: 0x01,
      [ADDR.livesLost]: 2,
      [ADDR.col]: 0,
      [ADDR.row]: 0
    }
    const cheevos = createMariosCementFactory(memory, { postScore })
    cheevos.livesLost = 2

    memory[ADDR.livesLost] = 3
    cheevos.execute()
    cheevos.execute()
    cheevos.execute()

    expect(postScore).toHaveBeenCalledTimes(1)
  })
})
