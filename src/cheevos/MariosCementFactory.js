import signal from 'signal-js'
import { camelize } from '../helpers/string-utils.js'

const GAME_MODE = 0x20c9

class MariosCementFactory {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    this.gameModes = ['gameA', 'gameB']
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
      let checkFn
      switch (camelize(c.title)) {
        case 'welcomeToYourNewJob':
          checkFn = () => {
            return this.score >= 100
          }
          break
        case 'hopeYouHadAWonderfulFirstDay':
          checkFn = () => {
            return this.score >= 200
          }
          break
        case 'bonusMilestone':
          checkFn = () => {
            return this.score >= 300
          }
          break
        case 'promotion':
          checkFn = () => {
            return this.score >= 400
          }
          break
        case 'suckedInToOvertime':
          checkFn = () => {
            return this.score >= 500
          }
          break
        case 'franticFreddie':
          checkFn = () => {
            return this.score >= 600
          }
          break
        case 'tryingToImpressTheBoss':
          checkFn = () => {
            return this.score >= 700
          }
          break
        case 'theresEasierWaysToDoThis':
          checkFn = () => {
            return this.score >= 800
          }
          break
        case 'startingToSmellLikeCement':
          checkFn = () => {
            return this.score >= 900
          }
          break
        case 'cementKing':
          checkFn = () => {
            return this.score >= 1000
          }
          break
        case 'verbalWarning':
          checkFn = () => {
            return this.livesLost === 1
          }
          break
        case 'finalWarning':
          checkFn = () => {
            return this.livesLost === 2
          }
          break
        case 'grossMisconduct':
          checkFn = () => {
            return this.livesLost === 3
          }
          break
        case 'doubleScoreFactory':
          checkFn = () => {
            return this.score >= 300 && this.livesLost === 0
          }
          break
        case 'escapeArtist':
          checkFn = () => {
            if (!this.hasReachedEscapeFloor) {
              return false
            }
            if (this.location.row === 2 && this.location.col === 1) {
              return true
            }
            if (this.location.row === 2 && this.location.col === 4) {
              return true
            }
            if (this.location.row === 3 && this.location.col === 1) {
              return true
            }
            return this.location.row === 3 && this.location.col === 4
          }
          break
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
    this.livesLost = 0
    this.location = {
      row: 0,
      col: 0
    }
    this.hasReachedEscapeFloor = false
  }

  getGameMode = () => {
    return parseInt(this.cpuReadNS(GAME_MODE).toString(16), 16)
  }


  getLocation = () => {
    const col = parseInt(this.cpuReadNS(0x8da0).toString(16))
    const row = parseInt(this.cpuReadNS(0x8da1).toString(16))
    return { row, col }
  }

  getScore = () => {
    // console.log('getScore', this.cpuReadNS(0x8121), this.cpuReadNS(0x8122));
    const scoreLow = parseInt(this.cpuReadNS(0x8121).toString(16))
    const scoreHigh = parseInt(this.cpuReadNS(0x8122).toString(16))
    return scoreHigh * 100 + scoreLow
  }

  getLives = () => {
    return parseInt(this.cpuReadNS(0x824c).toString(16))
  }

  execute = () => {
    const location = this.getLocation()
    if (location.row !== this.location.row || location.col !== this.location.col) {
      this.location = location
      if (this.location.row === 4 && this.location.col === 1) {
        this.hasReachedEscapeFloor = true
      }
    }

    const currentScore = this.getScore()
    if (currentScore !== this.score) {
      this.score = currentScore
    }

    const currentLivesLost = this.getLives()

    if (currentLivesLost === 0 && currentLivesLost !== this.livesLost) {
      console.log('New Game')
      this.livesLost = currentLivesLost
    }

    if (currentLivesLost === 3 && this.livesLost === 2) {
      this.watcher.dispatch('gameOver', {
        score: this.score
      })
      this.postScore(
        this.gameId,
        this.score,
        this.user.id,
        this.user.username,
        this.getGameMode()
      ).then(res => {
        console.log('Score posted successfully', res)

        this.watcher.dispatch('cheevo', {
          title: `Score Submit Success`,
          message: `Your score of ${this.score} has been submitted to the MCF Leaderboard!`
        })
      })
    }

    if (currentLivesLost > this.livesLost) {
      this.hasReachedEscapeFloor = false
      this.livesLost = currentLivesLost
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

export default MariosCementFactory
