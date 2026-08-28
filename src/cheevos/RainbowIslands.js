import signal from 'signal-js'
import { convertMemToScoreDigits } from '../helpers/string-utils.js'

const MEM_SCORE_1 = 0x115b
const MEM_SCORE_2 = 0x115c
const MEM_SCORE_3 = 0x115d
const MEM_SCORE_4 = 0x115e
const MEM_LIVES = 0x1160
const GAME_OVER_LIVES = 0xff
const START_GAME_LIVES = 0x02

class RainbowIslands {
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

      return {
        title: c.title,
        message: c.description,
        isPopped: hasPopped,
        check: () => false,
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
  }

  newGameVars() {
    this.isGameOver = false
    this.isGameInProgress = true
    this.score = this.getScore()
    this.lives = this.getLives()
    console.log('Started New Game', this.score, this.lives)
  }

  getScore() {
    const score1 = convertMemToScoreDigits(MEM_SCORE_1, this)
    const score2 = convertMemToScoreDigits(MEM_SCORE_2, this)
    const score3 = convertMemToScoreDigits(MEM_SCORE_3, this)
    const score4 = convertMemToScoreDigits(MEM_SCORE_4, this)
    return parseInt(score1 + score2 + score3 + score4, 10)
  }

  getLives() {
    return this.cpuReadNS(MEM_LIVES)
  }

  newGameCheck() {
    return this.isGameOver && this.getLives() === START_GAME_LIVES;
  }

  endGameCheck() {
    return this.isGameInProgress && this.getLives() === GAME_OVER_LIVES
  }

  execute() {
    if (this.newGameCheck()) {
      this.newGameVars()
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

    if (this.endGameCheck()) {
      this.isGameOver = true
      this.isGameInProgress = false
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
