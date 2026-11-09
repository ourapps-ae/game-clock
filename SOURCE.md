# Source mapping

Reference revision: `19905b75dbea89fbfd424d67fe26c81aaed0e018`. Extraction source: `OurPoker/recipe/` (read-only).

- `implementation/server/clock.ts` <- `server/src/engine.ts` (clocks and timers) and `server/src/rules.ts:8` (`DECISION_MS = house.timing.decision_seconds * 1000`).
  - `startDecision`, `renewIfPresent`, `delay`, `after` <- `engine.ts:833-839` (`setActor`: `settleUntil = actionClock + SETTLE_MS`; human `deadline = settleUntil + DECISION_MS`; sitting out or absent after a miss `deadline = settleUntil`), `engine.ts:550-554` (absent but back: `deadline = settleUntil + DECISION_MS`), `engine.ts:698-704` (deadlines pushed later by the deal animation), `engine.ts:879` and `engine.ts:909` (runout and result times as `actionClock + n`). Generalised: `SETTLE_MS` and the other timing constants (`engine.ts:11-37`) are arguments, not settings; they describe the recipe's presentation, not the rules.
  - `startThinking` <- `engine.ts:836` (computer player: `max(settleUntil, actionClock + BOT_MIN_MS) + BOT_THINK_MIN_MS + floor(rng() * BOT_THINK_SPREAD_MS)`). Generalised: the random draw is made by the caller and passed as `thinkMs`, so the component has no random source of its own.
  - `isDue`, `remainingMs`, `settleLeftMs` <- `engine.ts:547` (`actionClock >= deadline`), `engine.ts:576-578` (`botDue`), `server/src/view.ts:108-125` (`remainingMs = max(0, deadline - actionClock)` at line 124, `settleMs` at line 125) and `view.ts:42` (rebuy offers).
  - `timeoutAction` <- `engine.ts:720-722` (`autoAction`: fold if there is something to call, otherwise check) and house rules `timing.timeout = "check_if_free_otherwise_fold"`. The `onTimeout` setting adds `fold` and `none`.
  - `nextWake` <- `engine.ts:582-608` (wall time `clockAt + max(0, t - actionClock)` for each deadline). Left behind: the parts that depend on game state (lobby drops, stale tables, rebuy offers, end of game), replaced by the `deadlines` and `extraWakes` arguments.
  - `decisionSeconds` <- `rules.ts:8` and house rules `timing.decision_seconds` (30).
  - Left behind: what happens when a timer fires (`dueStep`, `engine.ts:532-571`; turn-engine), presence (`PRESENCE_MS`, `STALE_MS`, `LOBBY_DROP_MS`, `engine.ts:25-34`, `464-465`; presence), rebuy timers (`REBUY_MS`, `engine.ts:931`; tournament), blind levels (`levelFor`, `rules.ts:27-29`; level-schedule), bot pacing constants other than the three in `startThinking`.
  - `create`, `advance`, `reset`, `elapsed`, `wallAt`: `generated-adapter`, written to the operations `components/turn-engine/interfaces/required/game-clock.json` and `components/computer-players/interfaces/required/game-clock.json` declare. The arithmetic is `engine.ts:456-462` (`tick`) with the run decision (`!paused && !held`, level also `no rebuy offers`) made by the caller, and `wallAt` is the formula of `engine.ts:582-608` (`clockAt + max(0, target - clock)`). Pause and hold state belongs to presence.
- `implementation/web/countdown.ts` <- `web/src/board.ts:7-15` (`countdown`: `max(0, ms - (frozen ? 0 : Date.now() - viewAt))`, `time(ms)` as `m:ss` with `ceil`).
  - Generalised: no DOM; `now` is passed in; `endsAt` added for a ticking display; a device clock that goes backwards adds no time.
  - Left behind: the DOM element, the `setInterval` ticker (`board.ts:17-21`).
- `implementation/apple/Sources/Countdown.swift` <- `ios/OurPoker/Sources/TableScreen.swift:3-8` (`remaining(_:viewAt:now:paused:)`). Same function made `public` with the backwards-clock guard; `formatClock` added (the Swift UI formats time inline).
- `implementation/android/src/main/java/ae/clock/Countdown.kt` <- `android/app/src/main/java/app/ourapps/ourpoker/ui/TableScreen.kt:114-118` (`remaining`). Same, with the guard and `formatClock`. Not compiled here (no kotlinc).
- `tests/fixtures/countdown.json`: new; eight countdown rows and nine `m:ss` rows read by all three test suites.
- `tests/web.test.ts`, `tests/apple/main.swift`, `tests/android/Main.kt`, `tests/native.py`: new (native.py as in `components/store-update/tests/native.py`).
- `examples/consumer.ts`: new; one decision with a timeout and a stopped clock.
