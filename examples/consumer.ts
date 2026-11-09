import {advance, create, isDue, remainingMs, startDecision, timeoutAction, validateSettings} from "../implementation/server/clock.ts";

// One player's decision as a game would run it: a 4 second settle then 30 seconds, the clock advanced from an
// injected wall time, and the timeout action taken from the settings. `running` false stops both clocks for the whole period.
export function playOneDecision(startWall: number, endWall: number, running: boolean): {action: string; left: number | null} {
  const settings = validateSettings({decisionSeconds: 30});
  let clock = create(startWall);
  const timer = startDecision(clock, settings, {settleMs: 4000});
  clock = advance(clock, endWall, {action: running, level: running});
  return {action: isDue(clock, timer.deadline) ? timeoutAction(settings, false) : "waiting", left: remainingMs(clock, timer.deadline)};
}
