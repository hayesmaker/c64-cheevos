import CheevoTemplate from './cheevos/CheevoTemplate.js'
import { cheevosRegistry } from './registry.js'

const normaliseDetectorId = (detectorId) => String(detectorId ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export async function createCheevos(detectorId, options = {}) {
  const loadCheevos = cheevosRegistry[normaliseDetectorId(detectorId)]

  if (!loadCheevos) {
    return new CheevoTemplate(options)
  }

  const { default: CheevosClass } = await loadCheevos()
  return new CheevosClass(options)
}
