// Game clocks as pure functions over an injected `now`. The caller says which clocks run between two readings
// (`advance`): the action clock times decisions, runouts, result holds and offers; the level clock times stake
// levels. A deadline is a reading of the action clock, so a stopped action clock stops every countdown with it.

export type OnTimeout = "check-or-fold" | "fold" | "none";

export type ClockSettings = {
  decisionSeconds: number;
  // What the game does for a player whose decision time ran out.
  //   check-or-fold: check when that costs nothing, otherwise fold
  //   fold:          fold
  //   none:          nothing; the game keeps waiting
  onTimeout: OnTimeout;
};

// Everything is a plain value; every function returns a new state.
export type ClockState = {
  // Wall time of the last update.
  clockAt: number;
  // Running milliseconds elapsed on each clock.
  actionMs: number;
  levelMs: number;
};

// A decision timer in action-clock milliseconds. The settle is the quiet time to take in what just happened.
export type Timer = { settleUntil: number; deadline: number };

export const DEFAULT_SETTINGS: ClockSettings = { decisionSeconds: 30, onTimeout: "check-or-fold" };

const ON_TIMEOUT: OnTimeout[] = ["check-or-fold", "fold", "none"];
const isMs = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

export function validateSettings(settings: Partial<ClockSettings> = {}): ClockSettings {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  if (!Number.isSafeInteger(s.decisionSeconds) || s.decisionSeconds < 1) throw new RangeError("decisionSeconds must be a whole number of at least 1");
  if (!ON_TIMEOUT.includes(s.onTimeout)) throw new RangeError(`onTimeout must be one of ${ON_TIMEOUT.join(", ")}`);
  return s;
}

export function decisionMs(settings: ClockSettings): number {
  return settings.decisionSeconds * 1000;
}

// ---- timers ----

// `ms` from now on the action clock.
export function after(state: ClockState, ms: number): number {
  if (!isMs(ms)) throw new RangeError("ms must be a number of 0 or more");
  return state.actionMs + ms;
}

// A human's decision: settle first, then the full decision time. An absent player gets the settle only,
// so the game acts for them as soon as it ends.
export function startDecision(state: ClockState, settings: ClockSettings, options: { settleMs: number; absent?: boolean }): Timer {
  const settleUntil = after(state, options.settleMs);
  return { settleUntil, deadline: options.absent ? settleUntil : settleUntil + decisionMs(settings) };
}

// A computer player's move: no earlier than `minMs` after now and after the settle, plus a thinking time the
// caller draws from its random source.
export function startThinking(state: ClockState, options: { settleMs: number; minMs: number; thinkMs: number }): Timer {
  if (!isMs(options.thinkMs) || !isMs(options.minMs)) throw new RangeError("minMs and thinkMs must be numbers of 0 or more");
  const settleUntil = after(state, options.settleMs);
  return { settleUntil, deadline: Math.max(settleUntil, state.actionMs + options.minMs) + options.thinkMs };
}

// A timer that ran out while its player was absent, but the player is back: a full countdown from the end of the settle.
export function renewIfPresent(timer: Timer, settings: ClockSettings, present: boolean): Timer {
  return present && timer.deadline <= timer.settleUntil ? { settleUntil: timer.settleUntil, deadline: timer.settleUntil + decisionMs(settings) } : timer;
}

// Push a timer later, for example to make room for the time cards take to deal.
export function delay(timer: Timer, ms: number): Timer {
  if (!isMs(ms)) throw new RangeError("ms must be a number of 0 or more");
  return { settleUntil: timer.settleUntil + ms, deadline: timer.deadline + ms };
}

export function isDue(state: ClockState, deadline: number | null): boolean {
  return deadline !== null && state.actionMs >= deadline;
}

// Milliseconds left on a deadline (0 when due), or null when there is none.
export function remainingMs(state: ClockState, deadline: number | null): number | null {
  return deadline === null ? null : Math.max(0, deadline - state.actionMs);
}

// Milliseconds of the settle still to run, or 0.
export function settleLeftMs(state: ClockState, timer: Timer): number {
  return Math.max(0, timer.settleUntil - state.actionMs);
}

// What the game should do for a player whose time ran out. `canCheck` is whether checking costs nothing.
export function timeoutAction(settings: ClockSettings, canCheck: boolean): "check" | "fold" | "none" {
  if (settings.onTimeout === "none") return "none";
  if (settings.onTimeout === "fold") return "fold";
  return canCheck ? "check" : "fold";
}

// Wall time at which the earliest of `deadlines` falls due if the action clock keeps running from the last update, or
// null when nothing is waiting. `extraWakes` are wall times from outside (presence timeouts) and are included as they are.
export function nextWake(state: ClockState, deadlines: (number | null)[], extraWakes: number[] = []): number | null {
  const times = [...extraWakes];
  for (const d of deadlines) if (d !== null) times.push(wallAt(state, "action", d));
  return times.length ? Math.min(...times) : null;
}

// ---- running the clocks ----
// The turn engine decides which clocks run (presence owns who is paused or holding) and passes the answer as `runs`.

export type ClockName = "action" | "level";
export type Runs = { action: boolean; level: boolean };

const CLOCKS: ClockName[] = ["action", "level"];

function clockName(which: unknown): ClockName {
  if (!CLOCKS.includes(which as ClockName)) throw new RangeError("which must be action or level");
  return which as ClockName;
}

// A new pair of clocks at zero, last updated at `now`.
export function create(now: number): ClockState {
  if (!Number.isFinite(now)) throw new RangeError("now must be a number");
  return { clockAt: now, actionMs: 0, levelMs: 0 };
}

// Add the time since the last update to each clock that runs; a clock that does not run stands still. A `now`
// earlier than the last update adds nothing and the last update never moves back.
export function advance(clock: ClockState, now: number, runs: Runs): ClockState {
  if (!Number.isFinite(now)) throw new RangeError("now must be a number");
  const dt = Math.max(0, now - clock.clockAt);
  return { ...clock, clockAt: Math.max(now, clock.clockAt), actionMs: clock.actionMs + (runs.action ? dt : 0), levelMs: clock.levelMs + (runs.level ? dt : 0) };
}

// Both clocks back to zero, as at the start of a game.
export function reset(_clock: ClockState, now: number): ClockState {
  return create(now);
}

// Running milliseconds on one clock.
export function elapsed(clock: ClockState, which: ClockName): number {
  return clockName(which) === "action" ? clock.actionMs : clock.levelMs;
}

// The epoch time at which `which` reaches `targetMs` if it keeps running from the last update. Never before the last
// update, so a target already passed is "now".
export function wallAt(clock: ClockState, which: ClockName, targetMs: number): number {
  if (!Number.isFinite(targetMs)) throw new RangeError("targetMs must be a number");
  return clock.clockAt + Math.max(0, targetMs - elapsed(clock, which));
}
