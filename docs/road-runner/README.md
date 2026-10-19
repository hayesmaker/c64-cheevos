# Road Runner Memory Addresses

Road Runner (US Gold, 1987; programmed by Canvas). Addresses come from a disassembly
of the running game in `road-runner.crt` (an EasyFlash conversion, title string
`Road Runner $olo1870`), and were checked against c64debugger memory dumps taken
on the title screen, during play and at game over (`dumps/`, kept locally and
git-ignored like the other games' dumps).

| Address | Notes |
|---------|-------|
| `$006b`-`$0072` | Score, 8 bytes, one decimal digit (`00`-`09`) per byte, most significant first. `00 00 00 00 00 00 07 00` = 70. All 9 bytes `$6b`-`$73` are cleared at the start of a game |
| `$00b5` | Lives, plain binary. 5 at the start, 0 = game over. Capped at 98 |
| `$00eb` | `00` while the play screen raster split is running. `FF` on the title and game-over screens (it can also be `FF` briefly during some screen changes mid-game) |
| `$8096` | Demo flag. Non-zero (`02`) after power-on until the first title cycle ends or fire is pressed. While it is set, points are not added (`$ba7e`) and fire restarts the game |
| `$81e7`-`$81ee` | High score, same 8-digit format as the score. Shown at the top of the title screen |

Screen RAM is at `$4000`. Digits use chars `$21`-`$2a` (`0`-`9`). In play the score
is printed at `$400b` with leading zeros blanked, and `LIVES:` at `$4002`.

## Scoring

- Points are added by `$ba7e` (A = amount, X = digit position - 2).
- A pile of birdseed is worth 10 points.
- Extra life: when a carry into the ten thousands digit (`$006e`) makes it 3, 6 or 9.
  So at 30,000, 60,000 and 90,000, then 130,000, 160,000, and so on.

## Game flow

- **Title**: the title sequence resets lives to 5 and the score to 0, so those
  two alone don't mean a game has started. Wait for `$eb` = 0 as well.
  The title loops through the credits and copyright screens. No demo game plays.
- **New game** (`$8660`): the score is cleared, lives are set to 5, and the play
  screen comes up (`$eb` = 0). Fire on joystick port 2 starts the game, sometimes
  only on the second press.
- **Lose a life** (`$a8e4`): `dec $b5`. At 0 it jumps to the game-over screen
  (`$aab9`), which checks for a new high score (`$cfaf`).
- **High score save**: `$045a` copies the score to `$81e7` and writes it to the
  cartridge's flash, so the high score survives a power cycle. Pressing `R` on the
  boot screen resets it.

## Dumps

Taken with c64debugger (jukebox playlist with joystick input and `DumpC64Memory`):

| File | State |
|------|-------|
| `title-screen.bin` | Title screen after 150 seconds with no input |
| `game-start-5-lives-0-score.bin` | Play screen up, 5 lives, score 0 |
| `1-life-70-score.bin` | 1 life left, score 70 |
| `game-over-70-score.bin` | Game over screen after the last life, score 70 |
| `second-game-2-lives-100-score.bin` | Second game after returning to the title, 2 lives, score 100 |
