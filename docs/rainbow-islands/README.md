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
