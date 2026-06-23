import signal from 'signal-js'
import { convertMemToScoreDigits } from '../helpers/string-utils.js'

//used
const MEM_LIVES = 0x8a34
const MEM_SCORE_1 = 0x815b
const MEM_SCORE_2 = 0x815a
const MEM_SCORE_3 = 0x8159
const MEM_SCORE_4 = 0x8158
 // [1f::in titles|13::on game over]
const GAME_OVER_FLAG = 0x00d8  
// [0e::game starts|06::in game|various in titles]
//const NEW_GAME_FALG = 0x00d7   
//unused - will be needed for some cheevos
const ENEMY_HITS = 0x8fd0 
const ENEMY_HITS_HI = 0x8fd1 
const BULLETS_FIRED = 0x8fc6 
const BULLETS_FIRED_HI = 0x8fc7

class Galaga {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    this.name = 'Galaga'
    console.log(`${this.name}::Constructor`, gameId)
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
    return parseInt(this.cpuReadNS(MEM_LIVES).toString(16), 10)
  }

  endGameCheck() {
    if (!this.isGameOver) {
      console.log('endGameCheck', this.isGameOver, this.cpuReadNS(GAME_OVER_FLAG))
    }
    //console.log('endGameCheck', this.isGameOver, this.cpuReadNS(GAME_OVER_FLAG))
    return !this.isGameOver &&
       this.cpuReadNS(GAME_OVER_FLAG) === 19;
  }

  newGameCheck() {
    if (this.isGameOver) {
      console.log('newGameCheck', this.isGameOver, this.cpuReadNS(GAME_OVER_FLAG))
    }
    return this.isGameOver &&
      this.cpuReadNS(GAME_OVER_FLAG) === 16;
  }

  execute() {
    const currentScore = this.getScore()
    if (currentScore !== this.score) {
      this.score = currentScore
      console.log(`${this.name}.score=`, this.score)
    }

    if (this.newGameCheck()) {
      this.newGameVars()
    }

    const currentLives = this.getLives()
    if (currentLives !== this.lives) {
      this.lives = currentLives
      console.log('lives=', this.lives)
    }
    if (this.endGameCheck()) {
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

export default Galaga
