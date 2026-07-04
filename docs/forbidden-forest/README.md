# Forbidden Forest C64 Memory Dump Notes

Investigating Forbidden Forest memory addresses for high-score detection and C64Cade integration.


## Gameplay

- 4 skill modes named: "Innocent", "Trooper", "Daredevil" and "Crazy", the user selects starting difficulty at the
title screen.
- 1 loop consists of defeating 7 enemy waves, where the player must defeat a number of one enemy type before moving to the next
enemy.  The number of enemies required to proceed is dependent on skill mode. (see "Scoring / Kill requirements Table" below).
- The final enemy is the Demogorgon, which must be defeated once on all skill levels.
- Once defeated the game loops to the first enemy type on the next highest difficulty. 
- If the player is already on the hardest difficulty "Crazy", then defeats the Demogorgon, I believe the game loops back to
Spiders on "Innocent" and the game therefore loops forever.
- The game features a day night cycle, which causes the forest to get darker until almost completely black when night falls.
- The player has 50 arrows which on Innocent and Trooper difficulty are refilled each new enemy wave. On Daredevil the players
arrows are only refilled twice in 1 loop (not sure when), and on Crazy arrows are refilled only once. Consuming all 50 arrows in 
a wave will lead to game over.
- The player starts with 3 lives and each wave their lives are reset to 3. (Unsure if higher difficulties change this logic).

## Scoring / Kill requirements Table:

| Enemy                   | Points per kill |  Innocent |  Trooper |  Daredevil  | Crazy   |
|-------------------------|-----------------|-----------|----------|-------------|---------|
| Spiders                 | 1000            | 4         | 8        | 12          | 16      |
| Bees                    | 2000            | 1         | 2        | 3           | 4       |
| Frogs                   | 500             | 6         | 12       | 16          | 20      |
| Dragons                 | 4000            | 1         | 1        | 2           | 3       |
| Phantom (+skeletons)    | 6000 (+ 1000**) | 1         | 1        | 1           | 2       |
| Snake                   | 8000            | 1         | 1        | 2           | 3       |
| Demogorgon              | 10000           | 1         | 1        | 1           | 1       |

**: When Phantom appears he spawns a skeleton. Killing the skeleton will cause him to span another, infinitely
until the Phantom is defeated. Skeletons score 1000 points each.


## Memory Map Candidates

Notes on memory updates in game.  The value representing enemy wave baseline only updates when the final enemy of a 
wave is defeated.  This means that the current enemy kill count will never reach the value equal to the required number
of kills because it is updated to the baseline number when the final enemy each wave is defeated.  The baseline number
similarly doesn't get set until the final enemy is defeated.  This means I currently can't see in memory where the
required kills number is set.  Maybe it is derived from the game mode value.

Also the current wave identifier value is also updated immediately on the death of the final enemy. So currently
to award achievements for defeating a wave, I am checking that the current wave is equal to the next enemy wave id.

This also makes the current enemy killed calculation ($0041 - $005e) always equal 0 when the final enemy of a wave is
defeated.

This works up until the final enemy: Demogorgon, because the next wave id will be 40 when fighting the Demogorgon, but 
will wrap around to 1 immediately when he's defeated. The enemy kill counter will also become 0 which means the 
win condition for Demogorgon will be the same as starting a new game if using the current logic.

| Purpose                                 |       Address |  Confidence | Notes                                                                                                                      |
|-----------------------------------------|--------------:|------------:|----------------------------------------------------------------------------------------------------------------------------|
| Score                                   | `$002A-$002D` |        High | Packed BCD-style score, low-to-high byte order.                                                                            |
| Enemy kill/progression counter          |       `$0041` |        High | Tracks cumulative wave progress. Subtract the current wave baseline at `$005E` to get kills in the active enemy wave.       |
| Arrows remaining                        |       `$0027` |        High | Starts at `50` for a fresh quiver. Arrows fired can be tracked as `startValue - currentValue`.                              |
| Current enemy type                      |       `$004E` |        High | Bit-like enemy identifiers: spiders `$01`, bees `$02`, frogs `$04`, dragons `$08`.                                          |
| Current enemy wave baseline             |       `$005E` |        High | Baseline for `$0041`; active-wave kills are `$0041 - $005E`.                                                               |
| Rendered score on screen                | `$07C3-$07CA` |        High | Screen RAM status-line score using custom digit characters. `$10 = 0`, `$11 = 1`, `$12 = 2`, etc.                          |
| Visible score thousands digit           |       `$07C7` |        High | Changes from `$10` to `$12`, `$13`, `$14` across score dumps. Rendered display only.                                       |
| Game started / in-game flag candidate   |       `$0050` |      Medium | Title has `$02`; all provided in-game dumps have `$00`. Heavily referenced by code, so may also be a state/timer variable. |
| Game started / mode flag candidate      |       `$0036` |      Medium | Title has `$15`; all provided in-game dumps have `$0C`.                                                                    |
| Player-control start state              |       `$0055` |        High | After difficulty selection this starts at `5` and counts down. Player control starts when it reaches `1`.                   |
| Lives                                   |       `$005f` |        High | Lives start at 3, and are reset after each successful battle                                                               |
| Difficulty / game mode                  |       `$0069` |        High | Values map cleanly to C64Cade game modes: `$04`, `$08`, `$0C`, `$10` => `0`, `1`, `2`, `3`.                                |
| Difficulty sanity check                 |       `$006A` |      Medium | Values increase with difficulty: `$06`, `$0B`, `$10`, `$15`. Useful as a secondary check if needed.                         |

## Score Encoding

Best score candidate:

```text
$002A-$002D = packed BCD-style score, low-to-high byte order
```

Observed values:

```text
titles:   $002A-$002D = 00 00 00 00 => 00000000
in-game1: $002A-$002D = 00 00 00 00 => 00000000
in-game2: $002A-$002D = 00 20 00 00 => 00002000
in-game3: $002A-$002D = 00 30 00 00 => 00003000
in-game4: $002A-$002D = 00 40 00 00 => 00004000
```

Interpreting the score bytes as displayed decimal digits:

```text
$002D high nibble
$002D low nibble
$002C high nibble
$002C low nibble
$002B high nibble
$002B low nibble
$002A high nibble
$002A low nibble
```

For example:

```text
$002A-$002D = 00 20 00 00

Digits:
00 00 20 00 => 00002000
```

## Enemy Kill / Wave Progress Evidence

The strongest current enemy kill/progress candidate is `$0041`. It is not a plain per-enemy kill counter; it tracks cumulative wave progress. Use `$005E` as the active wave baseline, then subtract it from `$0041`:

```js
const activeEnemyKills = mem[0x0041] - mem[0x005e];
```

`$004E` identifies the active enemy wave:

| Enemy | `$004E` | `$005E` baseline | Innocent kills required |
|-------|--------:|-----------------:|------------------------:|
| Spiders | `$01` | `0` | `4` |
| Bees | `$02` | `5` | `1` |
| Frogs | `$04` | `7` | `6` |
| Dragons | `$08` | `14` | `1` |

The kills required above are only for the easiest skill setting, `innocent`. Higher skill settings require different kill counts.

Observed active-wave kill counts from the named dumps:

| Dump | `$0041` | `$005E` | Active kills |
|------|--------:|--------:|-------------:|
| `spiders-0-kills-0-shots.bin` | `0` | `0` | `0` |
| `spiders-1-kills-1-shots.bin` | `1` | `0` | `1` |
| `spiders-2-kills-2-shots.bin` | `2` | `0` | `2` |
| `frogs-0-kills-0-shots.bin` | `7` | `7` | `0` |
| `frogs-2-kills-2-shots.bin` | `9` | `7` | `2` |
| `frogs-5-kills-5-shots.bin` | `12` | `7` | `5` |

Celebration dumps appear to be taken after transition to the next enemy wave. For example, `frogs-6-kills-celebration.bin` has `$0041 = 14`, `$005E = 14`, and `$004E = $08`, which means it has already advanced to dragons.

## Arrows Evidence

`$0027` is the best arrow counter found so far. It stores arrows remaining, not arrows fired.

For a fresh wave with a full quiver:

```js
const arrowsFired = 50 - mem[0x0027];
```

For live achievement tracking, use the value at the start of the current wave as the baseline because later wave dumps can start below `50` depending on capture timing:

```js
const arrowsFiredThisWave = waveStartArrows - mem[0x0027];
```

Spider dump evidence:

| Dump | Named shots | `$0027` arrows remaining | Arrows fired from 50 |
|------|------------:|-------------------------:|---------------------:|
| `spiders-0-kills-0-shots.bin` | `0` | `50` | `0` |
| `spiders-1-kills-1-shots.bin` | `1` | `49` | `1` |
| `spiders-2-kills-2-shots.bin` | `2` | `48` | `2` |
| `spiders-3-kills-4-shots.bin` | `4` | `46` | `4` |

Frog dumps also support `$0027` as arrows remaining, but some begin at `49` instead of `50`, likely because the snapshot was taken after an arrow load/fire state had already consumed one arrow.

## Score-Related Evidence

The visible score area on the bottom status row is at `$07C3-$07CA`:

```text
titles:   $07C3-$07CA = 10 10 10 10 10 10 10 10
in-game1: $07C3-$07CA = 10 10 10 10 10 10 10 10
in-game2: $07C3-$07CA = 10 10 10 10 12 10 10 10
in-game3: $07C3-$07CA = 10 10 10 10 13 10 10 10
in-game4: $07C3-$07CA = 10 10 10 10 14 10 10 10
```

The game appears to use custom character values for digits in screen RAM:

```text
$10 = 0
$11 = 1
$12 = 2
$13 = 3
$14 = 4
...
```

So `$07C7` is the rendered thousands digit:

```text
titles:   $07C7 = 10
in-game1: $07C7 = 10
in-game2: $07C7 = 12
in-game3: $07C7 = 13
in-game4: $07C7 = 14
```

This supports the interpretation that the later dumps are 2000, 3000, and 4000 points.

## Game Started / In-Game Flag Candidates

No single definitive game-start flag was proven, but these two addresses cleanly distinguish the provided title dump
from all provided in-game dumps:

```text
$0050:
titles:   02
in-game1: 00
in-game2: 00
in-game3: 00
in-game4: 00

$0036:
titles:   15
in-game1: 0C
in-game2: 0C
in-game3: 0C
in-game4: 0C
```

Suggested heuristic:

```js
const gameStarted = mem[0x0050] === 0x00 && mem[0x0036] === 0x0c;
```

`$0050` is referenced heavily by game code and may be a local state/timer variable rather than a pure global game-start
flag. `$0036` also looks like a state/mode value. Using both together should be safer than relying on one address.

Later testing found `$0055` is a better start gate for high-score tracking. After the player selects difficulty, lives are
set before gameplay begins. `$0055` starts at `5` during the title/cutscene state and counts down over time. Player control
starts when `$0055` reaches `1`.

The current detector starts a new tracked run only when both conditions are true:

```js
const gameStarted = mem[0x005f] > 0 && mem[0x0055] === 1;
```

## Lives

Lives are stored at `$005F`.

Observed values:

```text
difficulty-select: $005F = 00
in-game:           $005F = 03
```

The current high-score detector uses lives plus player-control state for start detection, and lives for game-over detection:

```js
const gameStarted = mem[0x005f] > 0 && mem[0x0055] === 1;
const gameOver = mem[0x005f] === 0;
```

The game appears to reset lives after each successful battle, so this should be treated as a practical high-score submission heuristic rather than a complete model of player state.

## Difficulty / Game Mode

Difficulty is not printed to screen, so the detector uses internal zero-page values.

The strongest candidate is `$0069`. It forms a clean `difficulty * 4` pattern across the four in-game difficulty dumps:

| Difficulty | In-game Name | `$0069` | C64Cade `gameMode` |
|------------|--------------|--------:|-------------------:|
| 1          | `innocent`   |   `$04` |                  0 |
| 2          | `trooper`    |   `$08` |                  1 |
| 3          | `dare devil` |   `$0C` |                  2 |
| 4          | `crazy`      |   `$10` |                  3 |

The current detector reads `$0069` when a new game starts and stores the mapped value as `gameMode`, then passes that as the fifth argument to `postScore`.

Secondary difficulty-related candidates were found in `$0068-$006F`:

| Address | Select | Difficulty 1 | Difficulty 2 | Difficulty 3 | Difficulty 4 | Notes |
|---------|-------:|-------------:|-------------:|-------------:|-------------:|-------|
| `$0068` |  `$00` |        `$7F` |        `$6A` |        `$54` |        `$40` | Monotonic decreasing; likely difficulty-derived gameplay parameter. |
| `$0069` |  `$8D` |        `$04` |        `$08` |        `$0C` |        `$10` | Primary game mode candidate. |
| `$006A` |  `$CF` |        `$06` |        `$0B` |        `$10` |        `$15` | Secondary sanity-check candidate. |
| `$006B` |  `$D0` |        `$0D` |        `$18` |        `$21` |        `$2A` | Difficulty-derived parameter. |
| `$006C` |  `$00` |        `$0F` |        `$1A` |        `$24` |        `$2E` | Difficulty-derived parameter. |
| `$006D` |  `$00` |        `$11` |        `$1C` |        `$26` |        `$31` | Difficulty-derived parameter. |
| `$006E` |  `$00` |        `$13` |        `$1E` |        `$29` |        `$35` | Difficulty-derived parameter. |
| `$006F` |  `$00` |        `$15` |        `$20` |        `$2B` |        `$37` | Difficulty-derived parameter. |

`$0069` and `$006A` may be difficulty-derived gameplay parameters rather than a literal selected-difficulty variable. They are still suitable for C64Cade score routing because they are stable immediately after game start in the captured dumps.

## Practical Recommendations

For high-score detection, use `$002A-$002D` rather than screen RAM. Screen RAM at `$07C3-$07CA` is useful for validation
but is only the rendered display.

For game-start and game-over detection, use lives plus the player-control start state:

```js
const gameStarted = mem[0x005f] > 0 && mem[0x0055] === 1;
const gameOver = mem[0x005f] === 0;
```

For C64Cade game mode routing:

```js
const gameModeMap = {
  0x04: 0, // innocent
  0x08: 1, // trooper
  0x0c: 2, // dare devil
  0x10: 3, // crazy
};

const gameMode = gameModeMap[mem[0x0069]] ?? 0;
```

For active enemy wave and kill tracking:

```js
const enemyType = mem[0x004e];
const activeEnemyKills = mem[0x0041] - mem[0x005e];

const enemyTypeMap = {
  0x01: 'spiders',
  0x02: 'bees',
  0x04: 'frogs',
  0x08: 'dragons'
};
```

For arrows fired in the current wave, capture `$0027` when the wave starts and compare future reads against that baseline:

```js
const arrowsFiredThisWave = waveStartArrows - mem[0x0027];
```

For score parsing:

```js
function readForbiddenForestScore(mem) {
  const b0 = mem[0x002a];
  const b1 = mem[0x002b];
  const b2 = mem[0x002c];
  const b3 = mem[0x002d];

  const digits = [
    b3 >> 4, b3 & 0x0f,
    b2 >> 4, b2 & 0x0f,
    b1 >> 4, b1 & 0x0f,
    b0 >> 4, b0 & 0x0f,
  ];

  return Number(digits.join(''));
}
```
