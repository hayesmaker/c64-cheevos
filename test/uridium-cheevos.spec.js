import { describe, expect, test, vi } from 'vitest'

import Uridium from '../src/cheevos/Uridium.js';

describe('Uridium Cheevos', () => {

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
    uridium.cpuReadNS = vi.fn((addr) => {
      if (addr === 0x0026) return 1; // MEM_LEVEL
      if (addr === 0x0096) return 23; // MEM_LEVEL_STATE
      return 0;
    });

    uridium.execute();
    expect(popCheevo).toHaveBeenCalledWith(cheevosSet._id, user.id, cheevosSet.cheevos[0]._id);

  });


});
