import signal from 'signal-js'
import { convertMemToScoreDigits } from '../helpers/string-utils.js'

// [0x25=game over hit self]
// [0xe2=is game over (hit wall)]
// [0x20=is in game]
const GAME_STATE_FLAG = 0x2847;
const MEM_SCORE_1 = 0x284c
const MEM_SCORE_2 = 0x284b
const MEM_SCORE_3 = 0x284a
const MEM_SCORE_4 = 0x2849

class MunchyWorm {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    console.log('MunchyWorm-v2::constructor', gameId);
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
    this.resetGameVars();
  }

  resetGameVars() {
    this.score = 0;
    this.isGameOver = true;
  }

  newGameVars() {
    this.isGameOver = false;
    this.score = this.getScore();
    console.log('Start New Game', this.score);
  }

  getScore() {
    const score1 = convertMemToScoreDigits(MEM_SCORE_1, this);
    const score2 = convertMemToScoreDigits(MEM_SCORE_2, this);
    const score3 = convertMemToScoreDigits(MEM_SCORE_3, this);
    const score4 = convertMemToScoreDigits(MEM_SCORE_4, this);
    return parseInt(score1 + score2 + score3 + score4, 10);
  }

  getIsDead() {
    console.log('getIsDead GAME_STATE_FLAG', this.cpuReadNS(GAME_STATE_FLAG));
    const flag_value = this.cpuReadNS(GAME_STATE_FLAG);
    return flag_value === 226 || (flag_value >= 36 && flag_value <= 49);
  }

  newGameCheck() {
     return this.cpuReadNS(GAME_STATE_FLAG) === 32;
  }

  execute () {
    const currentScore = this.getScore();
    if (currentScore !== this.score) {
      this.score = currentScore;
      console.log('MunchyWorm.score=', this.score);
    }

    if (this.isGameOver && this.newGameCheck()) {
      this.newGameVars();
    }

    if (!this.isGameOver && this.getIsDead()) {
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
          message: `Your score of ${this.score} has been submitted to the Munchy Worm Leaderboard!`
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

export default MunchyWorm
