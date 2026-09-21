import signal from 'signal-js'
import { camelize, convertMemToScoreDigits } from '../helpers/string-utils.js'

const MEM_SCORE_1 = 0x115b
const MEM_SCORE_2 = 0x115c
const MEM_SCORE_3 = 0x115d
const MEM_SCORE_4 = 0x115e
const MEM_LIVES = 0x1160
const ROUND_NUMBER = 0x1166
const ISLAND_NUMBER = 0x1165
const GAME_OVER_LIVES = 0xff
const DIAMOND_COLLECTED = 0x00ad
const DIAMOND_MISTAKES = 0x00ae
const CREDITS = 0x18B3
const ACTIVE_POWER_UP = 0x004e
const PERM_POWER_UP = 0x004f
const ISLAND_FLAG = 0x00a8

const SPEED_UP = 0x40
const WINGS_UP = 0x80
const DOUBLE_RAINBOWS = 0x01
const FAST_RAINBOWS = 0x04


class RainbowIslands {
  static ultimate = {
    pollIntervalMs: 1000,
    memoryRanges: [
      { address: MEM_SCORE_1, length: 4, label: 'Score' },
      { address: MEM_LIVES, length: 1, label: 'Lives' },
      { address: ROUND_NUMBER, length: 1, label: 'Round' },
      { address: ISLAND_NUMBER, length: 1, label: 'Island' },
      { address: DIAMOND_COLLECTED, length: 2, label: 'DiamondOrder' },
      { address: CREDITS, length: 1, label: 'Credits' },
      { address: ACTIVE_POWER_UP, length: 2, label: 'Powerups' },
      { address: ISLAND_FLAG, length: 2, label: 'IslandFlag'}
    ]
  }

  static get ultimateMemoryRanges() {
    return this.ultimate.memoryRanges
  }

  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    this.name = 'Rainbow Islands (LOCAL)'
    console.log(`${this.name} - LIVE`, gameId)
    this._popCheevo = popCheevo
    this.postScore = postScore
    this.user = user
    this.gameId = gameId
    this.watcher = signal()
    this.resetGameVars();
    this.cheevosSet = cheevosSet;
    this.cheevosMap = cheevosSet.cheevos.map((c) => {
      const hasPopped = poppedCheevos.some((p) => {
        return p.achievement._id === c._id
      })
      let checkFn
      switch (camelize(c.title)) {
        case 'potOfGold':
          checkFn = () => {
            return this.score >= 250000
          }
          break;
        case 'bigFood':
          checkFn = () => {
            return this.score >= 500000
          }
          break;
        case 'bigWhoop':
          checkFn = () => {
            return this.score >= 1000000
          }
          break;
        case 'bugSpray':
          checkFn = () => {
            return this.islandNumber === 1;
          }
          break;
        case 'helikopterHelikopter':
          checkFn = () => {
            return this.islandNumber === 2;
          }
          break;
        case 'doTheMash':
          checkFn = () => {
            return this.islandNumber === 3;
          }
          break;
        case 'toyStory':
          checkFn = () => {
            return this.islandNumber === 4;
          }
          break;
        case 'revengeOnDoh':
          checkFn = () => {
            return this.islandNumber === 5;
          }
          break;
        case 'theDroidsYourLookingFor':
          checkFn = () => {
            return this.islandNumber === 6;
          }
          break;
        case 'endOfTheRainbow':
          checkFn = () => {
            return this.islandNumber === 7;
          }
          break;
        case 'perfectCollection':
          checkFn = () => {
            return this.cpuReadNS(DIAMOND_MISTAKES) === 0 &&
              this.cpuReadNS(DIAMOND_COLLECTED) === 0 &&
              this.islandNumber === 0;
          }
          break;
        case 'the1cc':
          checkFn = () => {
            return this.islandNumber === 7 && this.cpuReadNS(CREDITS) === 0;
          }
          break;
        case 'needForSpeed':
          checkFn = () => {
            return (this.cpuReadNS(PERM_POWER_UP) & SPEED_UP) >= SPEED_UP;
          }
          break;
        case 'redPotionMastery':
          checkFn = () => {
            return (this.cpuReadNS(PERM_POWER_UP) & DOUBLE_RAINBOWS) >= DOUBLE_RAINBOWS;
          }
          break;
        case 'yellowPotionMastery':
          checkFn = () => {
            return (this.cpuReadNS(PERM_POWER_UP) & FAST_RAINBOWS) === FAST_RAINBOWS;
          }
          break;
        case 'bookOfWings':
          checkFn = () => {
            return (this.cpuReadNS(PERM_POWER_UP) & WINGS_UP) === WINGS_UP;
          }
          break;
        case 'shilverDoor':
          checkFn = () => {
            // this will pop as soon as the Shilver Door is Collected on Round 20;
            // Potentilally use Island Number and check if it goes from 5->7 in one hop.
            return this.roundNumber === 19 && this.cpuReadNS(ISLAND_FLAG) === 5;
          }
          break;

          default:

            break;
      }

      return {
        title: c.title,
        message: c.description,
        isPopped: hasPopped,
        check: checkFn || (() => false),
        cheevoId: c._id
      }
    })

    console.log('CheevosMap::', this.cheevosMap);
  }

  resetGameVars() {
    this.score = 0
    this.lives = GAME_OVER_LIVES
    this.isGameOver = true
    this.isGameInProgress = false
    this.scoreSubmitted = false
    this.roundNumber = 0;
    this.islandNumber = 0;
  }

  newGameVars() {
    this.isGameOver = false
    this.isGameInProgress = true
    this.score = this.getScore()
    this.lives = this.getLives()
    this.scoreSubmitted = false
    this.roundNumber = 0;
    this.islandNumber = 0;
    console.log('Started New Game', this.score, this.lives)
  }

  getScore() {
    const score1 = convertMemToScoreDigits(MEM_SCORE_1, this)
    const score2 = convertMemToScoreDigits(MEM_SCORE_2, this)
    const score3 = convertMemToScoreDigits(MEM_SCORE_3, this)
    const score4 = convertMemToScoreDigits(MEM_SCORE_4, this)
    return parseInt(score1 + score2 + score3 + score4, 10)
  }

  getIsland() {
    return this.cpuReadNS(ISLAND_NUMBER);
  }

  getRound() {
    return this.cpuReadNS(ROUND_NUMBER);
  }

  getLives() {
    return this.cpuReadNS(MEM_LIVES)
  }

  newGameCheck() {
    const lives = this.getLives()
    return this.isGameOver &&
      lives === 2 &&
      this.cpuReadNS(DIAMOND_COLLECTED) === 6;
  }

  endGameCheck() {
    return this.isGameInProgress && this.getLives() === GAME_OVER_LIVES
  }

  execute() {
    if (this.newGameCheck()) {
      this.newGameVars()
      this.watcher.dispatch('newGame', {})
    }

    const currentScore = this.getScore()
    if (currentScore !== this.score && !this.isGameOver) {
      this.score = currentScore
      // console.log(`${this.name}.score=`, this.score)
    }

    const currentLives = this.getLives()
    if (currentLives !== this.lives) {
      this.lives = currentLives
      console.log(`${this.name}.lives=`, this.lives)
    }

    const currentRound = this.getRound()
    if (currentRound !== this.roundNumber) {
      this.roundNumber = currentRound;
    }

    const currentIsland = this.getIsland();
    if (currentIsland !== this.islandNumber) {
      console.log(`New Island .islandNumber=${this.islandNumber}`, this.roundNumber)
      this.islandNumber = currentIsland;
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
      return;
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
