# Game clock instructions

## For the agent
Select this component for any game with decision time limits or level timers. Set `decisionSeconds` from the recipe's decision time answer (hold'em: 30), and `onTimeout` from the house rules (hold'em: check-or-fold). Connect the provided `game-clock` to the turn engine and to computer-players. Include the web, Apple and Android files only when those client targets are selected.

- Select package `ourapps-ae/game-clock` version `0.4.0`.
- Settings to configure:
  - `decisionSeconds` (integer; optional; default `30`)
  - `onTimeout` (string, slug; optional; default `check-or-fold`)
- Connect the provided `game-clock` (ae/game-clock 1.0.0) to the consumer that needs it.
- No accounts or keys are needed.

## For the developer
Never read the system clock inside game code; pass `now` in. Store the `ClockState` and timers with the game so a restart resumes where it stopped. Send clients the milliseconds left (`remainingMs`) and whether the game is frozen, and use `remaining` on the client. No accounts or keys. With a turn engine, pause and hold state belongs to presence: pass run flags to `advance`.

## How to check
From the component directory:

- `node --test tests/web.test.ts` (web, required-local; tools: node 26.5.0)
- `python3 tests/native.py apple` (apple, platform; tools: python3 3.12.8, swiftc 6.4.2)
- `python3 tests/native.py android` (android, platform; tools: python3 3.12.8, kotlinc 2.2.0, java 26.0.1)
- `python3.12 -B /Users/george/Projects/com/my/tools/check_component.py components/game-clock` validates the manifest, sidecars and runs the required-local suite.
