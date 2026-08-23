import { describe, expect, test, vi } from 'vitest'

import ForbiddenForest from '../src/cheevos/ForbiddenForest.js'

const ADDR = {
  currentKills: 0x0041,
  currentEnemyType: 0x004e,
  gameStartState: 0x0055,
  waveBaseline: 0x005e,
  lives: 0x005f,
  difficulty: 0x0069
}

const DIFFICULTY = {
  innocent: 0x04,
  trooper: 0x08,
  daredevil: 0x0c,
  crazy: 0x10
}

const ENEMY = {
  spiders: 1,
  bees: 2,
  frogs: 4,
  dragons: 8,
  phantom: 16,
  snake: 32,
  demogorgon: 40
}

const createCheevo = (title) => ({
  _id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  title,
  description: `${title} description`
})

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

const createAchievementTest = (title, memory) => {
  const achievement = createCheevo(title)
  const popCheevo = vi.fn().mockResolvedValue({ achievement })
  const cheevos = createForbiddenForest(memory, {
    cheevosSet: { _id: 'set1', cheevos: [achievement] },
    popCheevo
  })

  return { achievement, cheevos, popCheevo }
}

const createActiveGameMemory = ({ enemy, difficulty = DIFFICULTY.trooper, lives = 3 } = {}) => ({
  [ADDR.currentKills]: 0,
  [ADDR.currentEnemyType]: enemy,
  [ADDR.gameStartState]: 1,
  [ADDR.waveBaseline]: 0,
  [ADDR.lives]: lives,
  [ADDR.difficulty]: difficulty
})

const expectAchievementPopsOnTransition = ({ title, fromEnemy, toEnemy, difficulty = DIFFICULTY.trooper }) => {
  const memory = createActiveGameMemory({ enemy: fromEnemy, difficulty })
  const { achievement, cheevos, popCheevo } = createAchievementTest(title, memory)

  cheevos.execute()
  memory[ADDR.currentEnemyType] = toEnemy
  cheevos.execute()

  expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', achievement._id)
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
      'player1'
    )
  })

  test.each([
    ['Arachnophobia', ENEMY.spiders, ENEMY.bees],
    ['Bee Urself', ENEMY.bees, ENEMY.frogs],
    ['Frogger Not Like This', ENEMY.frogs, ENEMY.dragons],
    ['Dragonbreed', ENEMY.dragons, ENEMY.phantom],
    ['Fantmas', ENEMY.phantom, ENEMY.snake],
    ['Why Did It Have To Be Snakes', ENEMY.snake, ENEMY.demogorgon]
  ])('pops %s on the matching enemy transition', (title, fromEnemy, toEnemy) => {
    expectAchievementPopsOnTransition({ title, fromEnemy, toEnemy })
  })

  test('does not pop wave achievements on Innocent mode', () => {
    const memory = createActiveGameMemory({ enemy: ENEMY.spiders, difficulty: DIFFICULTY.innocent })
    const { cheevos, popCheevo } = createAchievementTest('Arachnophobia', memory)

    cheevos.execute()
    memory[ADDR.currentEnemyType] = ENEMY.bees
    cheevos.execute()

    expect(popCheevo).not.toHaveBeenCalled()
  })

  test('does not pop wave achievements when out of lives', () => {
    const memory = createActiveGameMemory({ enemy: ENEMY.spiders })
    const { cheevos, popCheevo } = createAchievementTest('Arachnophobia', memory)

    cheevos.execute()
    memory[ADDR.currentEnemyType] = ENEMY.bees
    memory[ADDR.lives] = 0
    cheevos.execute()

    expect(popCheevo).not.toHaveBeenCalled()
  })

  test('does not pop wave achievements from a static next-wave memory state', () => {
    const memory = createActiveGameMemory({ enemy: ENEMY.bees })
    const { cheevos, popCheevo } = createAchievementTest('Arachnophobia', memory)

    cheevos.execute()
    cheevos.execute()

    expect(popCheevo).not.toHaveBeenCalled()
  })

  test('pops demogorgonParty on Trooper Demogorgon to Spider transition', () => {
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: { title: 'Demogorgon Party', description: 'Defeated Demogorgon' }
    })
    const memory = {
      [ADDR.currentKills]: 0x14,
      [ADDR.currentEnemyType]: ENEMY.demogorgon,
      [ADDR.gameStartState]: 1,
      [ADDR.waveBaseline]: 0x14,
      [ADDR.lives]: 3,
      [ADDR.difficulty]: DIFFICULTY.trooper
    }
    const cheevos = createForbiddenForest(memory, {
      cheevosSet: {
        _id: 'set1',
        cheevos: [{ _id: 'demogorgon-party', title: 'Demogorgon Party', description: 'Defeated Demogorgon' }]
      },
      popCheevo
    })

    cheevos.execute()
    memory[ADDR.currentKills] = 0x00
    memory[ADDR.currentEnemyType] = ENEMY.spiders
    memory[ADDR.waveBaseline] = 0x16
    memory[ADDR.difficulty] = DIFFICULTY.daredevil
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', 'demogorgon-party')
  })

  test('pops demogorgonParty when Crazy wraps back to Innocent', () => {
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: { title: 'Demogorgon Party', description: 'Defeated Demogorgon' }
    })
    const memory = {
      [ADDR.currentKills]: 0x14,
      [ADDR.currentEnemyType]: ENEMY.demogorgon,
      [ADDR.gameStartState]: 1,
      [ADDR.waveBaseline]: 0x14,
      [ADDR.lives]: 3,
      [ADDR.difficulty]: DIFFICULTY.crazy
    }
    const cheevos = createForbiddenForest(memory, {
      cheevosSet: {
        _id: 'set1',
        cheevos: [{ _id: 'demogorgon-party', title: 'Demogorgon Party', description: 'Defeated Demogorgon' }]
      },
      popCheevo
    })

    cheevos.execute()
    memory[ADDR.currentKills] = 0x00
    memory[ADDR.currentEnemyType] = ENEMY.spiders
    memory[ADDR.waveBaseline] = 0x00
    memory[ADDR.difficulty] = DIFFICULTY.innocent
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', 'demogorgon-party')
  })

  test('does not pop demogorgonParty from a fresh Spider game state', () => {
    const memory = createActiveGameMemory({ enemy: ENEMY.spiders, difficulty: DIFFICULTY.trooper })
    const { cheevos, popCheevo } = createAchievementTest('Demogorgon Party', memory)

    cheevos.execute()
    cheevos.execute()

    expect(popCheevo).not.toHaveBeenCalled()
  })

  test('pops ultimateMaster when Crazy Demogorgon wraps to Innocent Spiders after starting on Innocent', () => {
    const memory = createActiveGameMemory({ enemy: ENEMY.spiders, difficulty: DIFFICULTY.innocent })
    const { achievement, cheevos, popCheevo } = createAchievementTest('Ultimate Master', memory)

    cheevos.execute()
    memory[ADDR.currentEnemyType] = ENEMY.demogorgon
    memory[ADDR.difficulty] = DIFFICULTY.crazy
    cheevos.execute()
    memory[ADDR.currentEnemyType] = ENEMY.spiders
    memory[ADDR.difficulty] = DIFFICULTY.innocent
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', achievement._id)
  })

  test('does not pop ultimateMaster when the run did not start on Innocent', () => {
    const memory = createActiveGameMemory({ enemy: ENEMY.demogorgon, difficulty: DIFFICULTY.crazy })
    const { cheevos, popCheevo } = createAchievementTest('Ultimate Master', memory)

    cheevos.execute()
    memory[ADDR.currentEnemyType] = ENEMY.spiders
    memory[ADDR.difficulty] = DIFFICULTY.innocent
    cheevos.execute()

    expect(popCheevo).not.toHaveBeenCalled()
  })
})
