import signal from 'signal-js'
import {camelize} from "../helpers/string-utils.js";

/**
 * 006A = Lives Counter (when value gets to 00, it's game over)
 * 0064 + 0065 + 0066 + 0067 + 0068 = score (1st, 2nd, 3rd, 4th, 5th digits in the score counter -- the 6th digit is always zero)
 * 006E = Level Counter (00=Level 1, 01=Level 2, 02=Level 3, etc.)
 */
class ChuckieEgg {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    console.log('Chuckie Egg initialized', cheevosSet, gameId);
    this._popCheevo = popCheevo;
    this.postScore = postScore
    this.user = user;
    this.gameId = gameId;
    this.watcher = signal();
    this.cheevosSet = cheevosSet;
    this.cheevosMap = cheevosSet.cheevos.map((c, i) => {
      const hasPopped = poppedCheevos.some((p) => {
        return p.achievement._id === c._id;
      });
      let checkFn = () => {};
      switch (camelize(c.title)) {}
      return {
        title: c.title,
        message: c.description,
        isPopped: hasPopped,
        check: checkFn,
        cheevoId: c._id,
      }
    });
    this.resetGameVars();
  }

  resetGameVars() {
    this.score = 0;
    this.lives = 0;
    this.isGameOver = true;
  }

  newGameVars() {
    this.score = 0;
    this.isGameOver = false;
  }

  getScore = () => {
    const digit1 = this.cpuReadNS(0x0064).toString(16);
    const digit2 = this.cpuReadNS(0x0065).toString(16);
    const digit3 = this.cpuReadNS(0x0066).toString(16);
    const digit4 = this.cpuReadNS(0x0067).toString(16);
    const digit5 = this.cpuReadNS(0x0068).toString(16);
    const scoreString = "" + digit1 + digit2 + digit3 + digit4 + digit5 + '0';
    return parseInt(scoreString);
  }

  getLives = () => {
    return parseInt(this.cpuReadNS(0x006A).toString(16), 16);
  }

  gameOverCheck = () => {
    // console.log('this.ships', this.isGameOver, this.ships);
    return !this.isGameOver &&
      this.lives === 0;
  }

  newGameCheck = () => {
    return this.isGameOver && this.lives === 5;
  }

  execute = () => {
    if (this.newGameCheck()) {
      console.log("New Game");
      this.isGameOver = false;
      this.newGameVars();
    }

    let currentScore = this.getScore();
    if (currentScore !== this.score) {
      this.score = currentScore;
    }

    if (this.gameOverCheck()) {
      console.log("GameOver");
      this.isGameOver = true;
      this.watcher.dispatch('gameOver', {
        score: this.score,
      });
     this.postScore();
    }

    let currentLives = this.getLives();
    if (currentLives !== this.lives) {
      this.lives = currentLives;
      console.log('this.lives=', this.lives, this.score);
    }

    this.cheevosMap.forEach(c => {
      if (!c.isPopped && c.check()) {
        c.isPopped = true;
        console.log('Pop Cheevo::',c.title, c.message);
        this.popCheevo(c.cheevoId);
      }
    });
  }

  postScore() {
    console.log('Post Score:', this.score);
    this.postScore(
      this.gameId,
      this.score,
      this.user.id,
      this.user.username
    ).then(res => {
      console.log('Score posted successfully', res);
      this.watcher.dispatch('cheevo', {
        title: `Score Submit Success`,
        message: `Your score of ${this.score} has been submitted to the Chuckie-Egg Leaderboard!`
      });
      this.resetGameVars();
    });
  }

  async popCheevo(cId) {
    const res = await this._popCheevo(this.cheevosSet._id, this.user.id, cId);
    console.log('res popCheevo', res);
    this.watcher.dispatch('cheevo', {
      title: res.achievement.title,
      message: res.achievement.description,
      thumbnailUrl: res.thumbnailUrl,
    });
  }
}

export default ChuckieEgg
