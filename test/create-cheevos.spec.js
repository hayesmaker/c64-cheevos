import { describe, expect, test } from 'vitest'

import { CheevoTemplate, Uridium, createCheevos } from '../src/index.js'

describe('createCheevos', () => {
  test('loads a registered cheevos class by detector id', async () => {
    const cheevos = await createCheevos('uridium', {
      gameId: 'game1',
      user: { id: 'user1', username: 'player1' },
      cheevosSet: { _id: 'set1', cheevos: [] }
    })

    expect(cheevos).toBeInstanceOf(Uridium)
  })

  test('falls back to generic template for unknown detector id', async () => {
    const cheevos = await createCheevos('unknown-game', {
      gameId: 'game1',
      user: { id: 'user1', username: 'player1' },
      cheevosSet: { _id: 'set1', cheevos: [] }
    })

    expect(cheevos).toBeInstanceOf(CheevoTemplate)
  })
})
