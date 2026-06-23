import signal from 'signal-js'
import { camelize, convertMemToScoreDigits, screenRamDigit, screenRamLetter } from '../helpers/string-utils.js'

// const MEM_IN_GAME = 0x8d42;     // 0 in title screen, 1 in game (includes demo mode);
const MEM_SCORE_1 = 0x0407  // screen ram address, 0x0407 is the first digit of the score offset by 30
const MEM_SCORE_2 = 0x0408
const MEM_SCORE_3 = 0x0409
const MEM_SCORE_4 = 0x040a
const MEM_SCORE_5 = 0x040b
const MEM_SCORE_6 = 0x040c
const MEM_LIVES_1 = 0x0415 // 2 digits from screen ram, 0x0414 is the first digit of lives offset by 30

const GAME_OVER_1 = 0x0487 // 07 Screen RAM address off GAME OVER text, 0x0487 is the first letter
const GAME_OVER_2 = 0x0488 // 01 Screen RAM address off GAME OVER text, 0x0488 is the second letter
const GAME_OVER_3 = 0x0489 // 0d Screen RAM address off GAME OVER text, 0x0489 is the third letter
const GAME_OVER_4 = 0x048a // 05 Screen RAM address off GAME OVER text, 0x048a is the fourth letter
const GAME_OVER_5 = 0x048c // 0f Screen RAM address off GAME OVER text, 0x048c is the fifth letter
const GAME_OVER_6 = 0x048d // 16 Screen RAM address off GAME OVER text, 0x048d is the sixth letter
const GAME_OVER_7 = 0x048e // 05 Screen RAM address off GAME OVER text, 0x048e is the seventh letter
const GAME_OVER_8 = 0x048f // 12 Screen RAM address off GAME OVER text, 0x048f is the eighth letter

// const MEM_MAIN_LEVEL = 0xcf3b;  // increments each loop of 4
// const MEM_SUB_LEVEL = 0xcf2d;   // 0-3 (reaches 4 but cycles back to 0 when scrolling back)
// const MEM_NEW_BALL = 0xcf7a;    // usually 0, 1 is set when ball is about to respawn, including on game over. Stays 0 in demo mode.
// const MEM_POWER = 0xcfb2;       // 0 when out of power, 48($30) when full power
// const MEM_HAS_POWER = 0xcfb5;   // 0 when out of power, 1 when has some power

class PottyPigeon {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    console.log('PottyPigeon::constructor', gameId, cheevosSet)
    this._popCheevo = popCheevo
    this.postScore = postScore
    this.watcher = signal()
    this.cheevos = []
    this.user = user
    this.gameId = gameId
    this.score = 0
    this.lives = 0
    this.gameOverString = ''
    this.isGameOver = true;
    this.cheevosSet = cheevosSet
    this.cheevosMap = cheevosSet.cheevos.map((c) => {
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
      }
      return {
        title: c.title,
        message: c.description,
        isPopped: hasPopped,
        check: checkFn,
        cheevoId: c._id
      }
    })
  }

  getGameOver() {
    const gameOver1 = screenRamLetter(GAME_OVER_1, this, 0)
    const gameOver2 = screenRamLetter(GAME_OVER_2, this, 0)
    const gameOver3 = screenRamLetter(GAME_OVER_3, this, 0)
    const gameOver4 = screenRamLetter(GAME_OVER_4, this, 0)
    const gameOver5 = screenRamLetter(GAME_OVER_5, this, 0)
    const gameOver6 = screenRamLetter(GAME_OVER_6, this, 0)
    const gameOver7 = screenRamLetter(GAME_OVER_7, this, 0)
    const gameOver8 = screenRamLetter(GAME_OVER_8, this, 0)
    // console.log('PottyPigeon::getGameOver', gameOver1, gameOver2, gameOver3, gameOver4, gameOver5, gameOver6, gameOver7, gameOver8)
    return gameOver1 + gameOver2 + gameOver3 + gameOver4 + gameOver5 + gameOver6 + gameOver7 + gameOver8
  }

  getScore() {
    const score1 = screenRamDigit(MEM_SCORE_1, this)
    const score2 = screenRamDigit(MEM_SCORE_2, this)
    const score3 = screenRamDigit(MEM_SCORE_3, this)
    const score4 = screenRamDigit(MEM_SCORE_4, this)
    const score5 = screenRamDigit(MEM_SCORE_5, this)
    const score6 = screenRamDigit(MEM_SCORE_6, this)
    // console.log('PottyPigeon::getScore', parseInt(score1 + score2 + score3 + score4 + score5 + score6, 10))
    return parseInt(score1 + score2 + score3 + score4 + score5 + score6)
  }

  getLives() {
    const lives1 = screenRamDigit(MEM_LIVES_1, this)
    return parseInt(lives1, 10);
  }

  debug(mem, log) {
    console.log('Tilt::Debug', log, this.cpuReadNS(mem).toString(16))
  }

  execute = () => {
    if (this.isGameOver && this.lives === 2) {
      console.log('PottyPigeon::NewGame!', this.lives, this.score)
      this.isGameOver = false
      this.gameOverString = ''
    }

    const currentScore = this.getScore()
    if (currentScore !== this.score) {
      console.log('PottyPigeon::ScoreChange! score=', currentScore, this.score)
      this.score = currentScore
    }

    const lives = this.getLives()
    if (lives !== this.lives) {
      console.log('PottyPigeon::LivesChange! lives=', lives, this.lives)
      this.lives = lives
    }

    const gameOverString = this.getGameOver()
    if (gameOverString !== this.gameOverString) {
      console.log('PottyPigeon::GameOverStringChange! gameOverString=', gameOverString)
      this.gameOverString = gameOverString
      if (!this.isGameOver && this.gameOverString === 'gameover') {
        this.isGameOver = true
        console.log('PottyPigeon::GameOver! score=', currentScore, this.score)
        this.isGameOver = true
        this.postScore(
          this.gameId,
          this.score,
          this.user.id,
          this.user.username
        ).then(res => {
          console.log('Score posted successfully', res)
          this.watcher.dispatch('cheevo', {
            title: `Score Submit Success`,
            message: `Your score of ${this.score} has been submitted to the Potty Pigeon Leaderboard!`
          })

          this.watcher.dispatch('gameOver', {
            score: this.score
          })
        })
      }
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
    const res =
      await this._popCheevo(
        this.cheevosSet._id,
        this.user.id,
        cId)
    console.log('res popCheevo', res)
    this.watcher.dispatch('cheevo', {
      title: res.achievement.title,
      message: res.achievement.description,
      thumbnailUrl: res.thumbnailUrl
    })
  }

}

export default PottyPigeon
