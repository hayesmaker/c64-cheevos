import { describe, expect, test, vi } from 'vitest'

import RainbowIslands from '../src/cheevos/RainbowIslands.js'

const ADDR = {
  score1: 0x115b,
  score2: 0x115c,
  score3: 0x115d,
  score4: 0x115e,
  lives: 0x1160,
  island: 0x1165,
  round: 0x1166,
  activePowerUp: 0x004e,
  permPowerUp: 0x004f,
  islandFlag: 0x00a8,
  coinOpFlag: 0x0a34,
  roundEndFlag: 0x0026
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

const isPolledByUltimate = (addr) => {
  return RainbowIslands.ultimateMemoryRanges.some((range) => {
    return addr >= range.address && addr < range.address + range.length
  })
}

describe('Rainbow Islands', () => {
  test('Ultimate polling covers all cheevo-related memory addresses', () => {
    [
      0x0026,
      0x004e,
      0x004f,
      0x00a8,
      0x00ad,
      0x00ae,
      0x06f8,
      0x06f9,
      0x0a34,
      0x115b,
      0x115c,
      0x115d,
      0x115e,
      0x1160,
      0x1165,
      0x1166,
      0x18b3
    ].forEach((addr) => {
      expect(isPolledByUltimate(addr), `0x${addr.toString(16)}`).toBe(true)
    })
  })

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

  test('submits cached score when game reaches completion screen', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.score1]: 0x00,
      [ADDR.score2]: 0x01,
      [ADDR.score3]: 0x80,
      [ADDR.score4]: 0x60,
      [ADDR.lives]: 0x01,
      [ADDR.island]: 0x06,
      [ADDR.round]: 0x1b
    }
    const cheevos = createRainbowIslands(memory, { postScore })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.execute()
    memory[ADDR.score1] = 0x9e
    memory[ADDR.score2] = 0x14
    memory[ADDR.score3] = 0xbd
    memory[ADDR.score4] = 0xa1
    memory[ADDR.lives] = 0x49
    memory[ADDR.island] = 0xa1
    memory[ADDR.round] = 0x14
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

  test('pops Rainbow Veteran when two permanent powerups are collected', () => {
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: {
        title: 'Rainbow Veteran',
        description: 'Collect 2 Permanent uprades in a single playthrough'
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
          _id: 'rainbow-veteran',
          title: 'Rainbow Veteran',
          description: 'Collect 2 Permanent uprades in a single playthrough'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', 'rainbow-veteran')
  })

  test('pops Rainbow Elite when Shilver Door makes three permanent pickups', () => {
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: {
        title: 'Rainbow Elite',
        description: 'Collect 3 permanent upgrades in a single playthrough'
      }
    })
    const memory = {
      [ADDR.permPowerUp]: 0x41,
      [ADDR.round]: 19,
      [ADDR.islandFlag]: 5
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'rainbow-elite',
          title: 'Rainbow Elite',
          description: 'Collect 3 permanent upgrades in a single playthrough'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', 'rainbow-elite')
  })

  test('pops Rainbow Ultimate Master when final coin makes four permanent pickups', () => {
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: {
        title: 'Rainbow Ultimate Master',
        description: 'Collect 4 Permanent upgrades in a single playthrough'
      }
    })
    const memory = {
      [ADDR.permPowerUp]: 0x41,
      [ADDR.round]: 19,
      [ADDR.islandFlag]: 5,
      [ADDR.coinOpFlag]: 0x3d,
      [ADDR.roundEndFlag]: 0x1a
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'rainbow-ultimate',
          title: 'Rainbow Ultimate Master',
          description: 'Collect 4 Permanent upgrades in a single playthrough'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.execute()
    memory[ADDR.coinOpFlag] = 0
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', 'rainbow-ultimate')
  })

  test('pops Wings of Death when lives decrease with active wings', () => {
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: {
        title: 'Wings of Death',
        description: 'Die while using the wings power up'
      }
    })
    const memory = {
      [ADDR.lives]: 1,
      [ADDR.activePowerUp]: 0x80
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'wings-of-death',
          title: 'Wings of Death',
          description: 'Die while using the wings power up'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.lives = 2
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', 'wings-of-death')
  })

  test('pops Wings of Death when lives decrease with permanent wings', () => {
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: {
        title: 'Wings of Death',
        description: 'Die while using the wings power up'
      }
    })
    const memory = {
      [ADDR.lives]: 1,
      [ADDR.permPowerUp]: 0x80
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'wings-of-death',
          title: 'Wings of Death',
          description: 'Die while using the wings power up'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.lives = 2
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', 'wings-of-death')
  })

  test('pops Wings of Death when wings clear on the death poll', () => {
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: {
        title: 'Wings of Death',
        description: 'Die while using the wings power up'
      }
    })
    const memory = {
      [ADDR.lives]: 2,
      [ADDR.activePowerUp]: 0x80
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'wings-of-death',
          title: 'Wings of Death',
          description: 'Die while using the wings power up'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.lives = 2
    cheevos.execute()
    memory[ADDR.lives] = 1
    memory[ADDR.activePowerUp] = 0
    cheevos.execute()

    expect(popCheevo).toHaveBeenCalledWith('set1', 'user1', 'wings-of-death')
  })

  test('does not pop Wings of Death when dying without wings', () => {
    const popCheevo = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.lives]: 1
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'wings-of-death',
          title: 'Wings of Death',
          description: 'Die while using the wings power up'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.lives = 2
    cheevos.execute()

    expect(popCheevo).not.toHaveBeenCalled()
  })

  test('does not pop Wings of Death without a life loss', () => {
    const popCheevo = vi.fn().mockResolvedValue({})
    const memory = {
      [ADDR.lives]: 2,
      [ADDR.activePowerUp]: 0x80
    }
    const cheevos = createRainbowIslands(memory, {
      popCheevo,
      cheevosSet: {
        _id: 'set1',
        cheevos: [{
          _id: 'wings-of-death',
          title: 'Wings of Death',
          description: 'Die while using the wings power up'
        }]
      }
    })

    cheevos.isGameOver = false
    cheevos.isGameInProgress = true
    cheevos.lives = 2
    cheevos.execute()

    expect(popCheevo).not.toHaveBeenCalled()
  })
})
