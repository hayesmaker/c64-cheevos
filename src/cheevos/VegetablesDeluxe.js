import signal from 'signal-js'
import { camelize, convertMemToScoreDigits } from '../helpers/string-utils.js'

const MEM_SCORE_1 = 0x51c4;
const MEM_SCORE_2 = 0x51c5;
const MEM_SCORE_3 = 0x51c6;

const GAME_MODE   = 0x08c9;
const MEM_SHUFFLES= 0x51cb;

const MEM_IN_GAME = 0x0314; // $8C in menus, $95 or $ab in game

/**
 * 0x51c4 = score1 (low 2 digits bcd)
 * 0x51c5 = score2 (med 2 digits bcd)
 * 0x51c6 = score3 (high 2 digits bcd)
 *
 * 0x08c9 = gameMode:  0 = casual / 1 = shopping / 2 = classic / 3 = countdown
 */
class VegetablesDeluxe {
  static ultimate = {
    pollIntervalMs: 250,
    memoryRanges: [
      { address: MEM_IN_GAME, length: 1, label: 'Game state' },
      { address: GAME_MODE, length: 1, label: 'Game mode' },
      { address: MEM_SCORE_1, length: 8, label: 'Score and shuffles' }
    ]
  }

  static get ultimateMemoryRanges() {
    return this.ultimate.memoryRanges
  }

  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    console.log('Vegetables Deluxe initialized', cheevosSet, gameId);
    this.gameModes = ["casual", "shopping", "classic", "countdown"];
    this._popCheevo = popCheevo;
    this._postScore = postScore
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
    this.shuffles = 0;
    this.gameMode = -1;
    this.isGameOver = true;
  }

  newGameVars() {
    this.score = 0;
    this.isGameOver = false;
    this.gameMode = this.getGameMode();
  }

  getGameMode = () => {
    return parseInt(this.cpuReadNS(GAME_MODE).toString(16), 10) - 1;
  }

  getScore = () => {
    const score3 = convertMemToScoreDigits(MEM_SCORE_3, this);
    const score2 = convertMemToScoreDigits(MEM_SCORE_2, this);
    const score1 = convertMemToScoreDigits(MEM_SCORE_1, this);
    return parseInt(score3 + score2 + score1, 10) * 100;
  }

  getShuffles = () => {
    return parseInt(this.cpuReadNS(MEM_SHUFFLES).toString(16), 16);
  }

  gameOverCheck = () => {
    // console.log('this.ships', this.isGameOver, this.ships);
    return !this.isGameOver &&
      this.shuffles === 255;
  }

  newGameCheck = () => {
    if (!this.isGameOver || this.cpuReadNS(MEM_IN_GAME) === 0x8c) {
      return false;
    }
    if (
      this.isGameOver && (
        this.cpuReadNS(MEM_IN_GAME) === 0xab ||
        this.cpuReadNS(MEM_IN_GAME) === 0x95)) {
      console.log('Starting new game score=', this.getScore());
      return true;
    }
    return false;
  }

  inMenuCheck = () => {
    return !this.isGameOver && this.cpuReadNS(MEM_IN_GAME) === 0x8c;
  }

  execute = () => {
    let currentScore = this.getScore();
    let currentShuffles = this.getShuffles();
    if (currentShuffles !== this.shuffles) {
      this.shuffles = currentShuffles;
      if (this.gameOverCheck()) {
        console.log("GameOver gameMode=%s | score=%s", this.gameMode, currentScore);
        this.isGameOver = true;
        this.watcher.dispatch('gameOver', {
          score: currentScore,
        });
        this.postScore(currentScore);
      }
      console.log('this.currentShuffles=', this.shuffles, this.score);
    }

    if (this.inMenuCheck()) {
      console.log('game reset');
      this.isGameOver = true;
    }

    if (this.newGameCheck()) {
      this.isGameOver = false;
      this.newGameVars();
      this.watcher.dispatch('newGame', {
        gameMode: this.gameMode
      });
      console.log('New Game::mode=%s (%s)', this.gameMode, this.gameModeStr());
    }

    if (!this.isGameOver && currentScore !== this.score) {
      this.score = currentScore;
    }

    this.cheevosMap.forEach(c => {
      if (!c.isPopped && c.check()) {
        c.isPopped = true;
        console.log('Pop Cheevo::',c.title, c.message);
        this.popCheevo(c.cheevoId);
      }
    });
  }

  gameModeStr() {
    switch (this.gameMode) {
      case -1: return "Casual";
      case 0: return "Shopping";
      case 1: return "Classic";
      case 2: return "Countdown";
    }
  }

  postScore(score) {
    console.log('Post Score:', score, 'gameMode:', this.gameMode, "{%s}", this.gameModeStr());
    if (this.gameMode === -1) {
      this.watcher.dispatch('cheevo', {
        title: `Casual game`,
        message: `Casual Mode has no leaderboard, Your score was: ${score}`
      });
      return;
    }

    this._postScore(
      this.gameId,
      score,
      this.user.id,
      this.user.username,
      this.gameMode,
    ).then(res => {
      console.log('Score posted successfully', res);
      this.watcher.dispatch('cheevo', {
        title: `Score Submit Success`,
        message: `Your score of ${score} has been submitted to the Vegetables ${this.gameModeStr()} Leaderboard!`
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

export default VegetablesDeluxe
