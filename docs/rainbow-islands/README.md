# Rainbow Islands Memory Addresses

Known C64 memory addresses for Rainbow Islands.

## Title Screen

| Address | Purpose | Notes |
| --- | --- | --- |
| `$18B3` | Credits | Stored as `$40 + credit_count`. For example, `$40` = 0 credits, `$41` = 1 credit, `$45` = 5 credits. |
| `$C3E6` | Displayed credits | Screen/display mirror of `$18B3`; use `$18B3` for game state. |

## In Game

| Address | Purpose | Notes |
| --- | --- | --- |
| `$115B-$115E` | Player score | Stored as decimal pairs, highest decimals first. Example: `$115B=00`, `$115C=01`, `$115D=80`, `$115E=60` represents `18060`. |
| `$1160` | Player lives | `0` is the last life. `$FF` means game over. |
| `$00A3` | Collected diamonds | Bitfield: bit 6/red `$40`, bit 5/orange `$20`, bit 4/yellow `$10`, bit 3/green `$08`, bit 2/light blue `$04`, bit 1/dark blue `$02`, bit 0/violet `$01`. |
| `$00AD` | Diamond order progress | Starts at `6` and decrements by `1` each time the next correct-order diamond is collected: red, orange, yellow, green, light blue, dark blue, violet. Reaches `0` after all diamonds are collected in order. |
| `$00AE` | Diamond order mistakes | Increments by `1` when a diamond is collected out of order. Remains `0` when all diamonds are collected in correct order. |
