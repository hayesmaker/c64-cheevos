# Forbidden Forest C64 Memory Dump Notes

Best-effort memory address guesses from comparing these 64 KiB save-state memory dumps:

- `forbidden-forest_mem-titles.bin`: title screen
- `forbidden-forest_mem-in-game1.bin`: in game, 0 points, max lives
- `forbidden-forest_mem-in-game2.bin`: in game, observed as 2000 points
- `forbidden-forest_mem-in-game3.bin`: in game, observed as 3000 points
- `forbidden-forest_mem-in-game4.bin`: in game, observed as 4000 points

The score values in the dumps suggest `in-game2` is likely 2000 points rather than 1000 points. This is based on both the packed score bytes and the visible screen RAM score digit.

## Memory Map Candidates

| Purpose | Address | Confidence | Notes |
|---|---:|---:|---|
| Score | `$002A-$002D` | High | Packed BCD-style score, low-to-high byte order. |
| Score thousands / coarse score progress | `$0041` | Medium-high | Values match visible thousands digit/progression: `00`, `02`, `03`, `04`. |
| Rendered score on screen | `$07C3-$07CA` | High | Screen RAM status-line score using custom digit characters. `$10 = 0`, `$11 = 1`, `$12 = 2`, etc. |
| Visible score thousands digit | `$07C7` | High | Changes from `$10` to `$12`, `$13`, `$14` across score dumps. Rendered display only. |
| Game started / in-game flag candidate | `$0050` | Medium | Title has `$02`; all provided in-game dumps have `$00`. Heavily referenced by code, so may also be a state/timer variable. |
| Game started / mode flag candidate | `$0036` | Medium | Title has `$15`; all provided in-game dumps have `$0C`. |
| Lives | Unknown | Low | No provided dump appears to vary lives, so lives cannot be isolated confidently. |

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

No single definitive game-start flag was proven, but these two addresses cleanly distinguish the provided title dump from all provided in-game dumps:

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

`$0050` is referenced heavily by game code and may be a local state/timer variable rather than a pure global game-start flag. `$0036` also looks like a state/mode value. Using both together should be safer than relying on one address.

## Lives

Lives could not be isolated from these dumps. All in-game dumps were described as max lives, and none clearly varies only with lives.

To identify lives confidently, capture at least one additional dump after losing exactly one life. Ideally capture:

```text
same level/scene
same or near-same score
one fewer life
```

Then compare it against `forbidden-forest_mem-in-game1.bin` or another close baseline.

## Practical Recommendations

For high-score detection, use `$002A-$002D` rather than screen RAM. Screen RAM at `$07C3-$07CA` is useful for validation but is only the rendered display.

For game-start detection, start with:

```js
const gameStarted = mem[0x0050] === 0x00 && mem[0x0036] === 0x0c;
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
