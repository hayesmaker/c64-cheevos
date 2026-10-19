import { describe, expect, test, vi } from 'vitest'

import RoadRunner from '../src/cheevos/RoadRunner.js'

const ADDR = {
  score: 0x006b,
  lives: 0x00b5,
  screenOff: 0x00eb,
  demoMode: 0x8096
}

// Writes a score as one decimal digit per byte, most significant first.
const setScore = (memory, score) => {
  String(score).padStart(8, '0').split('').forEach((digit, i) => {
    memory[ADDR.score + i] = Number(digit)
  })
}

// Memory as it looks on the title screen: the title resets lives to 5 and
// the score to 0, but the play screen is off.
const titleScreenMemory = () => {
  const memory = {
    [ADDR.lives]: 5,
    [ADDR.screenOff]: 0xff,
    [ADDR.demoMode]: 0
  }
  setScore(memory, 0)
  return memory
}

// Memory once the play screen is up for a fresh game.
const startGame = (memory) => {
  setScore(memory, 0)
  memory[ADDR.lives] = 5
  memory[ADDR.screenOff] = 0
  memory[ADDR.demoMode] = 0
}

const createRoadRunner = (memory, overrides = {}) => {
  const roadRunner = new RoadRunner({
    gameId: 'road-runner-game',
    user: { id: 'user1', username: 'player1' },
    cheevosSet: { _id: 'set1', cheevos: [] },
    poppedCheevos: [],
    ...overrides
  })
  roadRunner.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)
  return roadRunner
}

const listen = (roadRunner, event) => {
  const handler = vi.fn()
  roadRunner.watcher.on(event, handler)
  return handler
}

describe('RoadRunner', () => {
  test('can be constructed before a memory reader is attached', () => {
    expect(() => new RoadRunner({
      gameId: 'road-runner-game',
      user: { id: 'user1', username: 'player1' }
    })).not.toThrow()
  })

  test('does not start a game on the title screen', () => {
    const memory = titleScreenMemory()
    const roadRunner = createRoadRunner(memory)
    const newGame = listen(roadRunner, 'newGame')

    roadRunner.execute()
    roadRunner.execute()

    expect(newGame).not.toHaveBeenCalled()
    expect(roadRunner.isGameOver).toBe(true)
  })

  test('does not start a game while the demo flag is set', () => {
    const memory = titleScreenMemory()
    const roadRunner = createRoadRunner(memory)
    const newGame = listen(roadRunner, 'newGame')

    startGame(memory)
    memory[ADDR.demoMode] = 2
    roadRunner.execute()

    expect(newGame).not.toHaveBeenCalled()
  })

  test('detects a new game and tracks the score digits and lives', () => {
    const memory = titleScreenMemory()
    const roadRunner = createRoadRunner(memory)
    const newGame = listen(roadRunner, 'newGame')
    const livesChange = listen(roadRunner, 'livesChange')

    roadRunner.execute()
    startGame(memory)
    roadRunner.execute()

    expect(newGame).toHaveBeenCalledTimes(1)
    expect(roadRunner.isGameOver).toBe(false)
    expect(roadRunner.lives).toBe(5)

    setScore(memory, 12345670)
    roadRunner.execute()
    expect(roadRunner.score).toBe(12345670)

    memory[ADDR.lives] = 4
    roadRunner.execute()
    expect(livesChange).toHaveBeenLastCalledWith({ lives: 4 })

    memory[ADDR.lives] = 5 // extra life at 30,000 / 60,000 / 90,000
    roadRunner.execute()
    expect(livesChange).toHaveBeenLastCalledWith({ lives: 5 })
  })

  test('keeps tracking when the play screen briefly switches off mid-game', () => {
    const memory = titleScreenMemory()
    const roadRunner = createRoadRunner(memory)

    roadRunner.execute()
    startGame(memory)
    roadRunner.execute()
    memory[ADDR.screenOff] = 0xff
    setScore(memory, 500)
    roadRunner.execute()

    expect(roadRunner.isGameOver).toBe(false)
    expect(roadRunner.score).toBe(500)
  })

  test('submits the score once when the last life is lost', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = titleScreenMemory()
    const roadRunner = createRoadRunner(memory, { postScore })
    const gameOver = listen(roadRunner, 'gameOver')

    roadRunner.execute()
    startGame(memory)
    roadRunner.execute()
    setScore(memory, 70)
    memory[ADDR.lives] = 1
    roadRunner.execute()
    memory[ADDR.lives] = 0
    roadRunner.execute()
    memory[ADDR.screenOff] = 0xff // game over screen
    roadRunner.execute()

    expect(roadRunner.lives).toBe(0)
    expect(gameOver).toHaveBeenCalledTimes(1)
    expect(gameOver).toHaveBeenCalledWith({ score: 70, highScore: 70 })
    expect(postScore).toHaveBeenCalledTimes(1)
    expect(postScore).toHaveBeenCalledWith('road-runner-game', 70, 'user1', 'player1')
  })

  test('does not start a new game when the title resets lives and score', () => {
    const memory = titleScreenMemory()
    const roadRunner = createRoadRunner(memory)
    const newGame = listen(roadRunner, 'newGame')

    roadRunner.execute()
    startGame(memory)
    roadRunner.execute()
    setScore(memory, 70)
    memory[ADDR.lives] = 0
    roadRunner.execute()

    Object.assign(memory, titleScreenMemory())
    roadRunner.execute()

    expect(newGame).toHaveBeenCalledTimes(1)
    expect(roadRunner.isGameOver).toBe(true)
  })

  test('starts a second game after game over', () => {
    const memory = titleScreenMemory()
    const roadRunner = createRoadRunner(memory)
    const newGame = listen(roadRunner, 'newGame')

    roadRunner.execute()
    startGame(memory)
    roadRunner.execute()
    memory[ADDR.lives] = 0
    roadRunner.execute()
    Object.assign(memory, titleScreenMemory())
    roadRunner.execute()
    startGame(memory)
    roadRunner.execute()

    expect(newGame).toHaveBeenCalledTimes(2)
    expect(roadRunner.isGameOver).toBe(false)
  })
})
