# Panther Memory Addresses

Panther (Mastertronic, 1986; designed and coded by Peter Adams, music by David
Whittaker). Addresses come from a disassembly of the running game in `Panther.crt`,
a StatMat Magic Desk conversion (cartridge type 19, 10 x 8K banks) of the tape
version. The cartridge loads the bitmap, colour map, data, music and code into RAM,
then runs the game with `SYS 4096`, so every address below is plain RAM. They were
checked against c64debugger memory dumps taken while loading, during play, at game
over and after a restart (`dumps/`, kept locally and git-ignored like the other
games' dumps).

| Address | Notes |
|---------|-------|
| `$0010` | Lives, plain binary. Set to 6 at the start of a run (`$3103`), 0 = game over. Shown on the panel at `$4f3f` |
| `$0026` | `01` while the main loop runs. `00` while the cartridge is loading, on the game over screen and while paused |
| `$0027` | Game over flag. Set to `01` when the last life is lost (`$383f`), cleared when fire starts the next game (`$1128`) |
| `$0044` | Altitude. Joystick down climbs (`inc`, up to `$3c`), joystick up descends (`dec`, down to 2) at `$3750` |
| `$004f` | `01` while the Panther is on the ground (altitude below 3), needed to pick up and drop off survivors |
| `$0028` | Survivors on board. Incremented when one is picked up, decremented as each is dropped off |
| `$18d7` | Points waiting to be added to the score (saturates at `$ff`) |
| `$842a`-`$8431` | Score, 8 bytes, one decimal digit (`00`-`09`) per byte, most significant first. `00 00 00 00 00 02 00 00` = 200. Shown on the panel at `$4f1f` with leading zeros blanked |
| `$8432`-`$8439` | High score, same format. Cleared at power-on (`$101f`), updated on game over (`$193d`). Not saved to the cartridge |

While the cartridge is loading, `$0010` is 0 and the score bytes hold junk
(values above 9), so neither looks like a game in progress.

## Scoring

Points are queued with `$18e6` (A = amount) and added by `$18f2` into the tens
digit (`$8430`), so the last digit is always 0 and the amounts below are A x 10.
The score in RAM is exactly the number shown on the panel.

| Call | Points | Event |
|------|--------|-------|
| `$3e69` | 100 | Enemy shot down |
| `$1e07` | 500 | Survivor picked up (`SURVIVOR RESCUED`) |
| `$1e39` | 1,500 | Survivor dropped off after landing |
| `$1202` | 40 | Awarded from the altitude / radar code at `$11d4` |

An extra life is awarded at `$1e5e` once a landing has dropped off all the
survivors on board, so lives can go up during a run.

## Game flow

- **Loading**: the cartridge shows the Mastertronic title picture while it copies
  the game into RAM. There is no title menu and no demo mode.
- **New game** (`$1044`, setup at `$305a`): the score is cleared, lives are set to
  6, and the main loop starts (`$26` = 1). The first game starts on its own about
  12 seconds after power-on. The message line shows `RESCUE MISSION ENGAGED`.
- **Lose a life** (`$3819`, called from the crash routine at `$3842`): `dec $10`.
  At 0 it sets `$27` = 1, which sends the main loop to the game over loop.
- **Game over** (`$10f9`): updates the high score (`$193d`), shows `GAME OVER`
  and cycles the high score messages until fire on joystick port 2 is pressed,
  then jumps back to `$1044` for a new game.
- **Keys** (`$36de`, scans the function key column): F1 jumps straight back to
  `$1044` and starts a new game without going through game over (the high score is
  not updated). F7 pauses (`$26` = 0 while paused). F3 and F5 are read too.
- **RESTORE**: the NMI vector points at `$1040`, which clears `$27` and falls into
  the new game setup at `$1044`. So it restarts a game in progress like F1, and
  also starts a new game from the game over screen.

Messages are `@`-terminated strings starting at `$2252`, queued by index with
`$207a` (for example 1 = `SURVIVOR RESCUED`, 2 = `PHEONIX MANUEVER COMPLETE` after
a crash, 8 = `RESCUE MISSION ENGAGED` at the start of a run).

## Dumps

Taken with c64debugger (jukebox playlist with joystick input and `DumpC64Memory`):

| File | State |
|------|-------|
| `loading-screen.bin` | Title picture while the cartridge is loading |
| `game-start-6-lives-0-score.bin` | First game just started, 6 lives, score 0 |
| `2-lives-200-score.bin` | 2 lives left, score 200 |
| `game-over-0-score.bin` | Game over loop after an idle game, score 0 |
| `second-game-5-lives-0-score.bin` | Second game after pressing fire on game over, 5 lives, score 0 |
