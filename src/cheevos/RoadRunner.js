import signal from 'signal-js'
import { camelize } from '../helpers/string-utils.js'

// Addresses from a disassembly of the Road Runner (US Gold, 1987) EasyFlash
// conversion, checked against c64debugger memory dumps (docs/road-runner).
const MEM_SCORE = 0x006b        // 8 bytes, one decimal digit (0-9) per byte, most significant first
const SCORE_DIGITS = 8
const MEM_LIVES = 0x00b5        // lives left, plain binary: 5 at the start, 0 = game over
const MEM_SCREEN_OFF = 0x00eb   // 0 while the play screen raster split is running, $FF on title / game over
const MEM_DEMO_MODE = 0x8096    // non-zero while the attract sequence can still run a demo; fire clears it

const START_LIVES = 5

class RoadRunner {
  static ultimate = {
    pollIntervalMs: 250,
    memoryRanges: [
      { address: MEM_SCORE, length: SCORE_DIGITS, label: 'Score' },
      { address: MEM_LIVES, length: 1, label: 'Lives' },
      { address: MEM_SCREEN_OFF, length: 1, label: 'Play screen off' },
      { address: MEM_DEMO_MODE, length: 1, label: 'Demo mode' }
    ]
  }

  static get ultimateMemoryRanges() {
    return this.ultimate.memoryRanges
  }

  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    this.name = 'Road Runner'
    console.log(`${this.name}::Loaded`, gameId)
    this._popCheevo = popCheevo
    this.postScore = postScore
    this.user = user
    this.gameId = gameId
    this.watcher = signal()
    this.cheevosSet = cheevosSet
    this.cheevosMap = this.buildCheevosMap(cheevosSet.cheevos, poppedCheevos)
    this.resetGameVars()
  }

  resetGameVars() {
    this.score = 0
    this.highScore = 0
    this.lives = 0
    this.isGameOver = true
  }

  newGameVars() {
    this.isGameOver = false
    this.score = this.getScore()
    this.lives = this.getLives()
    console.log(`${this.name}::Start New Game`, this.score, this.lives)
  }

  getScore() {
    let score = 0
    for (let i = 0; i < SCORE_DIGITS; i++) {
      score = score * 10 + this.cpuReadNS(MEM_SCORE + i)
    }
    return score
  }

  getLives() {
    return this.cpuReadNS(MEM_LIVES)
  }

  getIsPlayScreen() {
    return this.cpuReadNS(MEM_SCREEN_OFF) === 0
  }

  getIsDemoMode() {
    return this.cpuReadNS(MEM_DEMO_MODE) !== 0
  }

  // The title screen also holds 5 lives and a zero score, so wait for the
  // play screen to come up before counting it as a new game.
  newGameCheck() {
    return this.isGameOver &&
      !this.getIsDemoMode() &&
      this.getIsPlayScreen() &&
      this.getLives() === START_LIVES &&
      this.getScore() === 0
  }

  // Losing a life decrements lives and jumps to the game-over screen at 0.
  gameOverCheck() {
    return !this.isGameOver && this.getLives() === 0
  }

  execute() {
    if (this.newGameCheck()) {
      this.newGameVars()
      this.watcher.dispatch('newGame', {})
    }

    if (this.isGameOver) {
      return
    }

    const currentScore = this.getScore()
    if (currentScore !== this.score) {
      this.score = currentScore
    }

    const currentLives = this.getLives()
    if (currentLives !== this.lives) {
      this.lives = currentLives
      this.watcher.dispatch('livesChange', { lives: this.lives })
    }

    if (this.gameOverCheck()) {
      this.isGameOver = true
      const newHighScore = this.score > this.highScore ? this.score : 0
      if (newHighScore) {
        this.highScore = this.score
      }

      this.watcher.dispatch('gameOver', {
        score: this.score,
        highScore: newHighScore
      })

      const score = this.score
      this.postScore(this.gameId, score, this.user.id, this.user.username).then(() => {
        this.watcher.dispatch('cheevo', {
          title: 'Score Submit Success',
          message: `Your score of ${score} has been submitted to the ${this.name} Leaderboard!`
        })
      })
    }

    this.checkCheevos()
  }

  buildCheevosMap(cheevos, poppedCheevos) {
    return cheevos.map((c) => {
      const hasPopped = poppedCheevos.some((p) => p.achievement._id === c._id)
      let checkFn = () => false

      // No achievements yet: add cases here keyed by camelize(title).
      switch (camelize(c.title)) {
      }

      return {
        title: c.title,
        message: c.description,
        isPopped: hasPopped,
        check: checkFn,
        cheevoId: c._id
      }
    })
  }

  checkCheevos() {
    this.cheevosMap.forEach((c) => {
      if (!c.isPopped && c.check()) {
        c.isPopped = true
        this.popCheevo(c.cheevoId)
      }
    })
  }

  async popCheevo(cId) {
    const res = await this._popCheevo(this.cheevosSet._id, this.user.id, cId)
    this.watcher.dispatch('cheevo', {
      title: res.achievement.title,
      message: res.achievement.description,
      thumbnailUrl: res.thumbnailUrl
    })
  }
}

export default RoadRunner
