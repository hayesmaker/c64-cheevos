# c64-cheevos

Open source Commodore 64 games achievements and high scores tracking.

Contributions welcome from C64 game devs who would like to add their games to C64Cade. Or from 
anyone who would like to see their favourite game added to C64Cade.  C64Cade lets players play
C64 games with global high score leaderboards and achievements.

Ultimately I hope that one day the emulator devs will pull their thumbs out and add
support for RetroAchievements.  The game achievements already added here could then be used 
 in C64 RetroAchievements.

For a guide in adding support for your game to the repo follow the Documentation here: 
[Writing game class files](docs/game-class-guide.md)

The usage guide below is for those wishing to use C64-cheevos in their own projects.

## Game Support

| Game | Detector ID | High Scores | Achievements |
| --- | --- | --- | --- |
| Beach Head | `beach-head` | [x] | [ ] |
| Chuckie Egg | `chuckie-egg` | [x] | [ ] |
| Forbidden Forest | `forbidden-forest` | [ ] | [ ] |
| Galaga | `galaga` | [x] | [ ] |
| Gribbly's Day Out | `gribbly` | [x] | [ ] |
| Hercules | `hercules` | [x] | [ ] |
| Legend of Wilf | `legend-of-wilf` | [x] | [ ] |
| Mario's Cement Factory | `mario-cf` | [x] | [x] |
| Mole Attack | `mole-attack` | [x] | [ ] |
| Munchy Worm | `munchy-worm` | [x] | [ ] |
| Park Patrol | `park-patrol` | [x] | [ ] |
| Potty Pigeon | `potty-pigeon` | [x] | [ ] |
| Stix | `stix` | [x] | [ ] |
| Tilt | `tilt` | [x] | [ ] |
| Up 'n Down | `up-n-down` | [x] | [ ] |
| Uridium | `uridium` | [x] | [x] |
| Vegetables Deluxe | `vegetables-deluxe` | [x] | [ ] |

## Install

```sh
npm install c64-cheevos
```

## Usage

```js
import { Uridium } from 'c64-cheevos'

const cheevos = new Uridium({
  gameId: 'game-id',
  user: { id: 'user-id', username: 'player' },
  cheevosSet,
  poppedCheevos: [],
  postScore: async (gameId, score, userId, username, variant) => {},
  popCheevo: async (cheevosSetId, userId, cheevoId) => ({
    achievement: { title: 'Achievement', description: 'Unlocked' }
  })
})

cheevos.cpuReadNS = (addr) => emulator.cpuReadNS(addr)
cheevos.ramRead = (addr) => emulator.ramRead(addr)

// Call execute in a RAF loop to check current RAM for achievements and score / lives / game over updates:
function update () {
   cheevos.execute();
   requestAnimationFrame(update);
};

requestAnimationFrame(update);
```

## API Contract

Game classes accept these options:

- `gameId`: Host application game ID.
- `user`: Current player object with `id` and `username` when scores are submitted.
- `cheevosSet`: Achievement set object with `_id` and `cheevos` array.
- `poppedCheevos`: Previously unlocked achievements.
- `postScore`: Host callback for score persistence.
- `popCheevo`: Host callback for achievement persistence.

After constructing a class, attach memory-reader methods before calling `execute()`:

- `cpuReadNS(addr)`
- `cpuRead(addr)` where needed
- `ramRead(addr)` where needed

Events are emitted through each instance's `watcher` from `signal-js`.

## Registry Factory

Host applications can avoid their own game switch statements by using `createCheevos`:

```js
import { createCheevos } from 'c64-cheevos'

const id = 'uridium'
const cheevos = await createCheevos(id, options)
```

Registered detector IDs include values such as `uridium`, `mario-cf`, `tilt`, and `galaga`. Unknown IDs return `CheevoTemplate`.

## Documentation

- [Writing game class files](docs/game-class-guide.md)
