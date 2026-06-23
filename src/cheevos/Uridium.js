import signal from 'signal-js'

import { camelize } from '../helpers/string-utils.js'

const MEM_LEVEL = 0x0026 // (1 = level 1 // 0a = level 10)
const MEM_FORMATIONS = 0x0087 // hex - 6 max?
const MEM_DESTRUCT_SEQUENCE = 0x00a9 // 06 start, 05-00, 01 at top, 00 when completed
const MEM_LEVEL_STATE = 0x0096 // hex varies, $17 (#23)  seems to be destruct sequence end screen
const MEM_LIVES = 0x0025 // dec
const MEM_FIGHTER_DESTROYED = 0x0097


class Uridium {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    console.log('Uridium initialized', cheevosSet, gameId)
    this._popCheevo = popCheevo

    this.gameId = gameId
    this.user = user
    this.lives = 0
    this.level = 0;
    this.fightersDestroyed = 0;
    this.watcher = signal()
    this.cheevosSet = cheevosSet
    this.cheevosMap = cheevosSet.cheevos.map((c, i) => {
      const hasPopped = poppedCheevos.some((p) => {
        return p.achievement._id === c._id
      })
      let checkFn = () => {
      }
      switch (camelize(c.title)) {
        case 'zinc':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 1 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'lead':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 2 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'copper':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 3 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'silver':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 4 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'iron':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 5 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'gold':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 6 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'platinum':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 7 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'tungsten':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 8 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'iridon':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 9 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'kallisto':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 10 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'triAlloy':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 11 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'quadminium':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 12 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'ergonite':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 13 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'galactium':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 14 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'greatShotTurkey':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_LEVEL)) === 15 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'novicePilot':
          checkFn = () => {
            return this.score >= 10000
          }
          break
        case 'experiencedPilot':
          checkFn = () => {
            return this.score >= 25000
          }
          break
        case 'veteranPilot':
          checkFn = () => {
            return this.score >= 50000
          }
          break
        case 'elitePilot':
          checkFn = () => {
            return this.score >= 100000
          }
          break
        case 'uridiumAce':
          checkFn = () => {
            return this.score >= 150000
          }
          break
        case 'meltdown':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_DESTRUCT_SEQUENCE)) === 0 && parseInt(this.cpuReadNS(MEM_LEVEL_STATE)) === 23
          }
          break
        case 'clearedHot':
          checkFn = () => {
            return parseInt(this.cpuReadNS(MEM_FORMATIONS)) === 6
          }
          break
        case 'dogFighter':
          checkFn = () => {
          }
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
    this.score = 0
    this.highScore = 0
    this.postScore = postScore
  }

  getScore = () => {
    const digit1 = this.cpuReadNS(0x4853).toString(16) === '30' ? '0' : this.cpuReadNS(0x4853).toString(16)
    const digit2 = this.cpuReadNS(0x4854).toString(16) === '30' ? '0' : this.cpuReadNS(0x4854).toString(16)
    const digit3 = this.cpuReadNS(0x4855).toString(16) === '30' ? '0' : this.cpuReadNS(0x4855).toString(16)
    const digit4 = this.cpuReadNS(0x4856).toString(16) === '30' ? '0' : this.cpuReadNS(0x4856).toString(16)
    const digit5 = this.cpuReadNS(0x4857).toString(16) === '30' ? '0' : this.cpuReadNS(0x4857).toString(16)
    const digit6 = this.cpuReadNS(0x4858).toString(16) === '30' ? '0' : this.cpuReadNS(0x4858).toString(16)
    return parseInt(digit1 + digit2 + digit3 + digit4 + digit5 + digit6)
  }

  getLevel = () => {
    // return parseInt(this.cpuReadNS(0x0026))
    return parseInt(this.cpuReadNS(MEM_LEVEL))
  }

  getLives = () => {
    return parseInt(this.cpuReadNS(MEM_LIVES).toString(16))
  }

  getFighterDestroyed = () => {
    return parseInt(this.cpuReadNS(MEM_FIGHTER_DESTROYED)) === 38;
  }

  execute = () => {
    const score = this.getScore()
    if (score !== this.score) {
      this.score = score
    }
    if (this.getFighterDestroyed()) {
      this.fightersDestroyed += 1;
    }

    const level = this.getLevel()
    if (level !== this.level) {
      this.level = level
    }

    const lives = this.getLives()
    if (lives !== this.lives) {
      if (lives < this.lives) {
        console.log('Uridium::life lost', lives)
      }

      if (lives === 0 && this.lives === 1) {
        this.fightersDestroyed = 0;
        // const user = toRaw(this.user.value);
        this.watcher.dispatch('gameOver', {
          score: this.score,
          highScore: this.score > this.highScore ? this.score : 0
        })
        console.log('User submit', this.user, score, this.score)
        this.postScore(this.gameId, this.score, this.user.id, this.user.username).then(res => {
          console.log('Score posted successfully', res)
          this.watcher.dispatch('cheevo', {
            title: `Score Submit Success`,
            message: `Your score of ${this.score} has been submitted to the URIDIUM Leaderboard!`
          })
        })
      }

      this.lives = lives
      this.watcher.dispatch('livesChange', {
        lives: this.lives
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

export default Uridium
