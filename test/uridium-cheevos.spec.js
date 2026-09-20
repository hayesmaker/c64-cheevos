import { describe, expect, test, vi } from 'vitest'

import Uridium from '../src/cheevos/Uridium.js';

const createUridium = (memory = {}, overrides = {}) => {
  const uridium = new Uridium({
    gameId: 'uridium-game',
    user: { id: 'user1', username: 'player1' },
    cheevosSet: { _id: 'set1', cheevos: [] },
    poppedCheevos: [],
    ...overrides
  })

  uridium.cpuReadNS = vi.fn((addr) => memory[addr] ?? 0)
  return uridium
}

describe('Uridium Cheevos', () => {
  test('defines compact Ultimate memory polling ranges', () => {
    expect(Uridium.ultimate.pollIntervalMs).toBe(1000)
    expect(Uridium.ultimateMemoryRanges).toEqual([
      { address: 0x0025, length: 2, label: 'Lives and level' },
      { address: 0x0087, length: 1, label: 'Formations' },
      { address: 0x0096, length: 2, label: 'Level state' },
      { address: 0x00a9, length: 1, label: 'Destruct sequence' },
      { address: 0x4853, length: 6, label: 'Score' }
    ])
  })

  test('zinc cheevo pops given level one is completed', () => {
    const cheevosSet = {
      _id: 123,
      cheevos: [
        {
          _id: 'zinc',
          title: 'Zinc'
        }
      ]
    };
    const poppedCheevos = [];
    const user = { _id: 'user1', id: '007' };
    const gameId = 'game1';
    const popCheevo = vi.fn().mockResolvedValue({
      achievement: {
        title: 'zinc',
        description: 'Level 1 completed',
      },
      thumbnailUrl: 'fake.image.url/zinc.png',
    });
    const uridium = new Uridium({ gameId, user, cheevosSet, poppedCheevos, popCheevo });
    //return the expected memory state for level 1 completion
    uridium.cpuReadNS = vi.fn((addr) => {
      if (addr === 0x0026) return 1; // MEM_LEVEL
      if (addr === 0x0096) return 23; // MEM_LEVEL_STATE
      return 0;
    });

    uridium.execute();
    expect(popCheevo).toHaveBeenCalledWith(cheevosSet._id, user.id, cheevosSet.cheevos[0]._id);

  });

  test('dispatches newGame when lives become positive from zero', () => {
    const memory = {
      0x0025: 0,
      0x4853: 0x30,
      0x4854: 0x30,
      0x4855: 0x30,
      0x4856: 0x30,
      0x4857: 0x30,
      0x4858: 0x30
    }
    const uridium = createUridium(memory)
    const onNewGame = vi.fn()
    uridium.watcher.on('newGame', onNewGame)

    memory[0x0025] = 3
    uridium.execute()

    expect(onNewGame).toHaveBeenCalledWith({ gameMode: 0 })
  })

  test('submits score once when lives reach zero', () => {
    const postScore = vi.fn().mockResolvedValue({})
    const memory = {
      0x0025: 1,
      0x4853: 1,
      0x4854: 2,
      0x4855: 3,
      0x4856: 4,
      0x4857: 5,
      0x4858: 6
    }
    const uridium = createUridium(memory, { postScore })
    uridium.lives = 1

    memory[0x0025] = 0
    uridium.execute()
    uridium.execute()

    expect(postScore).toHaveBeenCalledTimes(1)
    expect(postScore).toHaveBeenCalledWith('uridium-game', 123456, 'user1', 'player1')
  })


});
