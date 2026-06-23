import signal from 'signal-js';
import { camelize, convertMemToScoreDigits } from '../helpers/string-utils.js'

const MEM_IN_GAME = 0x8d42;     // 0 in title screen, 1 in game (includes demo mode);
const MEM_SCORE_1 = 0xcf47;
const MEM_SCORE_2 = 0xcf48;
const MEM_SCORE_3 = 0xcf49;
const MEM_MAIN_LEVEL = 0xcf3b;  // increments each loop of 4
const MEM_SUB_LEVEL = 0xcf2d;   // 0-3 (reaches 4 but cycles back to 0 when scrolling back)
const MEM_NEW_BALL = 0xcf7a;    // usually 0, 1 is set when ball is about to respawn, including on game over. Stays 0 in demo mode.
const MEM_POWER = 0xcfb2;       // 0 when out of power, 48($30) when full power
const MEM_HAS_POWER = 0xcfb5;   // 0 when out of power, 1 when has some power

class Tilt {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    console.log('Tilt::constructor', gameId, cheevosSet);
    this._popCheevo = popCheevo;
    this.postScore = postScore
    this.watcher = signal();
    this.cheevos = [];
    this.user = user;
    this.gameId = gameId;
    this.score = 0;
    this.power = 0;
    this.isGameOver = true;
    this.cheevosSet = cheevosSet;
    this.cheevosMap = cheevosSet.cheevos.map((c) => {
      const hasPopped = poppedCheevos.some((p) => {
        return p.achievement._id === c._id;
      });
      let checkFn;
      switch (camelize(c.title)) {
        case "welcomeToYourNewJob":
          checkFn = () => {
            return this.score >= 100;
          }
          break;
      }
      return {
        title: c.title,
        message: c.description,
        isPopped: hasPopped,
        check: checkFn,
        cheevoId: c._id,
      }
    });
  }

  getScore() {
    const score3 = convertMemToScoreDigits(MEM_SCORE_3, this);
    const score2 = convertMemToScoreDigits(MEM_SCORE_2, this);
    const score1 = convertMemToScoreDigits(MEM_SCORE_1, this);
    return parseInt(score3 + score2 + score1, 10);
  }

  getPower () {
    return this.cpuReadNS(0xcfb2).toString(16);
  }

  newGameCheck () {
    return this.cpuReadNS(MEM_NEW_BALL).toString(16) === '0' &&
      this.cpuReadNS(MEM_POWER).toString(16) === '30' &&
      this.cpuReadNS(MEM_MAIN_LEVEL).toString(16) === '0';
  }

  gameOverCheck () {
      return this.cpuReadNS(MEM_IN_GAME).toString(16) === '0';
  };

  debug (mem, log) {
    console.log('Tilt::Debug', log, this.cpuReadNS(mem).toString(16));
  }

  execute = () => {
    if (this.isGameOver && this.newGameCheck()) {
      console.log('Tilt::NewGame!', this.score);
      this.isGameOver = false;
    }

    const currentScore = this.getScore();
    if (currentScore !== this.score) {
      this.score = currentScore;
    }

    if (!this.isGameOver && this.gameOverCheck()) {
      console.log('Tilt::GameOver! score=', currentScore, this.score);
      this.isGameOver = true;
      this.postScore(
        this.gameId,
        this.score,
        this.user.id,
        this.user.username
      ).then(res => {
        console.log('Score posted successfully', res);
        this.watcher.dispatch('cheevo', {
          title: `Score Submit Success`,
          message: `Your score of ${this.score} has been submitted to the Tilt Leaderboard!`
        });

        this.watcher.dispatch('gameOver', {
          score: this.score,
        });
      });
    }

    const currentPower = this.getPower();
    if (currentPower !== this.power) {
      this.power = currentPower;
    }

    this.cheevosMap.forEach(c => {
      if (!c.isPopped && c.check()) {
        c.isPopped = true;
        console.log('Pop Cheevo::',c.title, c.message);
        this.popCheevo(c.cheevoId);
      }
    });
  }

  async popCheevo(cId) {
    const res =
      await this._popCheevo(
        this.cheevosSet._id,
        this.user.id,
        cId);
    console.log('res popCheevo', res);
    this.watcher.dispatch('cheevo', {
      title: res.achievement.title,
      message: res.achievement.description,
      thumbnailUrl: res.thumbnailUrl,
    });
  }

}

export default Tilt;
