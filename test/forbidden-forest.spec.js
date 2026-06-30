import { describe, expect, test, vi } from 'vitest'

import ForbiddenForest from '../src/cheevos/ForbiddenForest.js'

const createForbiddenForest = (memory = {}, overrides = {}) => {
  const cheevos = new ForbiddenForest({
    gameId: 'forbidden-forest-game',
    user: { id: 'user1', username: 'player1' },
    cheevosSet: { _id: 'set1', cheevos: [] },
    poppedCheevos: [],
    ...overrides
  })

  cheevos.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)
  return cheevos
}

describe('Forbidden Forest Cheevos', () => {
  test('decodes packed BCD score from zero page memory', () => {
    const cheevos = createForbiddenForest({
      0x002a: 0x00,
      0x002b: 0x20,
      0x002c: 0x00,
      0x002d: 0x00
    })

    expect(cheevos.getScore()).toBe(2000)
  })

  test('starts a game when lives becomes positive', () => {
    const cheevos = createForbiddenForest({
      0x0055: 1,
      0x005f: 3,
      0x0069: 0x04
    })

    cheevos.execute()

    expect(cheevos.isGameOver).toBe(false)
    expect(cheevos.lives).toBe(3)
    expect(cheevos.gameMode).toBe(0)
  })

  test('does not start during the title cutscene before player control', () => {
    const cheevos = createForbiddenForest({
      0x0055: 5,
      0x005f: 3,
      0x0069: 0x04
    })

    cheevos.execute()

    expect(cheevos.isGameOver).toBe(true)
  })

  test.each([
    [0x04, 0],
    [0x08, 1],
    [0x0c, 2],
    [0x10, 3]
  ])('maps difficulty byte %s to gameMode %s', (difficultyByte, gameMode) => {
    const cheevos = createForbiddenForest({
      0x0069: difficultyByte
    })

    expect(cheevos.getGameMode()).toBe(gameMode)
  })

  test('submits score when lives reach zero after game start', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = {
      0x002a: 0x00,
      0x002b: 0x30,
      0x002c: 0x00,
      0x002d: 0x00,
      0x0055: 1,
      0x005f: 3,
      0x0069: 0x0c
    }
    const cheevos = createForbiddenForest(memory, { postScore })

    cheevos.execute()
    memory[0x005f] = 0
    cheevos.execute()

    expect(postScore).toHaveBeenCalledWith(
      'forbidden-forest-game',
      3000,
      'user1',
      'player1',
      2
    )
  })
})
