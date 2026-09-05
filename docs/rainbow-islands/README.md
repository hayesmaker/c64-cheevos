# Rainbow Islands Memory Addresses

Known C64 memory addresses for Rainbow Islands.

## Title Screen

| Address | Purpose | Notes |
| --- | --- | --- |
| `$18B3` | Credits | Stored as `$40 + credit_count`. For example, `$40` = 0 credits, `$41` = 1 credit, `$45` = 5 credits. |
| `$C3E6` | Displayed credits | Screen/display mirror of `$18B3`; use `$18B3` for game state. |

## In Game

| Address       | Purpose                | Notes                                                                                                                                                                                                                                                                                    |
|---------------|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `$115B-$115E` | Player score           | Stored as decimal pairs, highest decimals first. Example: `$115B=00`, `$115C=01`, `$115D=80`, `$115E=60` represents `18060`.                                                                                                                                                             |
| `$1160`       | Player lives           | `0` is the last life. `$FF` means game over.                                                                                                                                                                                                                                             |
| `$004E`       | Current powerup state  | Active current-life powerups. Bits 0-1 are red potion/rainbow count level: `0` normal, `1` one red potion/two rainbows, `2` two red potions/max three rainbows. Bit 2 `$04` is yellow potion/quick rainbows. Bit 6 `$40` is boots/faster movement. Powerups are lost on death.           |
| `$00A3`       | Collected diamonds     | Bitfield: bit 6/red `$40`, bit 5/orange `$20`, bit 4/yellow `$10`, bit 3/green `$08`, bit 2/light blue `$04`, bit 1/dark blue `$02`, bit 0/violet `$01`.                                                                                                                                 |
| `$00AD`       | Diamond order progress | Starts at `6` and decrements by `1` each time the next correct-order diamond is collected: red, orange, yellow, green, light blue, dark blue, violet. Reaches `0` after all diamonds are collected in order.                                                                             |
| `$00AE`       | Diamond order mistakes | Increments by `1` when a diamond is collected out of order. Remains `0` when all diamonds are collected in correct order.                                                                                                                                                                |
| `$009e-$009f` | Water Level            | `$009e` (Low) `$009f` (High) Normally Starts at `$00 $12` (or $fc $12 after a life lost). When Water rises Low decrements quickly and High byte decrements on each low byte rollover. Water rises as values decrement.  For achievement tracking high byte only tracking should be fine. | 
| `$0076` | Game Timer             | Starts at `$37`, decrements by `1` each second. When Below `0` it hits `$ff` and stays there and *"Hurry Up"* is announced                                                                                                                                                               |
| `$0077` | Secondary Game Timer   | Starts at `8` decrements by `1` each second after *"Hurry Up"* is announced. When Below `0` it hits `$ff` and stays there and Water level starts to rise                                                                                                                                 |
| `$1165` | Island Index | `0` Index Island number |
| `$1166` | Round Index | `0` Indexed Round Number |


## Special Item Tracking
- Tracked in Zero Page, and survive across game over and new game states as items collected in multiple playthroughs contribute to Secret Item bonuses. Do not use these for current active powerup state; use `$004E` instead.

| Address | Items                    |
|---------|--------------------------|
| `$0058` | Boots collected          |
| `$0059` | Red Potions collected    |
| `$005a` | Yellow Potions collected |
| `$005b` | Any Potions collected    |
| `$005c` | Yellow Stars collected   |
| `$005d` | Red Stars collected      |
| `$005e` | Magic Ring collected     |


## Draft Achievement Set

Draft set focused on achievements that should be practical to track from simple game state: island/round progression, boss defeat transitions, lives, credits/continues, score, diamond collection/order, and permanent powerup flags once those addresses are confirmed.

### Progression

| Title | Description | Tracking Notes |
| --- | --- | --- |
| Somewhere Over the Rainbow | Clear Island 1. | Award on transition from Island 1 boss defeated to Island 2. |
| Bug Spray | Defeat the Island 2 boss. | Award on transition from Island 2 boss defeated to Island 3. |
| Toybox Takedown | Clear Island 3. | Award on transition from Island 3 boss defeated to Island 4. |
| Mechanical Weather | Clear Island 4. | Award on transition from Island 4 boss defeated to Island 5. |
| Dinosaur Downpour | Clear Island 5. | Award on transition from Island 5 boss defeated to Island 6. |
| Magical Forecast | Clear Island 6. | Award on transition from Island 6 boss defeated to Island 7. |
| Rainbow's End | Clear Island 7 and complete the game. | Award on final boss clear or ending state. |
| Island Hopper | Reach Island 4 without using a continue. | Gate with continue/credit-use tracking. |
| Seven-Color Journey | Reach Island 7 without using a continue. | Gate with continue/credit-use tracking. |
| Clear Skies Ahead | Complete the game without using a continue. | Gate with continue/credit-use tracking. |

### Diamonds And Permanent Powerups

| Title | Description | Tracking Notes |
| --- | --- | --- |
| Proper Spectrum: Insect Island | Collect the seven diamonds on Island 1 in the correct order and reveal the boss-room powerup. | Use `$00AD == 0` and `$00AE == 0`, scoped to Island 1. |
| Proper Spectrum: Combat Island | Collect the seven diamonds on Island 2 in the correct order and reveal the boss-room powerup. | Use `$00AD == 0` and `$00AE == 0`, scoped to Island 2. |
| Proper Spectrum: Monster Island | Collect the seven diamonds on Island 3 in the correct order and reveal the boss-room powerup. | Use `$00AD == 0` and `$00AE == 0`, scoped to Island 3. |
| Proper Spectrum: Toy Island | Collect the seven diamonds on Island 4 in the correct order and reveal the boss-room powerup. | Use `$00AD == 0` and `$00AE == 0`, scoped to Island 4. |
| Proper Spectrum: Doh's Island | Collect the seven diamonds on Island 5 in the correct order and reveal the boss-room powerup. | Use `$00AD == 0` and `$00AE == 0`, scoped to Island 5. |
| Proper Spectrum: Robot Island | Collect the seven diamonds on Island 6 in the correct order and reveal the boss-room powerup. | Use `$00AD == 0` and `$00AE == 0`, scoped to Island 6. |
| Proper Spectrum: Dragon Island | Collect the seven diamonds on Island 7 in the correct order and reveal the boss-room powerup. | Use `$00AD == 0` and `$00AE == 0`, scoped to Island 7. |
| Permanent Collection | Unlock any permanent powerup. | Award when any permanent powerup flag changes from unset to set. |
| Double Permanent | Unlock two permanent powerups in one playthrough. | Count permanent powerup flags or island-order successes. |
| Rainbow Mastery | Unlock all seven permanent powerups in one playthrough. | Count all seven permanent powerup flags or all island-order successes. |

### Powerups

| Title | Description | Tracking Notes |
| --- | --- | --- |
| Permanent Advantage | Defeat a boss after unlocking that island's permanent powerup. | Gate boss clear with that island's permanent powerup available or collected. |
| Fully Equipped | Hold max rainbow power, max rainbow speed, and max movement speed at the same time. | Use `$004E`: bits 0-1 equal `2`, bit 2 `$04` set, and bit 6 `$40` set. |
| Fast Forecast | Obtain the permanent speed upgrade. | Needs confirmed permanent speed flag. |
| Double Rainbow | Obtain max active rainbow count. | Use `$004E` bits 0-1 equal `2`. |
| Quick Casting | Obtain active fast-rainbow power. | Use `$004E` bit 2 `$04` set. |

### Boss Challenges

| Title | Description | Tracking Notes |
| --- | --- | --- |
| No Shelter Needed | Defeat any island boss without dying during the boss fight. | Track lives from boss-room entry to boss clear. |
| Bug Boss Perfect | Defeat the Island 1 boss without dying in the boss room. | Track lives from Island 1 boss-room entry to boss clear. |
| Midgame Stormbreaker | Defeat the Island 4 boss without dying in the boss room. | Track lives from Island 4 boss-room entry to boss clear. |
| Final Forecast | Defeat the Island 7 boss without dying in the boss room. | Track lives from Island 7 boss-room entry to final boss clear. |
| Boss Rush Discipline | Defeat three bosses in one playthrough without dying during any boss fight. | Count no-death boss clears during the active run. |

### Survival

| Title | Description | Tracking Notes |
| --- | --- | --- |
| Dry Landing | Clear Island 1 without losing a life. | Compare lives at Island 1 start and Island 2 transition. |
| Careful Climber | Clear any full island without losing a life. | Compare lives at island start and next-island transition. |
| Halfway Untouched | Clear the first three islands without losing a life. | Compare lives from run start to Island 4 transition. |
| One Credit Rainbow | Complete the game on one credit. | Gate final clear with no continue use. |
| No Mist Over Rainbow Island | Complete the game without losing a life. | Compare lives from run start to final clear. |

### Score And Treasure

| Title | Description | Tracking Notes |
| --- | --- | --- |
| Pot of Gold | Reach 100,000 points. | Use `$115B-$115E` score. |
| Treasure Hunter | Reach 250,000 points. | Use `$115B-$115E` score. |
| Rainbow Millionaire | Reach 1,000,000 points. | Use `$115B-$115E` score; confirm this is realistic for the C64 version. |
| Rich in Color | Finish an island with all seven diamonds collected. | Use `$00A3 == $7F` before or during island completion. |
| Diamond Habit | Finish three different islands with all seven diamonds collected in one playthrough. | Count islands completed with `$00A3 == $7F`. |

### Stage-Specific Candidates

| Title | Description | Tracking Notes |
| --- | --- | --- |
| Out of the Water | Escape the hurry-up water after it appears on any stage. | Needs confirmed water/hurry-up state and stage-clear transition. |
| Last-Second Rainbow | Clear a round while the hurry-up danger is active. | Needs confirmed hurry-up state and round-clear transition. |
| Upward Mobility | Clear any round after reaching the top platform area. | Needs player Y-position and round-clear transition. |

### Implementation Notes

- Prefer progression, score, lives, credit/continue, and diamond-order achievements first because the current notes already identify stable candidates for score, lives, credits, and diamonds.
- Avoid fragile goals like killing a specific enemy with a specific rainbow setup or collecting rare random items unless the game exposes a stable event flag.
- The permanent powerup achievements should wait until the boss-room item spawn/collected flags are confirmed.
