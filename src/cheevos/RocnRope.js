import signal from 'signal-js'
import { camelize, convertMemToScoreDigits } from '../helpers/string-utils.js'

const MEM_SCORE_1 = 0xa980
const MEM_SCORE_2 = 0xa981
const MEM_SCORE_3 = 0xa982
const MEM_LIVES = 0xa983
// const ROUND_NUMBER = 0x1166

const GAME_OVER_LIVES = 0x00;

class RocnRope {
  static ultimate = {
    pollIntervalMs: 1000,
    memoryRanges: [
      { address: MEM_SCORE_1, length: 3, label: 'Score' },
      { address: MEM_LIVES, length: 1, label: 'Lives' },
      // { address: ROUND_NUMBER, length: 1, label: 'Round' },
    ]
  }

  static get ultimateMemoryRanges() {
    return this.ultimate.memoryRanges
  }

  constructor({
                gameId,
                user,
                cheevosSet = { cheevos: [] },
                poppedCheevos = [],
                popCheevo = async () => {},
                postScore = async () => ({})
              }) {
    this.name = 'RocnRope'
    console.log(`${this.name} - LIVE`, gameId)
    this._popCheevo = popCheevo
    this.postScore = postScore
    this.user = user
    this.gameId = gameId
    this.watcher = signal()
    this.resetGameVars()
    this.cheevosSet = cheevosSet
    this.cheevosMap = cheevosSet.cheevos.map((c) => {
      const hasPopped = poppedCheevos.some((p) => {
        return p.achievement._id === c._id
      })
      let checkFn
      return {
        title: c.title,
        message: c.description,
        isPopped: hasPopped,
        check: checkFn || (() => false),
        cheevoId: c._id
      }
    })

    console.log('CheevosMap::', this.cheevosMap)
  }

  resetGameVars() {
    this.score = 0
    this.lives = GAME_OVER_LIVES
    this.isGameOver = true
    this.isGameInProgress = false
    this.scoreSubmitted = false
    this.roundNumber = 0
    this.islandNumber = 0
  }

  newGameVars() {
    this.isGameOver = false
    this.isGameInProgress = true
    this.score = this.getScore()
    this.lives = this.getLives()
    this.scoreSubmitted = false
    this.roundNumber = 0
    console.log('Started New Game', this.score, this.lives)
  }

  getScore() {
    const score1 = this.ramRead(MEM_SCORE_1);
    const score2 = this.ramRead(MEM_SCORE_2);
    const score3 = this.ramRead(MEM_SCORE_3);
    return (score1 | (score2 << 8) | (score3 << 16)) >>> 0
  }

  // getRound() {
  //   return this.cpuReadNS(ROUND_NUMBER)
  // }

  getLives() {
    return this.ramRead(MEM_LIVES)
  }

  newGameCheck() {
    const lives = this.getLives()
    return this.isGameOver &&
      lives === 3;
      // this.cpuReadNS(DIAMOND_COLLECTED) === 6
  }

  endGameCheck() {
    return this.isGameInProgress && (this.getLives() === GAME_OVER_LIVES)
  }

  execute() {
    if (this.newGameCheck()) {
      this.newGameVars()
      this.watcher.dispatch('newGame', {})
    }
    const currentLives = this.getLives()
    if (currentLives !== this.lives) {
      const lostLife = !this.isGameOver && this.isGameInProgress &&
        (currentLives < this.lives || currentLives === GAME_OVER_LIVES)
      this.lives = currentLives
      console.log(`${this.name}.lives=`, this.lives)
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

    if (this.isGameOver) {
      this.checkCheevos((c) => c.title === 'Wings of Death')
      return
    }

    const currentScore = this.getScore()
    if (currentScore !== this.score && !this.isGameOver) {
      this.score = currentScore
    }

    // const currentRound = this.getRound()
    // if (currentRound !== this.roundNumber) {
    //   this.roundNumber = currentRound
    // }

    this.checkCheevos()
  }

  checkCheevos(filter = () => true) {
    this.cheevosMap.forEach(c => {
      if (!filter(c)) return
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


  getCredits() {
    //return this.cpuReadNS(CREDITS) === 0
  }
}

export default RocnRope
