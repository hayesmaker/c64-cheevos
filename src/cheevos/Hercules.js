import signal from 'signal-js'
import {camelize} from "../helpers/string-utils.js";


class Hercules {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
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
    this.score = 0;
    this.lives = 0;
    this.isGameOver = true;
    this.isRollOverScore = false;
  }

  getScore = () => {
    const digit1 = parseInt(this.cpuReadNS(0x0045).toString(16)) - 30;
    const digit2 = parseInt(this.cpuReadNS(0x0046).toString(16)) - 30;
    const digit3 = parseInt(this.cpuReadNS(0x0047).toString(16)) - 30;
    const digit4 = parseInt(this.cpuReadNS(0x0048).toString(16)) - 30;
    const digit5 = parseInt(this.cpuReadNS(0x0049).toString(16)) - 30;
    const digit6 = parseInt(this.cpuReadNS(0x004a).toString(16)) - 30;
    const scoreString = "" + digit1 + digit2 + digit3 + digit4 + digit5 + digit6;
    const localScore = parseInt(scoreString);
    if (localScore >= 900000) {
      this.isRollOverScore = true;
    }
    if (this.isRollOverScore && localScore < this.score) {
      return parseInt("1" + scoreString);
    }
    return parseInt(scoreString);
  }

  getLives = () => {
    return parseInt(this.cpuReadNS(0x001e).toString(16));
  }

  execute = () => {
    let currentScore = this.getScore();
    if (currentScore !== this.score) {
      this.score = currentScore;
    }

    let currentLives = this.getLives();
    if (currentLives === 3 && currentLives !== this.lives) {
      console.log("New Game");
      this.isGameOver = false;
    }

    if (currentLives === 0 && this.lives === 1 && !this.isGameOver) {
      this.isGameOver = true;
      this.isRollOverScore = false;
      this.watcher.dispatch('gameOver', {
        score: this.score,
      });
      this.postScore(
        this.gameId,
        this.score,
        this.user.id,
        this.user.username
      ).then(res => {
        console.log('Score posted successfully', res);
        this.watcher.dispatch('cheevo', {
          title: `Score Submit Success`,
          message: `Your score of ${this.score} has been submitted to the Hercules Leaderboard!`
        });
      });
    }

    if (currentLives !== this.lives) {
      this.lives = currentLives;
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
    const res = await this._popCheevo(this.cheevosSet._id, this.user.id, cId);
    console.log('res popCheevo', res);
    this.watcher.dispatch('cheevo', {
      title: res.achievement.title,
      message: res.achievement.description,
      thumbnailUrl: res.thumbnailUrl,
    });
  }
}

export default Hercules
