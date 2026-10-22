import signal from 'signal-js'
import { camelize } from '../helpers/string-utils.js'

// Addresses from a disassembly of Panther (Mastertronic, 1986) running from the
// StatMat Magic Desk cartridge conversion, checked against c64debugger memory
// dumps (docs/panther). The cartridge loads the tape game into RAM and runs it
// from $1000, so everything here is plain RAM.
const MEM_LIVES = 0x0010        // lives, plain binary: 6 at the start, 0 = game over
const MEM_PLAYING = 0x0026      // 1 while the main game loop runs, 0 while loading and on game over
const MEM_GAME_OVER = 0x0027    // set to 1 when the last life is lost, cleared when fire starts a new game
const MEM_SCORE = 0x842a        // 8 bytes, one decimal digit (0-9) per byte, most significant first
const SCORE_DIGITS = 8

const START_LIVES = 6

class Panther {
  static ultimate = {
    pollIntervalMs: 250,
    memoryRanges: [
      { address: MEM_LIVES, length: 1, label: 'Lives' },
      { address: MEM_PLAYING, length: 2, label: 'Playing / game over flags' },
      { address: MEM_SCORE, length: SCORE_DIGITS, label: 'Score' }
    ]
  }

  static get ultimateMemoryRanges() {
    return this.ultimate.memoryRanges
  }

  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    this.name = 'Panther'
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

  getIsPlaying() {
    return this.cpuReadNS(MEM_PLAYING) === 1
  }

  getIsGameOverFlag() {
    return this.cpuReadNS(MEM_GAME_OVER) !== 0
  }

  // There is no demo mode: the game starts as soon as the cartridge has loaded,
  // and fire on the game over screen starts the next one. While loading, lives
  // are 0 and the score bytes hold junk. A run starts with 6 lives, but an idle
  // ship can crash within a couple of seconds, so allow any life count.
  newGameCheck() {
    const lives = this.getLives()
    return this.isGameOver &&
      this.getIsPlaying() &&
      !this.getIsGameOverFlag() &&
      lives > 0 && lives <= START_LIVES &&
      this.getScore() === 0
  }

  // F1 or RESTORE restarts the game mid-run without going through game over (the game
  // doesn't record the high score either). The score never goes down within
  // a run, so a drop means the run was abandoned.
  restartCheck(currentScore, currentLives) {
    return !this.isGameOver &&
      (currentScore < this.score ||
        (currentScore === 0 && currentLives === START_LIVES && this.lives < START_LIVES))
  }

  // Losing the last life decrements lives to 0 and sets the game over flag.
  gameOverCheck() {
    return !this.isGameOver && (this.getLives() === 0 || this.getIsGameOverFlag())
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
    const currentLives = this.getLives()
    if (this.restartCheck(currentScore, currentLives)) {
      console.log(`${this.name}::Restarted`, this.score)
      this.newGameVars()
      this.watcher.dispatch('newGame', {})
      this.watcher.dispatch('livesChange', { lives: this.lives })
      return
    }

    if (currentScore !== this.score) {
      this.score = currentScore
    }

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

export default Panther
