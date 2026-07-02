import signal from 'signal-js'
import { camelize } from '../helpers/string-utils.js'

const MEM_SCORE_0 = 0x002a
const MEM_SCORE_1 = 0x002b
const MEM_SCORE_2 = 0x002c
const MEM_SCORE_3 = 0x002d
const MEM_GAME_START_STATE = 0x0055
const MEM_LIVES = 0x005f
const MEM_DIFFICULTY = 0x0069

const DIFFICULTY_GAME_MODES = {
  0x04: 0,
  0x08: 1,
  0x0c: 2,
  0x10: 3
}

class ForbiddenForest {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    this.name = 'Forbidden Forest'
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
      let checkFn;
      console.log('cheevo %s', i, camelize(c.title));
      switch(camelize(c.title)) {
        case 'firstDance':
          checkFn = () => {
            return false;
          }
          break;
        case 'beeUrself':
          checkFn = () => {
            return false;
          }
          break;
        case 'froggerNotLikeThis':
          checkFn = () => {
            return false;
          }
          break;
        case 'dragonBreed':
          checkFn = () => {
            return false;
          }
          break;
        case 'fantomas':
          checkFn = () => {
            return false;
          }
          break;
        case 'whyDidItHaveToBeSnakes':
          checkFn = () => {
            return false;
          }
          break;
        case 'demogorgonParty':
          checkFn = () => {
            return false;
          }
          break;
        case 'ultimateMaster':
          checkFn = () => {
            return false;
          }
          break;
        case 'perfectSpiders':
          checkFn = () => {
            return false;
          }
          break;
        case 'perfectBees':
          checkFn = () => {
            return false;
          }
        case 'perfectFrogs':
          checkFn = () => {
            return false;
          }
          break;
        case 'perfectDragons':
          checkFn = () => {
            return false;
          }
          break;
        case 'oneShotPhantom':
          checkFn = () => {
            return false;
          }
        break;
        case 'oneShotSnake':
          checkFn = () => {
            return false;
          }
          break;
        case 'oneShotDemogorgon':
          checkFn = () => {
            return false;
          }
          break;
        case 'undeadSlayer':
          checkFn = () => {
            return false;
          }
          break;
        case 'skinTheDragon':
          checkFn = () => {
            return false;
          }
          break;
        default:
          checkFn = () => {}
          break;
        
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
    this.gameMode = 0
    this.isGameOver = true
  }

  newGameVars() {
    this.isGameOver = false
    this.score = this.getScore()
    this.lives = this.getLives()
    this.gameMode = this.getGameMode()
    console.log('Started New Game', this.score, this.lives, this.gameMode)
  }

  getScore() {
    const b0 = this.cpuReadNS(MEM_SCORE_0)
    const b1 = this.cpuReadNS(MEM_SCORE_1)
    const b2 = this.cpuReadNS(MEM_SCORE_2)
    const b3 = this.cpuReadNS(MEM_SCORE_3)
    const digits = [
      b3 >> 4, b3 & 0x0f,
      b2 >> 4, b2 & 0x0f,
      b1 >> 4, b1 & 0x0f,
      b0 >> 4, b0 & 0x0f
    ]

    return Number(digits.join(''))
  }

  getLives() {
    return this.cpuReadNS(MEM_LIVES)
  }

  getGameMode() {
    return DIFFICULTY_GAME_MODES[this.cpuReadNS(MEM_DIFFICULTY)] ?? 0
  }

  endGameCheck() {
    return !this.isGameOver && this.getLives() === 0
  }

  newGameCheck() {
    return this.isGameOver && this.getLives() > 0 && this.cpuReadNS(MEM_GAME_START_STATE) === 1
  }

  execute() {
    const currentScore = this.getScore()
    if (currentScore !== this.score && !this.isGameOver) {
      this.score = currentScore
      // console.log(`${this.name}.score=`, this.score)
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
      console.log('Game Over! Final Score:', this.score);
      this.isGameOver = true
      this.watcher.dispatch('gameOver', {
        score: this.score
      })
      this.postScore(
        this.gameId,
        this.score,
        this.user.id,
        this.user.username,
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

export default ForbiddenForest
