import { describe, expect, test } from 'vitest'

import { cheevosRegistry } from '../src/registry.js'

const constructorOptions = {
  gameId: 'game1',
  user: { id: 'user1', username: 'player1' },
  cheevosSet: { _id: 'set1', cheevos: [] },
  poppedCheevos: []
}

const detectorSource = (detector) => {
  const prototype = Object.getPrototypeOf(detector)
  const prototypeFns = Object.getOwnPropertyNames(prototype)
    .filter((name) => name !== 'constructor' && typeof prototype[name] === 'function')
    .map((name) => Function.prototype.toString.call(prototype[name]))
  const instanceFns = Object.keys(detector)
    .filter((name) => typeof detector[name] === 'function')
    .map((name) => Function.prototype.toString.call(detector[name]))

  return [...prototypeFns, ...instanceFns].join('\n')
}

describe('Ultimate support', () => {
  test('all registered games define Ultimate memory polling ranges', async () => {
    for (const [detectorId, loadCheevos] of Object.entries(cheevosRegistry)) {
      const { default: CheevosClass } = await loadCheevos()

      expect(CheevosClass.ultimate?.pollIntervalMs, detectorId).toEqual(expect.any(Number))
      expect(CheevosClass.ultimate.pollIntervalMs, detectorId).toBeGreaterThan(0)
      expect(CheevosClass.ultimateMemoryRanges, detectorId).toEqual(expect.any(Array))
      expect(CheevosClass.ultimateMemoryRanges.length, detectorId).toBeGreaterThan(0)
    }
  })

  test('all registered games expose a newGame watcher path', async () => {
    for (const [detectorId, loadCheevos] of Object.entries(cheevosRegistry)) {
      const { default: CheevosClass } = await loadCheevos()
      const detector = new CheevosClass(constructorOptions)

      expect(detectorSource(detector), detectorId).toContain("watcher.dispatch('newGame'")
    }
  })
})
