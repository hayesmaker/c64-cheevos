import signal from 'signal-js'
import { camelize, convertMemToScoreDigits } from '../helpers/string-utils.js'

// Addresses from the Thrust (Firebird, 1986) disassembly:
// https://github.com/hayesmaker/thrust-c64 (src/thrust.asm)
const MEM_SCORE_1 = 0x0180      // score_A: low 2 digits, BCD (displayed with a trailing 0)
const MEM_SCORE_2 = 0x0181      // score_B: mid 2 digits, BCD
const MEM_SCORE_3 = 0x0182      // score_C: high 2 digits, BCD
const MEM_LIVES = 0x9403        // lives: spare lives in BCD; wraps to $99 when the last life is lost
const MEM_FUEL_EMPTY = 0x9402   // fuel_empty_flag: non-zero when out of fuel (ends the game)
const MEM_DEMO_MODE = 0x0063    // demo_mode_flag: 0 = real game, $FF = title / high scores / demo

const START_LIVES = 3           // INITIAL_LIVES (4) minus the one taken by start_new_game

class Thrust {
  static ultimate = {
    pollIntervalMs: 250,
    memoryRanges: [
      { address: MEM_DEMO_MODE, length: 1, label: 'Demo mode' },
      { address: MEM_SCORE_1, length: 3, label: 'Score' },
      { address: MEM_FUEL_EMPTY, length: 2, label: 'Fuel empty and lives' }
    ]
  }

  static get ultimateMemoryRanges() {
    return this.ultimate.memoryRanges
  }

  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    this.name = 'Thrust'
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

  // The status bar prints a fixed '0' after the 6 BCD digits, so the score
  // shown on screen is the stored value x 10 (a gun is stored as $75 = 750).
  getScore() {
    const score3 = convertMemToScoreDigits(MEM_SCORE_3, this)
    const score2 = convertMemToScoreDigits(MEM_SCORE_2, this)
    const score1 = convertMemToScoreDigits(MEM_SCORE_1, this)
    return parseInt(score3 + score2 + score1, 10) * 10
  }

  // Raw BCD lives byte; bit 7 is set ($99) once the last life has been lost.
  getLivesByte() {
    return this.cpuReadNS(MEM_LIVES)
  }

  getLives() {
    const lives = this.getLivesByte()
    return lives & 0x80 ? 0 : parseInt(lives.toString(16), 10)
  }

  getIsDemoMode() {
    return this.cpuReadNS(MEM_DEMO_MODE) !== 0
  }

  getIsOutOfFuel() {
    return this.cpuReadNS(MEM_FUEL_EMPTY) !== 0
  }

  // start_new_game zeroes the score, then sets lives, then clears the fuel
  // flag, so all three together mean a fresh game (not a game-over screen).
  newGameCheck() {
    return this.isGameOver &&
      !this.getIsDemoMode() &&
      this.getLivesByte() === START_LIVES &&
      !this.getIsOutOfFuel() &&
      this.getScore() === 0
  }

  // A game ends by losing the last life, running out of fuel, or quitting
  // back to the title screen with RUN/STOP (demo mode flag set again).
  gameOverCheck() {
    return !this.isGameOver && (
      (this.getLivesByte() & 0x80) !== 0 ||
      this.getIsOutOfFuel() ||
      this.getIsDemoMode()
    )
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
    if (!this.getIsDemoMode() && currentScore !== this.score) {
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

export default Thrust
