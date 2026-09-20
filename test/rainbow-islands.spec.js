import { describe, expect, test, vi } from 'vitest'

import RainbowIslands from '../src/cheevos/RainbowIslands.js'

const ADDR = {
  score1: 0x115b,
  score2: 0x115c,
  score3: 0x115d,
  score4: 0x115e,
  lives: 0x1160,
  permPowerUp: 0x004f
}

const createRainbowIslands = (memory = {}, overrides = {}) => {
  const cheevos = new RainbowIslands({
    gameId: 'rainbow-islands-game',
    user: { id: 'user1', username: 'player1' },
    cheevosSet: { _id: 'set1', cheevos: [] },
    poppedCheevos: [],
    ...overrides
  })

  cheevos.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)
  return cheevos
}

describe('Rainbow Islands', () => {
  test('submits score when lives switch to game over after game start', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.score1]: 0x00,
      [ADDR.score2]: 0x01,
      [ADDR.score3]: 0x80,
      [ADDR.score4]: 0x60,
      [ADDR.lives]: 0x01
    }
    const cheevos = createRainbowIslands(memory, { postScore })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.execute()
    memory[ADDR.lives] = 0xff
    cheevos.execute()

    expect(postScore).toHaveBeenCalledWith(
      'rainbow-islands-game',
      18060,
      'user1',
      'player1'
    )
  })

  test('pops Red Potion Mastery when permanent double rainbows are unlocked', () => {
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: {
        title: 'Red Potion Mastery',
        description: 'Collect the secret red potion for permanent double rainbows upgrade'
      }
    })
    const memory = {
      [ADDR.permPowerUp]: 0x01
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'red-potion-mastery',
          title: 'Red Potion Mastery',
          description: 'Collect the secret red potion for permanent double rainbows upgrade'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', 'red-potion-mastery')
  })

  test('pops Red Potion Mastery when double rainbows are combined with another permanent upgrade', () => {
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: {
        title: 'Red Potion Mastery',
        description: 'Collect the secret red potion for permanent double rainbows upgrade'
      }
    })
    const memory = {
      [ADDR.permPowerUp]: 0x41
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'red-potion-mastery',
          title: 'Red Potion Mastery',
          description: 'Collect the secret red potion for permanent double rainbows upgrade'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', 'red-potion-mastery')
  })

  test('does not pop Red Potion Mastery without permanent double rainbows', () => {
    const popCheevo = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.permPowerUp]: 0x04
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'red-potion-mastery',
          title: 'Red Potion Mastery',
          description: 'Collect the secret red potion for permanent double rainbows upgrade'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.execute()

    expect(popCheevo).not.toHaveBeenCalled()
  })

  test('does not pop Red Potion Mastery for permanent boots and fast rainbows without double rainbows', () => {
    const popCheevo = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.permPowerUp]: 0x44
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'red-potion-mastery',
          title: 'Red Potion Mastery',
          description: 'Collect the secret red potion for permanent double rainbows upgrade'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.execute()

    expect(popCheevo).not.toHaveBeenCalled()
  })

  test('pops Yellow Potion Mastery when permanent fast rainbows are unlocked', () => {
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: {
        title: 'Yellow Potion Mastery',
        description: 'Collect the secret yellow potion for permanent fast rainbows upgrade'
      }
    })
    const memory = {
      [ADDR.permPowerUp]: 0x04
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'yellow-potion-mastery',
          title: 'Yellow Potion Mastery',
          description: 'Collect the secret yellow potion for permanent fast rainbows upgrade'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', 'yellow-potion-mastery')
  })

  test('pops Yellow Potion Mastery when fast rainbows are combined with other permanent upgrades', () => {
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: {
        title: 'Yellow Potion Mastery',
        description: 'Collect the secret yellow potion for permanent fast rainbows upgrade'
      }
    })
    const memory = {
      [ADDR.permPowerUp]: 0x45
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'yellow-potion-mastery',
          title: 'Yellow Potion Mastery',
          description: 'Collect the secret yellow potion for permanent fast rainbows upgrade'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', 'yellow-potion-mastery')
  })

  test('does not pop Yellow Potion Mastery without permanent fast rainbows', () => {
    const popCheevo = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.permPowerUp]: 0x01
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'yellow-potion-mastery',
          title: 'Yellow Potion Mastery',
          description: 'Collect the secret yellow potion for permanent fast rainbows upgrade'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.execute()

    expect(popCheevo).not.toHaveBeenCalled()
  })
})
