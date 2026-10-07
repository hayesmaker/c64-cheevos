# Thrust Memory Addresses

Thrust (Firebird, 1986). Addresses come from the commented disassembly at
https://github.com/hayesmaker/thrust-c64 (`src/thrust.asm`), and apply to the
running (decrunched) program. Verified with `Thrust (J1).crt` (score and lives).

| Address | Label | Notes |
|---------|-------|-------|
| `$0180`-`$0182` | `score_A`/`B`/`C` | Score, 3 bytes BCD, lowest byte first. Eg: `50 23 01` = 012350 |
| `$9403` | `lives` | Spare lives in BCD. A new game sets 4 and immediately takes one: `03`. Losing a life at `00` wraps to `99` (game over) |
| `$9402` | `fuel_empty_flag` | Non-zero when out of fuel, which ends the game with lives left |
| `$0063` | `demo_mode_flag` | `00` in a real game, `FF` on the title / high score screens and in the demo |

An extra life is awarded every 10,000 points.

## Game flow

- **New game** (`start_new_game`, `$b049`): `demo_mode_flag` = 0, score zeroed,
  lives = 3, then `fuel_empty_flag` cleared.
- **Game over** (`game_over`, `$b2a9`): last life lost (lives = `$99`) or out of fuel.
  Goes on to high score entry, then the title screen.
- **Quit**: RUN/STOP during a game jumps to `high_score_start`, which sets
  `demo_mode_flag` back to `$FF`. The class treats this as the end of the game too.
