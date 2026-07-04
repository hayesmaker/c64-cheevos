# Demogorgon Party Achievement Plan

## Goal

Find a reliable `demogorgonParty` trigger that fires only when Demogorgon is defeated, not when a new game starts or when the game loop wraps back to Spiders.

The current issue in `src/cheevos/ForbiddenForest.js` is that earlier wave achievements can trigger by seeing the next wave id and `getCurrentKills() === 0`. For Demogorgon, `$004E` changes from `$40` to `$01`, which is also the Spider wave id used at the start of a game.

## Likely Detection Strategy

Track a transition, not just a static memory state:

```js
previousEnemyType === 0x40 &&
currentEnemyType === 0x01 &&
!isGameOver &&
score increased by 10000 or loop/difficulty state changed as expected
```

The dump session should prove which extra condition is safest.

## Known Relevant Addresses

| Purpose | Address | Notes |
|---------|--------:|-------|
| Current enemy type | `$004E` | Demogorgon is expected to be `$40`; Spiders are `$01`. |
| Enemy kill/progression counter | `$0041` | Cumulative wave progress. |
| Current wave baseline | `$005E` | Subtract from `$0041` to get active-wave kills. |
| Score | `$002A-$002D` | Packed BCD-style score bytes. |
| Lives | `$005F` | Current lives. |
| Player-control/start state | `$0055` | Player control starts when this reaches `1`. |
| Difficulty / game mode | `$0069` | Known values: `$04`, `$08`, `$0C`, `$10`. |
| Difficulty sanity check | `$006A` | Secondary difficulty-related value. |
| Arrows remaining | `$0027` | Useful for state notes and shot-count achievements. |

## Dump Format

Use C64Debugger full C64 memory dumps with `Ctrl+U`.

Do not use `Ctrl+Shift+U`; that dumps 1541 drive memory.

For every dump, note:

- Difficulty selected
- Enemy/wave
- Whether Demogorgon is alive, dying, defeated, celebration, or next loop
- Score shown on screen
- Lives
- Arrows remaining if visible/known
- Approximate timing, for example `immediately after killing shot`, `1 second after`, or `when player can move again`

## Primary Scenario: Innocent Demogorgon Clear

Play on `Innocent` because it has the shortest path.

Save these dumps:

| Filename | Timing | Purpose |
|----------|--------|---------|
| `ff-innocent-demogorgon-start.bin` | At the start of the Demogorgon wave, before firing. | Confirm `$004E = $40`, baseline/progress values, and score before kill. |
| `ff-innocent-demogorgon-before-final-shot.bin` | Demogorgon alive, one shot/action away from defeat if possible. | Capture stable `currently fighting final enemy` state. |
| `ff-innocent-demogorgon-hit-or-death-animation.bin` | Immediately after the killing hit, during death/celebration if possible. | Find transient flags before `$004E` wraps. |
| `ff-innocent-demogorgon-cleared-loop-start.bin` | After the game has advanced back to Spiders. | Confirm post-clear values for `$004E`, `$0041`, `$005E`, `$0069`, `$006A`, score, and lives. |
| `ff-innocent-next-loop-spiders-control.bin` | Once player control is fully restored on the next Spider wave. | Compare against a normal fresh Spider wave/new game. |

## False Positive Control: Fresh Game Start

Save these without clearing Demogorgon:

| Filename | Timing | Purpose |
|----------|--------|---------|
| `ff-innocent-new-game-before-control.bin` | After selecting Innocent, before player control starts. | Capture fresh game setup state. |
| `ff-innocent-new-game-spiders-control.bin` | First Spider wave once `$0055` should be `1`. | Distinguish post-Demogorgon wrap to Spiders from starting a brand-new game. |

## Wave Transition Control

Capture one normal wave transition that already works. Recommended sequence:

| Filename | Timing | Purpose |
|----------|--------|---------|
| `ff-innocent-snake-start.bin` | Start of Snake wave. | Confirm stable Snake wave state. |
| `ff-innocent-snake-before-kill.bin` | Snake alive, before final shot. | Capture final pre-transition state. |
| `ff-innocent-snake-cleared-demogorgon-start.bin` | After Snake is defeated and Demogorgon starts. | Compare the normal `$20 -> $40` transition against the problematic `$40 -> $01` transition. |

## Difficulty/Loop Behavior Scenario

If time allows, repeat only the Demogorgon clear sequence on `Trooper`:

- `ff-trooper-demogorgon-start.bin`
- `ff-trooper-demogorgon-before-final-shot.bin`
- `ff-trooper-demogorgon-cleared-loop-start.bin`

Purpose: confirm the same trigger works above Innocent. This matters because existing early achievements currently require `getGameMode() >= 1`, so Demogorgon behavior may need to work for all modes or only non-Innocent depending on achievement rules.

## Best Extra Scenario: Crazy Final Clear

If feasible, capture the hardest-case loop behavior:

- `ff-crazy-demogorgon-start.bin`
- `ff-crazy-demogorgon-before-final-shot.bin`
- `ff-crazy-demogorgon-cleared-loop-start.bin`

Purpose: verify whether Crazy wraps to Innocent, stays Crazy, or changes `$0069/$006A` in a way that can help or hurt detection.

## Future Analysis Checklist

For each dump, compare:

- `$004E`: does it go `$40 -> $01` immediately?
- `$0041` and `$005E`: do they reset to Spider baseline, or advance to a unique loop-complete value first?
- `$002A-$002D`: does score increase exactly `10000` at clear?
- `$0069/$006A`: does difficulty increment after Demogorgon, or stay fixed?
- `$0055`: does post-clear Spider control differ from fresh new-game Spider control?
- Nearby zero-page values around `$0040-$006F`: do any values differ between fresh start and post-Demogorgon loop?

## Expected Implementation Shape

If dumps confirm the simple transition is enough:

```js
this.previousEnemyType === ENEMIES.DEMOGORGON &&
this.cpuReadNS(CURRENT_ENEMY_TYPE) === ENEMIES.SPIDERS &&
!this.isGameOver
```

If fresh start can mimic that, add one or more guards:

```js
this.previousEnemyType === ENEMIES.DEMOGORGON &&
currentEnemyType === ENEMIES.SPIDERS &&
this.score - this.previousScore >= 10000 &&
this.cpuReadNS(MEM_GAME_START_STATE) === 1 &&
this.getLives() > 0
```

The most important dumps are the Innocent Demogorgon sequence plus the fresh new-game Spider control. Those should be enough to determine whether prior enemy tracking alone is safe or whether score/difficulty/progression guards are needed.
