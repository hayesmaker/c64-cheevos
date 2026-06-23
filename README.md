# c64-cheevos

Open source Commodore 64 high-score and achievement detectors used by C64cade.

Each game class reads C64 memory through injected reader functions and emits score or achievement events. 
Host applications provide their own persistence callbacks.

## Install

```sh
npm install c64-cheevos
```

During local development you can consume it from a checkout:

```json
{
  "dependencies": {
    "c64-cheevos": "file:../c64-cheevos"
  }
}
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
cheevos.execute()
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
