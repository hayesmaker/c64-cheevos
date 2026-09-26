import signal from 'signal-js'
import { camelize, convertMemToScoreDigits } from '../helpers/string-utils.js'

const MEM_LIVES = 0x076b
const MEM_SCORE_1 = 0x4ab1
const MEM_SCORE_2 = 0x4ab2
const MEM_SCORE_3 = 0x4ab3

const NEW_GAME_FLAG = 0x001d
const ITEM_COUNT = 0x4621
const FUEL_GAUGE = 0x4619
const GAME_COMPLETE_FLAG = 0x01fe
const SPEEDO = 0x00fb

const VAL_FULL_TANK = 0x57
const VAL_COMPLETE = 0x37
const VAL_FULL_THROTTLE = 0x0b

// const MEM_PLAYER_HIT = 0x4b4a  //0 = is alive : 6 = player hit
// const GAME_OVER_FLAG = 0x4b23  //0 is game over screen
// const MEM_RESET = 0x4b0b

class ActionBiker {
  static ultimate = {
    pollIntervalMs: 1000,
    memoryRanges: [
      { address: MEM_LIVES, length: 1, label: 'Lives' },
      { address: MEM_SCORE_1, length: 3, label: 'Score' },
      { address: NEW_GAME_FLAG, length: 1, label: 'New Game' },
      { address: ITEM_COUNT, length: 1, label: 'Item Count' },
      { address: FUEL_GAUGE, length: 1, label: 'Fuel Gauge' },
      { address: GAME_COMPLETE_FLAG, length: 1, label: 'Completed' }
    ]
  }

  static get ultimateMemoryRanges() {
    return this.ultimate.memoryRanges
  }

  constructor({
                gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {
    }, postScore = async () => ({})
              }) {
    this.name = 'Action Biker'
    console.log(`${this.name}::Loaded`, gameId)
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
      switch (camelize(c.title)) {
        case 'dontRideWithoutOne':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 1
          }
          break
        case 'hellForLeathers':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 2
          }
          break
        case 'passedYourTheory':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 3
          }
          break
        case 'metalGear':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 4
          }
          break
        case 'kidGloves':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 5
          }
          break
        case 'nightRider':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 6
          }
          break
        case 'petrolGauge':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 7
          }
          break
        case 'gasGuzzler':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 8 && this.cpuReadNS(FUEL_GAUGE) === VAL_FULL_TANK
          }
          break
        case 'allTooledUp':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 9
          }
          break
        case 'puddleOfMud':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 10
          }
          break
        case 'illBeBack':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 11
          }
          break
        case 'needForSpeed':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) >= 12 && this.cpuReadNS(SPEEDO) === VAL_FULL_THROTTLE;
          }
          break
        case 'thirstyWork':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 13
          }
          break
        case 'hyperVisor':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 14
          }
          break
        case 'highEmissionZone':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 15
          }
          break
        case 'whereAreTheBrakes':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 16
          }
          break
        case 'speedos':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 17
          }
          break
        case 'masterOfTheLamps':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 18
          }
          break
        case 'jamieOliveOil':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 19
          }
          break
        case 'turboCharged':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 20
          }
          break
        case 'onlyFins':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 21
          }
          break
        case 'youveGotThemUseThem':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 22
          }
          break
        case 'mirrorSignalManoevre':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 23
          }
          break
        case 'tommyTutone':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 24
          }
          break
        case 'raiseReflectors':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 25
          }
          break
        case 'aToZ':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 26
          }
          break
        case 'twistedElectricStarter':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 27
          }
          break
        case 'packedTheSkips':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 28
          }
          break
        case '104GoodBuddy':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 29
          }
          break
        case 'whiteStripes':
          return this.cpuReadNS(ITEM_COUNT) === 30
          break
        case 'skiSunday':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 31
          }
          break
        case 'safetyFirst':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 32
          }
          break
        case 'lightFog':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 33
          }
          break
        case 'goForASpeedRun':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 34
          }
          break
        case 'kickStart':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 35
          }
          break
        case 'gunsNRoses':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 36
          }
          break
        case 'ginAndTonic':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 37
          }
          break
        case 'revs':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 38
          }
          break
        case 'didntWeHaveOneAlready':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 39
          }
          break
        case 'noTickets':
          checkFn = () => {
            return this.cpuReadNS(ITEM_COUNT) === 40
          }
          break
        case 'noSecondPrize':
          checkFn = () => {
            return this.gameCompleted();
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
    const score1 = convertMemToScoreDigits(MEM_SCORE_3, this)
    const score2 = convertMemToScoreDigits(MEM_SCORE_2, this)
    const score3 = convertMemToScoreDigits(MEM_SCORE_1, this)
    return parseInt(score1 + score2 + score3, 10)
  }

  getIsDead() {
    return this.cpuReadNS(NEW_GAME_FLAG) === 0
  }

  getLives() {
    return this.cpuReadNS(MEM_LIVES) - 0x30
  }

  newGameCheck() {
    return this.isGameOver && this.getLives() >= 5 && this.cpuReadNS(NEW_GAME_FLAG) >= 0x06
  }

  gameCompleted() {
    return this.cpuReadNS(ITEM_COUNT) === 40 && this.cpuReadNS(GAME_COMPLETE_FLAG) === VAL_COMPLETE
  }

  execute() {
    const currentScore = this.getScore()
    if (currentScore !== this.score) {
      this.score = currentScore
      console.log('score=', this.score)
    }

    if (this.newGameCheck()) {
      this.newGameVars()
      this.watcher.dispatch('newGame', {})
    }

    const currentLives = this.getLives()
    if (currentLives !== this.lives) {
      this.lives = currentLives
      // console.log('lives=', this.lives)
    }
    if ((
        !this.isGameOver &&
        gameCompleted()
      ) ||
      (
        currentLives === 0 &&
        this.getIsDead() &&
        !this.isGameOver
      )
    ) {
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

export default ActionBiker
