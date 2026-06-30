# Forbidden Forest C64 Memory Dump Notes

The score values in the dumps suggest `in-game2` is likely 2000 points rather than 1000 points. This is based on both
the packed score bytes and the visible screen RAM score digit.

## Memory Map Candidates

| Purpose                                 |       Address |  Confidence | Notes                                                                                                                      |
|-----------------------------------------|--------------:|------------:|----------------------------------------------------------------------------------------------------------------------------|
| Score                                   | `$002A-$002D` |        High | Packed BCD-style score, low-to-high byte order.                                                                            |
| Score thousands / coarse score progress |       `$0041` | Medium-high | Values match visible thousands digit/progression: `00`, `02`, `03`, `04`.                                                  |
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

## Score-Related Evidence

The zero-page score/progress candidate `$0041` tracks the visible thousands digit:

```text
titles:   $0041 = 00
in-game1: $0041 = 00
in-game2: $0041 = 02
in-game3: $0041 = 03
in-game4: $0041 = 04
```

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
