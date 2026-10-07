import { describe, expect, test, vi } from 'vitest'

import Thrust from '../src/cheevos/Thrust.js'

const ADDR = {
  score1: 0x0180,
  score2: 0x0181,
  score3: 0x0182,
  fuelEmpty: 0x9402,
  lives: 0x9403,
  demoMode: 0x0063
}

// Memory as it looks on the title screen / demo, after a previous game.
const titleScreenMemory = () => ({
  [ADDR.demoMode]: 0xff,
  [ADDR.lives]: 0x99,
  [ADDR.score1]: 0x50,
  [ADDR.score2]: 0x12
})

// Memory right after start_new_game: score zeroed, 3 spare lives, fuel ok.
const startGame = (memory) => {
  memory[ADDR.demoMode] = 0
  memory[ADDR.score1] = 0
  memory[ADDR.score2] = 0
  memory[ADDR.score3] = 0
  memory[ADDR.lives] = 0x03
  memory[ADDR.fuelEmpty] = 0
}

const createThrust = (memory, overrides = {}) => {
  const thrust = new Thrust({
    gameId: 'thrust-game',
    user: { id: 'user1', username: 'player1' },
    cheevosSet: { _id: 'set1', cheevos: [] },
    poppedCheevos: [],
    ...overrides
  })
  thrust.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)
  return thrust
}

const listen = (thrust, event) => {
  const handler = vi.fn()
  thrust.watcher.on(event, handler)
  return handler
}

describe('Thrust', () => {
  test('can be constructed before a memory reader is attached', () => {
    expect(() => new Thrust({
      gameId: 'thrust-game',
      user: { id: 'user1', username: 'player1' }
    })).not.toThrow()
  })

  test('does not start a game on the title screen or in demo mode', () => {
    const memory = titleScreenMemory()
    const thrust = createThrust(memory)
    const newGame = listen(thrust, 'newGame')

    thrust.execute()
    memory[ADDR.lives] = 0x03 // demo mode resets lives but keeps the flag set
    memory[ADDR.score1] = 0
    memory[ADDR.score2] = 0
    thrust.execute()

    expect(newGame).not.toHaveBeenCalled()
    expect(thrust.isGameOver).toBe(true)
  })

  test('detects a new game and tracks BCD score and lives', () => {
    const memory = titleScreenMemory()
    const thrust = createThrust(memory)
    const newGame = listen(thrust, 'newGame')
    const livesChange = listen(thrust, 'livesChange')

    thrust.execute()
    startGame(memory)
    thrust.execute()

    expect(newGame).toHaveBeenCalledTimes(1)
    expect(thrust.isGameOver).toBe(false)
    expect(thrust.lives).toBe(3)

    memory[ADDR.score1] = 0x50
    memory[ADDR.score2] = 0x23
    memory[ADDR.score3] = 0x01
    thrust.execute()
    expect(thrust.score).toBe(123500)

    memory[ADDR.lives] = 0x02
    thrust.execute()
    expect(livesChange).toHaveBeenLastCalledWith({ lives: 2 })

    memory[ADDR.lives] = 0x10 // BCD: ten lives
    thrust.execute()
    expect(thrust.lives).toBe(10)
  })

  test('submits the score once when the last life is lost', async () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = titleScreenMemory()
    const thrust = createThrust(memory, { postScore })
    const gameOver = listen(thrust, 'gameOver')

    thrust.execute()
    startGame(memory)
    thrust.execute()
    memory[ADDR.score2] = 0x45
    memory[ADDR.lives] = 0x00
    thrust.execute()
    memory[ADDR.lives] = 0x99 // lose_a_life wraps 0 to $99
    thrust.execute()
    thrust.execute()

    expect(thrust.lives).toBe(0)
    expect(gameOver).toHaveBeenCalledTimes(1)
    expect(gameOver).toHaveBeenCalledWith({ score: 45000, highScore: 45000 })
    expect(postScore).toHaveBeenCalledTimes(1)
    expect(postScore).toHaveBeenCalledWith('thrust-game', 45000, 'user1', 'player1')
  })

  test('ends the game when out of fuel, even with lives left', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = titleScreenMemory()
    const thrust = createThrust(memory, { postScore })

    thrust.execute()
    startGame(memory)
    thrust.execute()
    memory[ADDR.score1] = 0x75
    memory[ADDR.fuelEmpty] = 0xff
    thrust.execute()

    expect(thrust.isGameOver).toBe(true)
    expect(postScore).toHaveBeenCalledWith('thrust-game', 750, 'user1', 'player1')

    // Still on the game-over screen: lives are 3 and the score is non-zero,
    // so this must not count as a new game.
    thrust.execute()
    expect(thrust.isGameOver).toBe(true)
  })

  test('ends the game when the player quits to the title screen', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = titleScreenMemory()
    const thrust = createThrust(memory, { postScore })

    thrust.execute()
    startGame(memory)
    thrust.execute()
    memory[ADDR.score1] = 0x20
    thrust.execute()
    memory[ADDR.demoMode] = 0xff // RUN/STOP goes back to high_score_start
    thrust.execute()

    expect(thrust.isGameOver).toBe(true)
    expect(postScore).toHaveBeenCalledWith('thrust-game', 200, 'user1', 'player1')
  })

  test('starts a second game after game over', () => {
    const memory = titleScreenMemory()
    const thrust = createThrust(memory)
    const newGame = listen(thrust, 'newGame')

    thrust.execute()
    startGame(memory)
    thrust.execute()
    memory[ADDR.lives] = 0x99
    thrust.execute()
    memory[ADDR.demoMode] = 0xff
    thrust.execute()
    startGame(memory)
    thrust.execute()

    expect(newGame).toHaveBeenCalledTimes(2)
    expect(thrust.isGameOver).toBe(false)
  })
})
