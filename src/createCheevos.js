import CheevoTemplate from './cheevos/CheevoTemplate.js'
import { cheevosRegistry } from './registry.js'

const normaliseDetectorId = (detectorId) => detectorId?.trim?.().toLowerCase()

export async function createCheevos(detectorId, options = {}) {
  const loadCheevos = cheevosRegistry[normaliseDetectorId(detectorId)]

  if (!loadCheevos) {
    return new CheevoTemplate(options)
  }

  const { default: CheevosClass } = await loadCheevos()
  return new CheevosClass(options)
}
