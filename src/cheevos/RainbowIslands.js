import signal from 'signal-js'
import { camelize, convertMemToScoreDigits } from '../helpers/string-utils.js'

const MEM_SCORE_1 = 0x115b
const MEM_SCORE_2 = 0x115c
const MEM_SCORE_3 = 0x115d
const MEM_SCORE_4 = 0x115e
const MEM_LIVES = 0x1160
const ROUND_NUMBER = 0x1166
const GAME_OVER_LIVES = 0xff

class RainbowIslands {
  static ultimate = {
    pollIntervalMs: 1000,
    memoryRanges: [
      { address: MEM_SCORE_1, length: 4, label: 'Score' },
      { address: MEM_LIVES, length: 1, label: 'Lives' },
      { address: ROUND_NUMBER, length: 1, label: 'Round' }
    ]
  }

  static get ultimateMemoryRanges() {
    return this.ultimate.memoryRanges
  }

  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    this.name = 'Rainbow Islands'
    console.log(`${this.name}::Constructor`, gameId)
    this._popCheevo = popCheevo
    this.postScore = postScore
    this.user = user
    this.gameId = gameId
    this.watcher = signal()
    this.cheevosSet = cheevosSet
    this.cheevosMap = cheevosSet.cheevos.map((c) => {
      const hasPopped = poppedCheevos.some((p) => {
        return p.achievement._id === c._id
      })
      let checkFn
      switch (camelize(c.title)) {
        case 'score1000':
          checkFn = () => {
            return this.score >= 1000
          }
          break;
        case 'score2000':
          checkFn = () => {
            return this.score >= 2000
          }
          break;
        case 'score3000':
          checkFn = () => {
            return this.score >= 3000
          }
          break;
        case 'reachRound2':
          checkFn = () => {
            return this.roundNumber === 1;
          }
          break;
        default:

          break;
      }

      return {
        title: c.title,
        message: c.description,
        isPopped: hasPopped,
        check: checkFn || (() => false),
        cheevoId: c._id
      }
    })
    this.resetGameVars()
  }

  resetGameVars() {
    this.score = 0
    this.lives = GAME_OVER_LIVES
    this.isGameOver = true
    this.isGameInProgress = false
    this.scoreSubmitted = false
    this.roundNumber = 0;
  }

  newGameVars() {
    this.isGameOver = false
    this.isGameInProgress = true
    this.score = this.getScore()
    this.lives = this.getLives()
    this.scoreSubmitted = false
    this.roundNumber = 0;
    console.log('Started New Game', this.score, this.lives)
  }

  getScore() {
    const score1 = convertMemToScoreDigits(MEM_SCORE_1, this)
    const score2 = convertMemToScoreDigits(MEM_SCORE_2, this)
    const score3 = convertMemToScoreDigits(MEM_SCORE_3, this)
    const score4 = convertMemToScoreDigits(MEM_SCORE_4, this)
    return parseInt(score1 + score2 + score3 + score4, 10)
  }

  getRound() {
    return this.cpuReadNS(ROUND_NUMBER);
  }

  getLives() {
    return this.cpuReadNS(MEM_LIVES)
  }

  newGameCheck() {
    const lives = this.getLives()
    return this.isGameOver && lives > 0 && lives !== GAME_OVER_LIVES;
  }

  endGameCheck() {
    return this.isGameInProgress && this.getLives() === GAME_OVER_LIVES
  }

  execute() {
    if (this.newGameCheck()) {
      this.newGameVars()
      this.watcher.dispatch('newGame', {})
    }

    const currentScore = this.getScore()
    if (currentScore !== this.score) {
      this.score = currentScore
      console.log(`${this.name}.score=`, this.score)
    }

    const currentLives = this.getLives()
    if (currentLives !== this.lives) {
      this.lives = currentLives
      console.log(`${this.name}.lives=`, this.lives)
    }

    const currentRound = this.getRound()
    if (currentRound !== this.roundNumber) {
      this.roundNumber = currentRound;
    }

    if (this.endGameCheck()) {
      this.isGameOver = true
      this.isGameInProgress = false
      if (this.scoreSubmitted) return
      this.scoreSubmitted = true
      this.watcher.dispatch('gameOver', {
        score: this.score
      })
      this.postScore(
        this.gameId,
        this.score,
        this.user.id,
        this.user.username
      ).then(res => {
        console.log('Score posted successfully', res)

        this.watcher.dispatch('cheevo', {
          title: `Score Submit Success`,
          message: `Your score of ${this.score} has been submitted to the ${this.name} Leaderboard!`
        })
      })
    }

    this.cheevosMap.forEach(c => {
      if (!c.isPopped && c.check()) {
        c.isPopped = true
        console.log('Pop Cheevo::', c.title, c.message)
        this.popCheevo(c.cheevoId)
      }
    })
  }

  async popCheevo(cId) {
    const res = await this._popCheevo(this.cheevosSet._id, this.user.id, cId)
    console.log('res popCheevo', res)
    this.watcher.dispatch('cheevo', {
      title: res.achievement.title,
      message: res.achievement.description,
      thumbnailUrl: res.thumbnailUrl
    })
  }
}

export default RainbowIslands
