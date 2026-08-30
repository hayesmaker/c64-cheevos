import signal from 'signal-js'
import { camelize } from '../helpers/string-utils.js'

// Important Addresses
const MEM_SCORE_0 = 0x002a
const MEM_SCORE_1 = 0x002b
const MEM_SCORE_2 = 0x002c
const MEM_SCORE_3 = 0x002d
const MEM_GAME_START_STATE = 0x0055
const MEM_LIVES = 0x005f
const MEM_DIFFICULTY = 0x0069
const CURRENT_ENEMY_TYPE = 0x004e
const WAVE_BASELINE = 0x005e
const CURRENT_KILLS = 0x0041
const CURRENT_ARROWS = 0x0027
const INTERSTITIAL_STATE = 0x0022
const NIGHT_STATE = 0xd00e

// Helper Consts
const DIFFICULTY_GAME_MODES = {
  0x04: 0, // INNOCENT 
  0x08: 1, // TROOPER
  0x0c: 2, // DAREDEVIL
  0x10: 3  // CRAZY
}

const GAME_MODES = {
  INNOCENT: 0x04,
  TROOPER: 0x08,
  DAREDEVIL: 0x0c,
  CRAZY: 0x10,
}

// Use Decimal values for cpuReadNs comparisons.
const ENEMIES = {
  SPIDERS: 1,
  BEES: 2,
  FROGS: 4,
  DRAGONS: 8,
  PHANTOM: 16,
  SNAKE: 32,
  DEMOGORGON: 64,
}

const ENEMY_COUNT = {
  SPIDERS: [4, 8, 12, 16],
  BEES: [1, 2, 3, 4],
  FROGS: [6, 12, 16, 20],
  DRAGONS: [1, 1, 2, 3],
  PHANTOM: [1, 1, 1, 2],
  SNAKE: [1, 1, 2, 3],
  DEMOGORGON: [1, 1, 1, 1],
}

class ForbiddenForest {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    this.name = 'Forbidden Forest(test0)'
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
        case 'arachnophobia':
          checkFn = () => {
            if (this.currentGameMode >= 1) {
              return this.currentEnemyType === ENEMIES.BEES &&
                this.previousEnemyType === ENEMIES.SPIDERS &&
                this.getLives() > 0;
            }
          }
          break;
        case 'beeUrself':
          checkFn = () => {
            if (this.currentGameMode >= 1) {
              return this.currentEnemyType === ENEMIES.FROGS &&
                this.previousEnemyType === ENEMIES.BEES &&
                this.getLives() > 0;
            }
          }
          break;
        case 'froggerNotLikeThis':
          checkFn = () => {
            if (this.currentGameMode >= 1) {
              return this.currentEnemyType === ENEMIES.DRAGONS &&
                this.previousEnemyType === ENEMIES.FROGS &&
                this.getLives() > 0;
            }
          }
          break;
        case 'dragonbreed':
          checkFn = () => {
            if (this.currentGameMode >= 1) {
              return this.currentEnemyType === ENEMIES.PHANTOM &&
                this.previousEnemyType === ENEMIES.DRAGONS &&
                this.getLives() > 0;
            }
          }
          break;
        case 'fantmas':
          checkFn = () => {
            if (this.currentGameMode >= 1) {
              return this.currentEnemyType === ENEMIES.SNAKE &&
                this.previousEnemyType === ENEMIES.PHANTOM &&
                this.getLives() > 0;
            }
          }
          break;
        case 'whyDidItHaveToBeSnakes':
          checkFn = () => {
            if (this.currentGameMode >= 1) {
              return this.currentEnemyType === ENEMIES.DEMOGORGON &&
                this.previousEnemyType === ENEMIES.SNAKE &&
                this.getLives() > 0;
            }
          }
          break;
        case 'demogorgonParty':
          checkFn = () => {
            return this.previousGameMode >= 1 &&
              this.previousEnemyType === ENEMIES.DEMOGORGON &&
              this.currentEnemyType === ENEMIES.SPIDERS &&
              this.getLives() > 0
          }
          break;
        case 'ultimateMaster':
          checkFn = () => {
            return this.startingGameMode === DIFFICULTY_GAME_MODES[GAME_MODES.INNOCENT] &&
              this.previousGameMode === DIFFICULTY_GAME_MODES[GAME_MODES.CRAZY] &&
              this.getGameMode() === DIFFICULTY_GAME_MODES[GAME_MODES.INNOCENT] &&
              this.previousEnemyType === ENEMIES.DEMOGORGON &&
              this.currentEnemyType === ENEMIES.SPIDERS &&
              this.getLives() > 0;
          }
          break;
        case 'perfectSpiders':
          // All enemies killed without missing a shot. No lives must be lost. On Trooper or higher.
          checkFn = () => {
            return this.currentGameMode >= DIFFICULTY_GAME_MODES[GAME_MODES.TROOPER] &&
              this.currentEnemyType === ENEMIES.BEES &&
              this.previousEnemyType === ENEMIES.SPIDERS &&
              this.getLives() >= 3 &&
              //this.getArrows() === 42;
              this.getArrows() === this.arrowsAtRoundStart - ENEMY_COUNT.SPIDERS[this.currentGameMode];
          }
          break;
        case 'perfectBees':
          checkFn = () => {
            if (this.currentEnemyType === ENEMIES.FROGS &&
              this.previousEnemyType === ENEMIES.BEES) {
              console.log('[Bees Beaten] arrowsNow=%s, arrowsAtStart=%s', this.getArrows(), this.arrowsAtRoundStart, ENEMY_COUNT.BEES[this.currentGameMode])
            }
            return this.currentGameMode >= DIFFICULTY_GAME_MODES[GAME_MODES.TROOPER] &&
              this.currentEnemyType === ENEMIES.FROGS &&
              this.previousEnemyType === ENEMIES.BEES &&
              this.getLives() >= 3 &&
              // this.getArrows() === 48;
              this.getArrows() === this.arrowsAtRoundStart - ENEMY_COUNT.BEES[this.currentGameMode] + 1;
          }
          break;
        case 'perfectFrogs':
          checkFn = () => {
            if (this.currentEnemyType === ENEMIES.DRAGONS &&
              this.previousEnemyType === ENEMIES.FROGS) {
              console.log('[Frogs Beaten] arrowsNow=%s, arrowsAtStart=%s',
                this.getArrows(),
                this.arrowsAtRoundStart,
                ENEMY_COUNT.FROGS[this.currentGameMode])
            }
            return this.currentGameMode >= DIFFICULTY_GAME_MODES[GAME_MODES.TROOPER] &&
              this.currentEnemyType === ENEMIES.DRAGONS &&
              this.previousEnemyType === ENEMIES.FROGS &&
              this.getLives() >= 3 &&
              // +1 as 1 arrow more is given at the start of Frogs and Dragons round sometimes.
              (this.getArrows() === this.arrowsAtRoundStart - ENEMY_COUNT.FROGS[this.currentGameMode] + 1 ||
              this.getArrows() === this.arrowsAtRoundStart - ENEMY_COUNT.FROGS[this.currentGameMode]);
          }
          break;
        case 'perfectDragons':
          checkFn = () => {
            if (this.currentEnemyType === ENEMIES.PHANTOM &&
              this.previousEnemyType === ENEMIES.DRAGONS) {
              console.log('[Dragons Beaten] arrowsNow=%s, arrowsAtStart=%s',
                this.getArrows(),
                this.arrowsAtRoundStart,
                ENEMY_COUNT.DRAGONS[this.currentGameMode])
            }

            return this.currentGameMode >= DIFFICULTY_GAME_MODES[GAME_MODES.TROOPER] &&
              this.currentEnemyType === ENEMIES.PHANTOM &&
              this.previousEnemyType === ENEMIES.DRAGONS &&
              this.getLives() >= 3 &&
              // -1 as arrow 1 arrow less is given at the start Frogs and Dragons round.
              this.getArrows() === this.arrowsAtRoundStart - ENEMY_COUNT.DRAGONS[this.currentGameMode];
          }
          break;
        case 'oneShotPhantom':
          checkFn = () => {
            if (this.currentEnemyType === ENEMIES.SNAKE &&
              this.previousEnemyType === ENEMIES.PHANTOM) {
              console.log('[Phantom Beaten] arrowsNow=%s, arrowsAtStart=%s',
                this.getArrows(),
                this.arrowsAtRoundStart,
                ENEMY_COUNT.PHANTOM[this.currentGameMode])
            }
            return this.currentGameMode >= DIFFICULTY_GAME_MODES[GAME_MODES.TROOPER] &&
              this.currentEnemyType === ENEMIES.SNAKE &&
              this.previousEnemyType === ENEMIES.PHANTOM &&
              this.getLives() >= 3 &&
              this.getArrows() === this.arrowsAtRoundStart - ENEMY_COUNT.PHANTOM[this.currentGameMode];
          }
        break;
        case 'oneShotSnake':
          checkFn = () => {
            if (this.currentEnemyType === ENEMIES.DEMOGORGON &&
              this.previousEnemyType === ENEMIES.SNAKE) {
              console.log('[Snake Beaten] arrowsNow=%s, arrowsAtStart=%s',
                this.getArrows(),
                this.arrowsAtRoundStart,
                ENEMY_COUNT.SNAKE[this.currentGameMode])
            }
            return this.currentGameMode >= DIFFICULTY_GAME_MODES[GAME_MODES.TROOPER] &&
              this.currentEnemyType === ENEMIES.DEMOGORGON &&
              this.previousEnemyType === ENEMIES.SNAKE &&
              this.getLives() >= 3 &&
              this.getArrows() === this.arrowsAtRoundStart - ENEMY_COUNT.SNAKE[this.currentGameMode];
          }
          break;
        // We may remove oneShotDemogorgon as it's extremely difficult.
        case 'oneShotDemogorgon':
          checkFn = () => {
            if (this.currentEnemyType === ENEMIES.SPIDERS &&
              this.previousEnemyType === ENEMIES.DEMOGORGON) {
              console.log('[Demogorgon Beaten] arrowsNow=%s, arrowsAtStart=%s',
                this.getArrows(),
                this.arrowsAtRoundStart,
                ENEMY_COUNT.DEMOGORGON[this.currentGameMode])
            }

            return this.currentGameMode >= DIFFICULTY_GAME_MODES[GAME_MODES.TROOPER] &&
            this.previousEnemyType === ENEMIES.DEMOGORGON &&
            this.currentEnemyType === ENEMIES.SPIDERS &&
            this.getLives() >= 3 &&
            this.getArrows() === this.arrowsAtRoundStart - 1;
          }
          break;
        case 'undeadSlayer':
          checkFn = () => {
            const skelliesToKill = 5;
            return this.currentGameMode >= DIFFICULTY_GAME_MODES[GAME_MODES.TROOPER] &&
              this.currentEnemyType === ENEMIES.PHANTOM &&
              this.getArrows() === this.arrowsAtRoundStart - skelliesToKill &&
              this.getLives() >= 3 &&
              this.getScore() === this.scoreAtStart + skelliesToKill * 1000;
          }
          break;
        case 'quickKill':
          checkFn = () => {
            return this.currentGameMode === DIFFICULTY_GAME_MODES[GAME_MODES.INNOCENT] &&
              this.currentEnemyType === ENEMIES.DEMOGORGON &&
              this.previousEnemyType === ENEMIES.SNAKE &&
              this.cpuReadNS(NIGHT_STATE) < 0xf0
          }
          break;
        default:
          checkFn = () => {
            return false;
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
    this.resetGameVars()
  }

  resetGameVars() {
    this.score = 0
    this.lives = 0
    this.gameMode = 0
    this.isGameOver = true
    this.previousEnemyType = null
    this.currentEnemyType = null
    this.previousProgress = null
    this.currentProgress = null
    this.previousWaveBaseline = null
    this.currentWaveBaseline = null
    this.previousGameMode = null
    this.currentGameMode = null
    this.arrowsRemaining = null
    this.arrowsAtRoundStart = null
    this.scoreAtStart = null
    this.isRoundInterstitial = false;

  }

  newGameVars() {
    this.isGameOver = false
    this.score = this.getScore()
    this.scoreAtStart = this.score;
    this.lives = this.getLives()
    this.gameMode = this.currentGameMode
    this.startingGameMode = this.currentGameMode
    this.previousEnemyType = this.currentEnemyType
    this.previousProgress = this.currentProgress
    this.previousWaveBaseline = this.currentWaveBaseline
    this.previousGameMode = this.currentGameMode
    this.arrowsRemaining = this.getArrows()
    this.arrowsAtRoundStart = this.arrowsRemaining
    this.isRoundInterstitial = false;
    console.log('' +
      '[Started] New Game - ' +
      'score=%s, lives=%s, ' +
      'gameMode=%s, ' +
      'arrows=%s, ' +
      'nightState=%s',
      this.score, this.lives, this.gameMode, this.arrowsAtRoundStart, this.cpuReadNS(NIGHT_STATE))
  }

  updateProgressState() {
    if (this.previousEnemyType !== this.currentEnemyType) {
      console.log('[New Round]: PrevEnemy %s | New Enemy %s | Kills %s | Arrows %s | NightState=%s]',
        this.previousEnemyType,
        this.currentEnemyType,
        this.getCurrentKills(),
        this.getArrows(),
        this.cpuReadNS(NIGHT_STATE)
      )
      this.isRoundInterstitial = true;

      // this.arrowsAtRoundStart = this.getArrows();
      // this.arrowsRemaining = this.arrowsAtRoundStart;
    }
    if (this.isRoundInterstitial && this.cpuReadNS(INTERSTITIAL_STATE) === 0x2c) {
      this.isRoundInterstitial = false;
      this.arrowsAtRoundStart = this.cpuReadNS(CURRENT_ARROWS);
      this.scoreAtStart = this.getScore();
      console.log('Start Enemy Attack wave [Arrows=%s] [nightState%s]', this.arrowsAtRoundStart, this.cpuReadNS(NIGHT_STATE) );
    }

    this.previousEnemyType = this.currentEnemyType
    this.previousProgress = this.currentProgress
    this.previousWaveBaseline = this.currentWaveBaseline
    this.previousGameMode = this.currentGameMode

    this.currentEnemyType = this.cpuReadNS(CURRENT_ENEMY_TYPE)
    this.currentProgress = this.cpuReadNS(CURRENT_KILLS)
    this.currentWaveBaseline = this.cpuReadNS(WAVE_BASELINE)
    this.currentGameMode = this.getGameMode()
  }

  getArrows() {
    return this.cpuReadNS(CURRENT_ARROWS)
  }

  getCurrentKills() {
    console.log('getCurrentKills ', this.cpuReadNS(CURRENT_KILLS) - this.cpuReadNS(WAVE_BASELINE))
    return this.cpuReadNS(CURRENT_KILLS) - this.cpuReadNS(WAVE_BASELINE)
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
    this.updateProgressState()

    const currentScore = this.getScore()
    if (currentScore !== this.score && !this.isGameOver) {
      this.score = currentScore
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
      // no different gameMode leaderboards
      // All gameMode scores are stored together.
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
    if (!this.isGameOver) {
      this.cheevosMap.forEach(c => {
        if (!c.isPopped && c.check()) {
          c.isPopped = true
          console.log('Pop Cheevo::', c.title, c.message)
          this.popCheevo(c.cheevoId)
        }
      })

    }
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
