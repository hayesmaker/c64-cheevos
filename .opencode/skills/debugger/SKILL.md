---
name: debugger
description: Hunt C64 Debugger memory dumps for key values and events in memory
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
---

## What I do

- Hunt for memory dumps which are .bin or .txt files I save in the docs folder per game
- .bin files are memory dumps from RetroDebugger and .txt files are usually lists of memory addresses from Vice Monitor console output
- If examining Vice Monitor output I will normally put the command used as the first line (eg: h 0000 ffff 0a hunts all memory for addresses with the 0a found).
- Based on prompt instructions search the .bin files for values which change based on prompt described events in game.
- Provide possible memory addresses which might point to values and events which might happen in a C64 game.

## When to use me

Use this when you are hunting memory addresses in saved C64 Debugger memory dumps.
