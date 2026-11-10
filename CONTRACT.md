# Game clock component

## Purpose and facilities
A turn-based game with clocks needs them to be fair and testable. This component keeps two clocks as plain values: the action clock (decisions, board runouts, result holds, offers) and the level clock (stake levels). Both advance only by the time between injected `now` readings, and only while the caller says they run: the caller stops them while the game is paused (host away, everyone offline, manual) or while a player holds the clock to look at cards or read a guide. A deadline is a reading of the action clock, so stopping the clock stops every countdown. The component builds decision timers (a settle to take in what happened, then the decision time; absent players get the settle only; computer players get a minimum plus a thinking time the caller draws from a random source), says what to do when time runs out, and works out the next wall time the game must wake up. Client files turn the countdown the server sends into a running display that stands still while frozen.

Facilities: `game-clock` (Caller-driven clocks, decision and thinking deadlines, timeouts, next wake-up, client countdowns).

## User inputs
The installer collects two settings. `decisionSeconds` is how long a player has to decide (whole number of seconds; default 30, as in the house rules). `onTimeout` is what the game does when time runs out: `check-or-fold` (check if free, otherwise fold; default), `fold`, or `none` (keep waiting).

- `decisionSeconds` (integer; optional; default `30`)
- `onTimeout` (string, slug; optional; default `check-or-fold`)

## Artefacts and dependencies
`component.json` maps every `implementation/` source into `components/game-clock/`:

- `implementation/android/src/main/java/ae/clock/Countdown.kt` -> `components/game-clock/android/src/main/java/ae/clock/Countdown.kt`
- `implementation/apple/Sources/Countdown.swift` -> `components/game-clock/apple/Sources/Countdown.swift`
- `implementation/server/clock.ts` -> `components/game-clock/server/clock.ts`
- `implementation/web/countdown.ts` -> `components/game-clock/web/countdown.ts`

Dependencies: none.
`tools.lock.json` pins verification tools: node 26.5.0, python3 3.12.8, swiftc 6.4.2, kotlinc 2.2.0, java 26.0.1. Licence: `Apache-2.0` (`LICENCE`, `NOTICE`).

## Provided interfaces
- `interfaces/game-clock.json` defines `game-clock` (ae/game-clock) version 1.0.0: an OpenRPC 1.3.2 document, one method per function (a member of a created object is `<Type>.<member>`), with parameter, result and data types as JSON Schema 2020-12 (`components.schemas`) and thrown errors under `errors`.

## Required interfaces
None.

## Integration
The turn engine keeps one `ClockState` (`create(now)`) and, at the start of every request and wake-up, calls `advance(clock, now, runs)`. Presence owns who is paused or holding the clock; the engine reads that and says which clocks run: `runs.action` is false while the table is paused or held, `runs.level` is also false while rebuy offers are open. `reset(clock, now)` starts a game, `elapsed(clock, 'action'|'level')` reads a clock (feed the level reading to `level-schedule`) and `wallAt(clock, which, targetMs)` gives the epoch time a clock reaches a target if it keeps running, for scheduling alarms. When a player becomes the actor the engine stores `startDecision(...)` (or `startThinking(...)` for a computer player, with a thinking time drawn from the random source) and when `isDue` it takes `timeoutAction`. Clients call `remaining(leftAtView, viewAt, now, frozen)` and `formatClock`. Presence timing itself (who is connected) is not here.

## Visual definition and connected examples
`visual/definition.json` maps its ports to the provided and required interfaces. `visual/examples/connected.json` connects the component to an illustrative application consumer. Both image formats and a text description are retained under `visual/output/`.

## Infrastructure
No deployed service and no accounts. The host provides a wall clock and an alarm facility; the component only does arithmetic on the readings it is given.

## Verification
`tests/web.test.ts` (required-local) checks settings, clock arithmetic with a clock that goes backwards, the separate level run flag, decision, absent and thinking timers, renewal when an absent player returns, timeout actions, next wake-up, `create`, `advance`, `reset`, `elapsed`, `wallAt` and the client countdown rows in `tests/fixtures/countdown.json`. `tests/native.py apple` compiles `Countdown.swift` with swiftc and checks the same rows (run and passed on this machine). `tests/native.py android` does the same with kotlinc; kotlinc is not installed here, so it was written but not run.

- `node --test tests/web.test.ts` (web, required-local; tools: node 26.5.0)
- `python3 tests/native.py apple` (apple, platform; tools: python3 3.12.8, swiftc 6.4.2)
- `python3 tests/native.py android` (android, platform; tools: python3 3.12.8, kotlinc 2.2.0, java 26.0.1)

## Scenarios and presentation
A hold'em table with 30 seconds per decision, stopped when the host disconnects. A turbo game with 10 seconds and fold on timeout. A relaxed game with `onTimeout` `none`.

## Updates and removal
Patch updates replace the files only. The component keeps no data; the clock state lives in the game state the engine stores. Changing `decisionSeconds` affects timers started afterwards, not those already running.
