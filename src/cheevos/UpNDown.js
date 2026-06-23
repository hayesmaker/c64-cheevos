import signal from 'signal-js'
import { convertMemToScoreDigits } from '../helpers/string-utils.js'

const MEM_LIVES = 0x020e;

const MEM_SCORE_1 = 0x0200;
const MEM_SCORE_2 = 0x0201;
const MEM_SCORE_3 = 0x0202;
const MEM_SCORE_4 = 0x0203;

// const MEM_PLAYER_HIT = 0x4b4a;  //0 = is alive : 6 = player hit
// const GAME_OVER_FLAG = 0x4b23;  //0 is game over screen
// const MEM_RESET = 0x4b0b;
const MEM_ATTRACT_MODE = 0x023c // 0 not in attract mode, $80 in attract mode

const GAME_TITLE = `Up 'n' Down`

class UpNDown {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    console.log('%s :: constructor', GAME_TITLE, gameId, cheevosSet);
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
      return {
        title: c.title,
        message: c.description,
        isPopped: hasPopped,
        check: checkFn,
        cheevoId: c._id,
      }
    });
    this.isGameOver = true;
    this.score = 0;
    this.lives = 0;
  }

  newGameVars() {
    this.isGameOver = false;
    this.score = this.getScore();
    this.lives = this.getLives();
    console.log('Start New Game of %s', GAME_TITLE, this.score, this.lives);
  }

  getScore() {
    const score1 = convertMemToScoreDigits(MEM_SCORE_1, this);
    const score2 = convertMemToScoreDigits(MEM_SCORE_2, this);
    const score3 = convertMemToScoreDigits(MEM_SCORE_3, this);
    const score4 = convertMemToScoreDigits(MEM_SCORE_4, this);
    return parseInt(score1 + score2 + score3 + score4)
  }

  getIsAttractMode() {
    return (this.cpuReadNS(MEM_ATTRACT_MODE) & 0x80) !== 0;
  }

  getLives() {
    return this.cpuReadNS(MEM_LIVES);
  }


  execute () {
    if (this.isGameOver && !this.getIsAttractMode() && this.getLives() === 4) {
      this.newGameVars();
      // this.isGameOver = false;
    }

    if (this.getIsAttractMode()) {
      // console.log('%s :: attract mode, skipping cheevo checks', GAME_TITLE);
      return
    }

    const currentScore = this.getScore();
    if (currentScore !== this.score && !this.isGameOver) {
      this.score = currentScore;
      console.log('%s.score=', GAME_TITLE, this.score);
    }

    const currentLives = this.getLives();
    if (currentLives !== this.lives && !this.getIsAttractMode()) {
      this.lives = currentLives;
      console.log('%s.lives=', GAME_TITLE, this.lives);
    }

    if (currentLives === 255 && !this.getIsAttractMode() && !this.isGameOver) {
      this.isGameOver = true;
      this.watcher.dispatch('gameOver', {
        score: this.score,
      });
      this.postScore(
        this.gameId,
        this.score,
        this.user.id,
        this.user.username,
      ).then(res => {
        console.log('Score posted successfully', res);

        this.watcher.dispatch('cheevo', {
          title: `Score Submit Success`,
          message: `Your score of ${this.score} has been submitted to the ${GAME_TITLE} Leaderboard!`
        });
      });
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

export default UpNDown
