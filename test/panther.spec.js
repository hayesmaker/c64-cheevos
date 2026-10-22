import { describe, expect, test, vi } from 'vitest'

import Panther from '../src/cheevos/Panther.js'

const ADDR = {
  lives: 0x0010,
  playing: 0x0026,
  gameOver: 0x0027,
  score: 0x842a
}

// Writes a score as one decimal digit per byte, most significant first.
const setScore = (memory, score) => {
  String(score).padStart(8, '0').split('').forEach((digit, i) => {
    memory[ADDR.score + i] = Number(digit)
  })
}

// Memory while the cartridge is still loading: no lives, the main loop isn't
// running and the score bytes hold junk.
const loadingMemory = () => {
  const memory = {
    [ADDR.lives]: 0,
    [ADDR.playing]: 0,
    [ADDR.gameOver]: 0
  }
  for (let i = 0; i < 8; i++) {
    memory[ADDR.score + i] = 0x60 + i
  }
  return memory
}

// Memory once a run has been initialised.
const startGame = (memory) => {
  setScore(memory, 0)
  memory[ADDR.lives] = 6
  memory[ADDR.playing] = 1
  memory[ADDR.gameOver] = 0
}

// Memory on the game over screen after the last life is lost.
const endGame = (memory) => {
  memory[ADDR.lives] = 0
  memory[ADDR.gameOver] = 1
  memory[ADDR.playing] = 0
}

const createPanther = (memory, overrides = {}) => {
  const panther = new Panther({
    gameId: 'panther-game',
    user: { id: 'user1', username: 'player1' },
    cheevosSet: { _id: 'set1', cheevos: [] },
    poppedCheevos: [],
    ...overrides
  })
  panther.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)
  return panther
}

const listen = (panther, event) => {
  const handler = vi.fn()
  panther.watcher.on(event, handler)
  return handler
}

describe('Panther', () => {
  test('can be constructed before a memory reader is attached', () => {
    expect(() => new Panther({
      gameId: 'panther-game',
      user: { id: 'user1', username: 'player1' }
    })).not.toThrow()
  })

  test('does not start a game while the cartridge is loading', () => {
    const memory = loadingMemory()
    const panther = createPanther(memory)
    const newGame = listen(panther, 'newGame')

    panther.execute()
    setScore(memory, 0) // the score bytes are cleared before lives are set
    panther.execute()

    expect(newGame).not.toHaveBeenCalled()
    expect(panther.isGameOver).toBe(true)
  })

  test('detects a new game and tracks the score digits and lives', () => {
    const memory = loadingMemory()
    const panther = createPanther(memory)
    const newGame = listen(panther, 'newGame')
    const livesChange = listen(panther, 'livesChange')

    panther.execute()
    startGame(memory)
    panther.execute()

    expect(newGame).toHaveBeenCalledTimes(1)
    expect(panther.isGameOver).toBe(false)
    expect(panther.lives).toBe(6)

    setScore(memory, 12345670)
    panther.execute()
    expect(panther.score).toBe(12345670)

    memory[ADDR.lives] = 5
    panther.execute()
    expect(livesChange).toHaveBeenLastCalledWith({ lives: 5 })

    memory[ADDR.lives] = 6 // extra life after dropping off survivors
    panther.execute()
    expect(livesChange).toHaveBeenLastCalledWith({ lives: 6 })
    expect(newGame).toHaveBeenCalledTimes(1)
  })

  test('detects a game that has already lost a life by the first poll', () => {
    const memory = loadingMemory()
    const panther = createPanther(memory)
    const newGame = listen(panther, 'newGame')

    panther.execute()
    startGame(memory)
    memory[ADDR.lives] = 5
    panther.execute()

    expect(newGame).toHaveBeenCalledTimes(1)
    expect(panther.lives).toBe(5)
  })

  test('keeps tracking while the game is paused', () => {
    const memory = loadingMemory()
    const panther = createPanther(memory)

    panther.execute()
    startGame(memory)
    panther.execute()
    memory[ADDR.playing] = 0 // F7 pause clears the playing flag
    setScore(memory, 500)
    panther.execute()

    expect(panther.isGameOver).toBe(false)
    expect(panther.score).toBe(500)
  })

  test('submits the score once when the last life is lost', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = loadingMemory()
    const panther = createPanther(memory, { postScore })
    const gameOver = listen(panther, 'gameOver')

    panther.execute()
    startGame(memory)
    panther.execute()
    setScore(memory, 2100)
    memory[ADDR.lives] = 1
    panther.execute()
    endGame(memory)
    panther.execute()
    panther.execute()

    expect(panther.lives).toBe(0)
    expect(gameOver).toHaveBeenCalledTimes(1)
    expect(gameOver).toHaveBeenCalledWith({ score: 2100, highScore: 2100 })
    expect(postScore).toHaveBeenCalledTimes(1)
    expect(postScore).toHaveBeenCalledWith('panther-game', 2100, 'user1', 'player1')
  })

  test('only reports a high score when the run beats the previous one', () => {
    const memory = loadingMemory()
    const panther = createPanther(memory)
    const gameOver = listen(panther, 'gameOver')

    panther.execute()
    startGame(memory)
    panther.execute()
    setScore(memory, 2100)
    panther.execute()
    endGame(memory)
    panther.execute()

    startGame(memory)
    panther.execute()
    setScore(memory, 500)
    panther.execute()
    endGame(memory)
    panther.execute()

    expect(gameOver).toHaveBeenLastCalledWith({ score: 500, highScore: 0 })
  })

  test('starts a second game when fire is pressed on the game over screen', () => {
    const memory = loadingMemory()
    const panther = createPanther(memory)
    const newGame = listen(panther, 'newGame')

    panther.execute()
    startGame(memory)
    panther.execute()
    setScore(memory, 300)
    panther.execute()
    endGame(memory)
    panther.execute()
    panther.execute()
    startGame(memory)
    panther.execute()

    expect(newGame).toHaveBeenCalledTimes(2)
    expect(panther.isGameOver).toBe(false)
    expect(panther.score).toBe(0)
  })

  test('treats an F1 restart as a new run without submitting the score', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = loadingMemory()
    const panther = createPanther(memory, { postScore })
    const newGame = listen(panther, 'newGame')
    const gameOver = listen(panther, 'gameOver')

    panther.execute()
    startGame(memory)
    panther.execute()
    setScore(memory, 1500)
    memory[ADDR.lives] = 3
    panther.execute()
    startGame(memory) // F1 jumps straight back to the new game setup
    panther.execute()

    expect(newGame).toHaveBeenCalledTimes(2)
    expect(gameOver).not.toHaveBeenCalled()
    expect(postScore).not.toHaveBeenCalled()
    expect(panther.score).toBe(0)
    expect(panther.lives).toBe(6)
  })
})
