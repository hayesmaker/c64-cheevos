import signal from 'signal-js'
import { camelize } from '../helpers/string-utils.js'

const GAME_MODE = 0x20c9

class MariosCementFactory {
  static ultimate = {
    pollIntervalMs: 1000,
    memoryRanges: [
      { address: 0x20c9, length: 1, label: 'Game mode' },
      { address: 0x8121, length: 2, label: 'Score' },
      { address: 0x824c, length: 1, label: 'Lives lost' },
      { address: 0x8da0, length: 2, label: 'Player position' }
    ]
  }

  static get ultimateMemoryRanges() {
    return this.ultimate.memoryRanges
  }

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
            return this.livesLost === 1 && !this.isGameOver;
          }
          break
        case 'finalWarning':
          checkFn = () => {
            return this.livesLost === 2 && !this.isGameOver;
          }
          break
        case 'grossMisconduct':
          checkFn = () => {
            return this.livesLost === 3;
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
        case 'ultimateMaster':
          checkFn = () => {
            return this.score >= 1000 && this.livesLost === 0
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
    this.livesLost = 255
    this.location = {
      row: 0,
      col: 0
    }
    this.hasReachedEscapeFloor = false
    this.scoreSubmitted = false
    this.isGameOver = true;
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

    if (currentLivesLost === 0 && currentLivesLost !== this.livesLost && this.isGameOver) {
      console.log('New Game')
      this.livesLost = currentLivesLost
      this.scoreSubmitted = false
      this.watcher.dispatch('newGame', {
        gameMode: this.getGameMode()
      })
      this.isGameOver = false;
    }

    if (currentLivesLost === 3 && this.livesLost === 2 && !this.scoreSubmitted) {
      this.scoreSubmitted = true
      const gameMode = this.getGameMode()
      this.isGameOver = true;
      this.watcher.dispatch('gameOver', {
        score: this.score,
        gameMode
      })
      this.postScore(
        this.gameId,
        this.score,
        this.user.id,
        this.user.username,
        gameMode
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
