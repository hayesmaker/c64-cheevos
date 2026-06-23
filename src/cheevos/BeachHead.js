import signal from 'signal-js'
import { camelize, convertMemToScoreDigits } from '../helpers/string-utils.js'

/**
 * Skill:      9600   01-04
 * Score:      9606    23
 *             9607    01
 *                     12,300
 *
 * Ships Left: 960e    00-0a
 * Ships Lost: 9612    00-0a
 * Bunker HP : 9610    00-0a
 * Tanks:      960f    00-08
 */
class BeachHead {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    console.log('Beach Head initialized', cheevosSet, gameId);
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
    this.ships = 100;
    this.tanks = 100;
    this.bunkerHp = 0;
    this.isGameOver = true;
    this.isBeachHead = false;
  }

  getSkillLevel = () => {
    return parseInt(this.cpuReadNS(0x9600).toString(16)) - 1;
  }

  getScore = () => {
    const hiByte = convertMemToScoreDigits(0x9607, this);
    const loByte = convertMemToScoreDigits(0x9606, this);
    const scoreString = "" + hiByte + loByte;
    return parseInt(scoreString) * 100;
  }

  getShips = () => {
    return parseInt(this.cpuReadNS(0x960e).toString(16), 16);
  }

  getTanks = () => {
    return parseInt(this.cpuReadNS(0x960f).toString(16), 16);
  }

  getBunkerHp = () => {
    return parseInt(this.cpuReadNS(0x9610).toString(16), 16);
  }

  gameOverCheck = () => {
    if (!this.isGameOver && this.isBeachHead && this.tanks === 0) {
      // console.log('Tanks 0')
      return true;
    }
    // console.log('this.ships', this.isGameOver, this.ships);
    return !this.isGameOver &&
      this.ships === 0;
  }

  execute = () => {
    let currentScore = this.getScore();
    if (currentScore !== this.score) {
      this.score = currentScore;
    }

    if (this.gameOverCheck()) {
      console.log("GameOver", this.score);
      this.isGameOver = true;
      this.watcher.dispatch('gameOver', {
        score: this.score,
      });
     this.postScore();
    }

    let currentShips = this.getShips();
    if (currentShips === 10 && currentShips !== this.ships) {
      this.score = 0;
      this.isGameOver = false;
      console.log("New Game", this.ships, this.tanks, this.score);
    }

    if (currentShips !== this.ships) {
      this.ships = currentShips;
      console.log('this.ships=', this.ships, this.score);
    }

    let currentTanks = this.getTanks();
    if (currentTanks !== this.tanks) {
      this.tanks = currentTanks;
      if (this.tanks > 0) {
        this.isBeachHead = true;
      }
      console.log('this.tanks=', this.tanks, this.score);
    }

    let currentBunkerHp = this.getBunkerHp();
    if (currentBunkerHp !== this.bunkerHp) {
      this.bunkerHp = currentBunkerHp;
      if (!this.isGameOver && this.bunkerHp === 0) {
        this.isGameOver = true;
        this.postScore();
      }
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
      this.user.username,
      this.getSkillLevel(),
    ).then(res => {
      console.log('Score posted successfully', res);
      this.watcher.dispatch('cheevo', {
        title: `Score Submit Success`,
        message: `Your score of ${this.score} has been submitted to the Beach-Head Leaderboard!`
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

export default BeachHead
