# Writing Game Class Files

Game classes live in `src/cheevos` and are responsible for polling C64 memory, tracking game state, submitting final scores, and popping achievements. Each class exposes an `execute()` method that the host calls repeatedly while the emulator is running.

Use `src/cheevos/CheevoTemplate.js` as the starting point for a new class, then copy proven patterns from games with similar memory layouts.

## Class Shape

A game class should accept the standard constructor options and keep the public shape consistent with the existing classes:

```js
import signal from 'signal-js'
import { camelize, convertMemToScoreDigits } from '../helpers/string-utils.js'

class ExampleGame {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    this._popCheevo = popCheevo
    this.postScore = postScore
    this.gameId = gameId
    this.user = user
    this.watcher = signal()
    this.cheevosSet = cheevosSet
    this.cheevosMap = this.buildCheevosMap(cheevosSet.cheevos, poppedCheevos)
    this.resetGameVars()
  }
}
```

The host application injects memory readers after construction:

```js
cheevos.cpuReadNS = (addr) => emulator.cpuReadNS(addr)
cheevos.cpuRead = (addr) => emulator.cpuRead(addr)
cheevos.ramRead = (addr) => emulator.ramRead(addr)
```

Only use the readers that the class needs. Most classes use `cpuReadNS`; some games require `cpuRead` or `ramRead`.

## State Fields

Track only the state needed to detect transitions cleanly:

```js
resetGameVars() {
  this.score = 0
  this.highScore = 0
  this.lives = 0
  this.isGameOver = true
}

newGameVars() {
  this.isGameOver = false
  this.score = this.getScore()
  this.lives = this.getLives()
}
```

`this.isGameOver` is important. It prevents duplicate score submissions and lets the class tell the difference between a title screen, a demo loop, a new game, and the final game-over transition.

## Score And High Score

Start by finding where the game stores or renders the score. Common patterns are:

- Packed or BCD-like score bytes read with `convertMemToScoreDigits`.
- Screen RAM digits read with `screenRamDigit`.
- ASCII-like screen bytes that need game-specific conversion.

Example score reader:

```js
const MEM_SCORE_1 = 0x0200
const MEM_SCORE_2 = 0x0201
const MEM_SCORE_3 = 0x0202
const MEM_SCORE_4 = 0x0203

getScore() {
  const score1 = convertMemToScoreDigits(MEM_SCORE_1, this)
  const score2 = convertMemToScoreDigits(MEM_SCORE_2, this)
  const score3 = convertMemToScoreDigits(MEM_SCORE_3, this)
  const score4 = convertMemToScoreDigits(MEM_SCORE_4, this)
  return parseInt(score1 + score2 + score3 + score4, 10)
}
```

Update `this.score` inside `execute()` while a real game is active:

```js
const currentScore = this.getScore()
if (!this.isGameOver && currentScore !== this.score) {
  this.score = currentScore
}
```

If the game exposes a separate high-score value, add a `getHighScore()` reader and update `this.highScore` the same way. If not, compare the final submitted score against the tracked high score at game over:

```js
const newHighScore = this.score > this.highScore ? this.score : 0
if (newHighScore) {
  this.highScore = this.score
}

this.watcher.dispatch('gameOver', {
  score: this.score,
  highScore: newHighScore
})
```

Use `0` for `highScore` when the run did not beat the previous high score. `Uridium` uses this payload shape.

## Lives Events

Lives are usually the safest way to detect life loss and sometimes game over. Implement a focused `getLives()` method:

```js
const MEM_LIVES = 0x020e

getLives() {
  return this.cpuReadNS(MEM_LIVES)
}
```

Update lives after score/new-game checks:

```js
const currentLives = this.getLives()
if (currentLives !== this.lives) {
  const lostLife = currentLives < this.lives
  this.lives = currentLives

  this.watcher.dispatch('livesChange', {
    lives: this.lives
  })
}
```

Dispatch `livesChange` when the host UI needs live updates. If no UI consumes life changes, it is fine to track `this.lives` without dispatching the event.

Be careful with sentinel values. Some games use `0` for game over; others wrap to values such as `255`. Verify the memory value in gameplay, title screen, demo mode, and game-over screen.

## New Game Detection

New game detection should only fire when the previous state is game over:

```js
newGameCheck() {
  return this.isGameOver && !this.getIsAttractMode() && this.getLives() === 4
}
```

Good new-game signals include:

- Initial lives count changing from title/game-over state to the starting value.
- Attract mode flag clearing.
- Level, power, timer, or player state resetting to the first-run values.
- Score resetting while the game is definitely not in demo mode.

When a new game starts, reset transient counters and seed score/lives from current memory:

```js
if (this.newGameCheck()) {
  this.newGameVars()
}
```

Do not pop achievements or post scores from a new-game transition. It should only prepare the class to track the run.

## Game Over Events

Game over detection should fire once per run. Common checks are:

- Lives reaching `0` while `!this.isGameOver`.
- Lives reaching a sentinel value such as `255`.
- A game-state byte returning to title mode.
- Screen RAM spelling `gameover`.

Example game-over flow:

```js
gameOverCheck() {
  return !this.isGameOver && this.getLives() === 0
}

execute() {
  if (this.newGameCheck()) {
    this.newGameVars()
  }

  const currentScore = this.getScore()
  if (!this.isGameOver && currentScore !== this.score) {
    this.score = currentScore
  }

  const currentLives = this.getLives()
  if (currentLives !== this.lives) {
    this.lives = currentLives
  }

  if (this.gameOverCheck()) {
    this.isGameOver = true
    this.watcher.dispatch('gameOver', {
      score: this.score
    })

    this.postScore(
      this.gameId,
      this.score,
      this.user.id,
      this.user.username
    ).then(() => {
      this.watcher.dispatch('cheevo', {
        title: 'Score Submit Success',
        message: `Your score of ${this.score} has been submitted to the Example Game Leaderboard!`
      })
    })
  }

  this.checkCheevos()
}
```

If the game has variants, pass the variant as the fifth argument to `postScore`.

## Achievement Events

Achievements are supplied by the host through `cheevosSet.cheevos`. Build `cheevosMap` once in the constructor and use `poppedCheevos` to avoid duplicate unlocks:

```js
buildCheevosMap(cheevos, poppedCheevos) {
  return cheevos.map((c) => {
    const hasPopped = poppedCheevos.some((p) => {
      return p.achievement._id === c._id
    })

    let checkFn = () => false

    switch (camelize(c.title)) {
      case 'novicePilot':
        checkFn = () => this.score >= 10000
        break
      case 'firstLevelClear':
        checkFn = () => this.getLevel() === 2
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
```

Run achievement checks once per `execute()` after the latest score, lives, level, and game-state values have been captured:

```js
checkCheevos() {
  this.cheevosMap.forEach((c) => {
    if (!c.isPopped && c.check()) {
      c.isPopped = true
      this.popCheevo(c.cheevoId)
    }
  })
}
```

`popCheevo` persists the unlock through the host callback and dispatches the UI event:

```js
async popCheevo(cId) {
  const res = await this._popCheevo(this.cheevosSet._id, this.user.id, cId)
  this.watcher.dispatch('cheevo', {
    title: res.achievement.title,
    message: res.achievement.description,
    thumbnailUrl: res.thumbnailUrl
  })
}
```

Achievement checks should be precise transitions or stable thresholds. Avoid checks that stay true during title screens or demo mode unless the achievement is intentionally allowed outside live play.

## Full Skeleton

```js
import signal from 'signal-js'
import { camelize, convertMemToScoreDigits } from '../helpers/string-utils.js'

const GAME_TITLE = 'Example Game'
const MEM_LIVES = 0x020e
const MEM_SCORE_1 = 0x0200
const MEM_SCORE_2 = 0x0201
const MEM_SCORE_3 = 0x0202
const MEM_SCORE_4 = 0x0203
const MEM_ATTRACT_MODE = 0x023c

class ExampleGame {
  constructor({ gameId, user, cheevosSet = { cheevos: [] }, poppedCheevos = [], popCheevo = async () => {}, postScore = async () => ({}) }) {
    this._popCheevo = popCheevo
    this.postScore = postScore
    this.user = user
    this.gameId = gameId
    this.watcher = signal()
    this.cheevosSet = cheevosSet
    this.cheevosMap = this.buildCheevosMap(cheevosSet.cheevos, poppedCheevos)
    this.resetGameVars()
  }

  resetGameVars() {
    this.score = 0
    this.highScore = 0
    this.lives = 0
    this.isGameOver = true
  }

  newGameVars() {
    this.isGameOver = false
    this.score = this.getScore()
    this.lives = this.getLives()
  }

  getScore() {
    const score1 = convertMemToScoreDigits(MEM_SCORE_1, this)
    const score2 = convertMemToScoreDigits(MEM_SCORE_2, this)
    const score3 = convertMemToScoreDigits(MEM_SCORE_3, this)
    const score4 = convertMemToScoreDigits(MEM_SCORE_4, this)
    return parseInt(score1 + score2 + score3 + score4, 10)
  }

  getLives() {
    return this.cpuReadNS(MEM_LIVES)
  }

  getIsAttractMode() {
    return (this.cpuReadNS(MEM_ATTRACT_MODE) & 0x80) !== 0
  }

  newGameCheck() {
    return this.isGameOver && !this.getIsAttractMode() && this.getLives() === 4
  }

  gameOverCheck() {
    return !this.isGameOver && this.getLives() === 0
  }

  execute() {
    if (this.newGameCheck()) {
      this.newGameVars()
    }

    if (this.getIsAttractMode()) {
      return
    }

    const currentScore = this.getScore()
    if (!this.isGameOver && currentScore !== this.score) {
      this.score = currentScore
    }

    const currentLives = this.getLives()
    if (currentLives !== this.lives) {
      this.lives = currentLives
      this.watcher.dispatch('livesChange', { lives: this.lives })
    }

    if (this.gameOverCheck()) {
      this.isGameOver = true
      const newHighScore = this.score > this.highScore ? this.score : 0
      if (newHighScore) {
        this.highScore = this.score
      }

      this.watcher.dispatch('gameOver', {
        score: this.score,
        highScore: newHighScore
      })

      this.postScore(this.gameId, this.score, this.user.id, this.user.username).then(() => {
        this.watcher.dispatch('cheevo', {
          title: 'Score Submit Success',
          message: `Your score of ${this.score} has been submitted to the ${GAME_TITLE} Leaderboard!`
        })
      })
    }

    this.checkCheevos()
  }

  buildCheevosMap(cheevos, poppedCheevos) {
    return cheevos.map((c) => {
      const hasPopped = poppedCheevos.some((p) => p.achievement._id === c._id)
      let checkFn = () => false

      switch (camelize(c.title)) {
        case 'score10000':
          checkFn = () => this.score >= 10000
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

  checkCheevos() {
    this.cheevosMap.forEach((c) => {
      if (!c.isPopped && c.check()) {
        c.isPopped = true
        this.popCheevo(c.cheevoId)
      }
    })
  }

  async popCheevo(cId) {
    const res = await this._popCheevo(this.cheevosSet._id, this.user.id, cId)
    this.watcher.dispatch('cheevo', {
      title: res.achievement.title,
      message: res.achievement.description,
      thumbnailUrl: res.thumbnailUrl
    })
  }
}

export default ExampleGame
```

## Checklist

- Add the class to `src/cheevos`.
- Export it from `src/index.js`.
- Define constants for every memory address used by the class.
- Implement `getScore()`, `getLives()`, `newGameCheck()`, and `gameOverCheck()`.
- Avoid score submission unless `!this.isGameOver` was true before the game-over transition.
- Dispatch `gameOver` once per run.
- Dispatch `livesChange` only if the host needs live life-count updates.
- Dispatch `cheevo` for achievement unlocks and score-submit notifications.
- Guard achievement checks against title screen and demo-mode false positives.
- Run `npm test` before committing.
