import signal from 'signal-js'
import { convertMemToScoreDigits } from '../helpers/string-utils.js'

const MEM_SCORE_0 = 0x0021
const MEM_SCORE_1 = 0x0022
const MEM_SCORE_2 = 0x0023
const MEM_SCORE_3 = 0x0024

const MEM_GRIBBLETS_SAVED = 0x005c
const MEM_GRIBBLY_PSI = 0x0057    // hex $28 = new game
const MEM_GRIBBLY_BANK = 0x0059   // hex $50 = new game
const MEM_IN_GAME = 0x009d        // 2 = game - 1 = main menu


class Gribbly {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    console.log('Gribbley::constructor', gameId, cheevosSet)
    this._popCheevo = popCheevo
    this.postScore = postScore
    this.user = user
    this.gameId = gameId
    this.watcher = signal()
    this.cheevosSet = cheevosSet
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
    this.isGameOver = true
    this.score = 0
    this.lives = 0
  }

  newGameVars() {
    this.isGameOver = false
    this.score = this.getScore()
    // this.lives = this.getLives();
    console.log('Start New Game', this.score)
  }

  getScore() {
    const score0 = convertMemToScoreDigits(MEM_SCORE_0, this)
    const score1 = convertMemToScoreDigits(MEM_SCORE_1, this)
    const score2 = convertMemToScoreDigits(MEM_SCORE_2, this)
    const score3 = convertMemToScoreDigits(MEM_SCORE_3, this)
    return parseInt(score0 + score1 + score2 + score3, 10)
  }

  getIsDead() {
    return parseInt(this.cpuReadNS(MEM_GRIBBLY_BANK), 10) === 0 &&
      parseInt(this.cpuReadNS(MEM_GRIBBLY_PSI), 10) === 0 &&
      parseInt(this.cpuReadNS(MEM_IN_GAME), 10) === 1
  }


  newGameCheck() {
    return parseInt(this.cpuReadNS(MEM_GRIBBLY_BANK), 10) === 80 &&
      parseInt(this.cpuReadNS(MEM_GRIBBLY_PSI), 10) === 40 &&
      parseInt(this.cpuReadNS(MEM_IN_GAME), 10) === 2;
  }

  execute() {
    const currentScore = this.getScore()
    if (currentScore !== this.score) {
      this.score = currentScore
      console.log('Gribbly.score=', this.score)
    }

    if (this.isGameOver && this.newGameCheck()) {
      this.newGameVars()
      // this.isGameOver = false;
    }

    if (this.getIsDead() && !this.isGameOver) {
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
          message: `Your score of ${this.score} has been submitted to the Gribbly Grobbly Leaderboard!`
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

export default Gribbly
