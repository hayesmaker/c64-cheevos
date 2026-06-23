import signal from 'signal-js'
import { convertMemToScoreDigits } from '../helpers/string-utils.js'

const MEM_LIVES = 0x4b2d
const MEM_SCORE_1 = 0x4b2e
const MEM_SCORE_2 = 0x4b2f
const MEM_SCORE_3 = 0x4b30
const MEM_PLAYER_HIT = 0x4b4a  //0 = is alive : 6 = player hit
const GAME_OVER_FLAG = 0x4b23  //0 is game over screen
const MEM_RESET = 0x4b0b

class CheevosTemplate {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    console.log('GenericTemplate::constructor', gameId)
    this._popCheevo = popCheevo;
    this.name = 'Generic Game'
    this.postScore = postScore
    this.user = user;
    this.gameId = gameId
    this.watcher = signal()
    this.cheevosSet = cheevosSet;
    this.cheevosMap = cheevosSet.cheevos.map((c, i) => {
      const hasPopped = poppedCheevos.some((p) => {
        return p.achievement._id === c._id
      })
      let checkFn = () => {
      }
      return {
        title: c.title,
        message: c.description,
        isPopped: hasPopped,
        check: checkFn,
        cheevoId: c._id
      }
    })
    this.resetGameVars()
  }

  resetGameVars() {
    this.score = 0
    this.lives = 0
    this.isGameOver = true
  }

  newGameVars() {
    this.isGameOver = false
    this.score = this.getScore()
    this.lives = this.getLives()
    console.log('Start New Game', this.score, this.lives)
  }

  getScore() {
    // const score3 = convertMemToScoreDigits(MEM_SCORE_3, this);
    // const score2 = convertMemToScoreDigits(MEM_SCORE_2, this);
    // const score1 = convertMemToScoreDigits(MEM_SCORE_1, this);
    // return parseInt(score3 + score2 + score1, 10)
  }

  getIsDead() {
    return parseInt(this.cpuReadNS(GAME_OVER_FLAG), 10) === 0
  }

  getLives() {
    return parseInt(this.cpuReadNS(MEM_LIVES).toString(16), 10)
  }

  newGameCheck() {

  }

  execute() {
    const currentScore = this.getScore()
    if (currentScore !== this.score) {
      this.score = currentScore
      console.log('Template.score=', this.score)
    }

    if (this.newGameCheck()) {
      this.newGameVars()
    }

    const currentLives = this.getLives()
    if (currentLives !== this.lives) {
      this.lives = currentLives
      console.log('Template.lives=', this.lives)
    }
    if (currentLives === 0 && this.getIsDead() && !this.isGameOver) {
      this.isGameOver = true
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

export default CheevosTemplate
