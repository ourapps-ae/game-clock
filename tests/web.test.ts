import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {advance, after, create, decisionMs, delay, elapsed, isDue, nextWake, remainingMs, renewIfPresent, reset, settleLeftMs, startDecision, startThinking, timeoutAction, validateSettings, wallAt, type ClockState} from "../implementation/server/clock.ts";
import {endsAt, formatClock, remaining} from "../implementation/web/countdown.ts";
import {playOneDecision} from "../examples/consumer.ts";

const fixture = JSON.parse(readFileSync(new URL("fixtures/countdown.json", import.meta.url), "utf8"));
const settings = validateSettings();
const both = {action: true, level: true};

test("settings default to the recipe's 30 seconds and check-or-fold, and reject nonsense", () => {
  assert.deepEqual(settings, {decisionSeconds: 30, onTimeout: "check-or-fold"});
  assert.equal(decisionMs(settings), 30000);
  for (const bad of [0, 1.5, NaN]) assert.throws(() => validateSettings({decisionSeconds: bad}), RangeError);
  assert.throws(() => validateSettings({onTimeout: "shrug" as never}), RangeError);
});

test("both clocks advance by the injected time and a clock that goes backwards adds nothing", () => {
  let c = create(1000);
  c = advance(c, 1500, both);
  assert.deepEqual([c.clockAt, c.actionMs, c.levelMs], [1500, 500, 500]);
  c = advance(c, 1200, both);
  assert.deepEqual([c.clockAt, c.actionMs], [1500, 500]);
  c = advance(c, 2500, both);
  assert.equal(c.actionMs, 1500);
  assert.equal(elapsed(c, "level"), 1500);
});

test("advance returns a new state and leaves the old one alone", () => {
  const c = create(0);
  const d = advance(c, 100, both);
  assert.equal(c.actionMs, 0);
  assert.equal(d.actionMs, 100);
});

test("the level clock can stand still on its own", () => {
  let c = create(0);
  c = advance(c, 1000, {action: true, level: false});
  c = advance(c, 3000, {action: true, level: false});
  assert.deepEqual([c.actionMs, c.levelMs], [3000, 0]);
  c = advance(c, 4000, both);
  assert.deepEqual([c.actionMs, c.levelMs], [4000, 1000]);
});

test("a human decision is the settle then the full decision time; an absent player gets the settle only", () => {
  let c = advance(create(0), 2000, both);
  const t = startDecision(c, settings, {settleMs: 4000});
  assert.deepEqual(t, {settleUntil: 6000, deadline: 36000});
  assert.equal(remainingMs(c, t.deadline), 34000);
  assert.equal(settleLeftMs(c, t), 4000);
  const away = startDecision(c, settings, {settleMs: 4000, absent: true});
  assert.deepEqual(away, {settleUntil: 6000, deadline: 6000});
  c = advance(c, 5000, both);
  assert.equal(settleLeftMs(c, t), 1000);
  assert.ok(!isDue(c, away.deadline));
  c = advance(c, 7000, both);
  assert.ok(isDue(c, away.deadline));
  assert.ok(!isDue(c, t.deadline));
  assert.equal(settleLeftMs(c, t), 0);
  assert.equal(remainingMs(c, away.deadline), 0);
  assert.equal(remainingMs(c, null), null);
  assert.equal(isDue(c, null), false);
});

test("an absent player who comes back before the check gets a full countdown", () => {
  const c = create(0);
  const away = startDecision(c, settings, {settleMs: 4000, absent: true});
  assert.deepEqual(renewIfPresent(away, settings, true), {settleUntil: 4000, deadline: 34000});
  assert.deepEqual(renewIfPresent(away, settings, false), away);
  const normal = startDecision(c, settings, {settleMs: 4000});
  assert.deepEqual(renewIfPresent(normal, settings, true), normal);
});

test("computer thinking: not before the minimum, not before the settle, plus the drawn thinking time", () => {
  const c = advance(create(0), 1000, both);
  assert.deepEqual(startThinking(c, {settleMs: 4000, minMs: 4000, thinkMs: 700}), {settleUntil: 5000, deadline: 5700});
  assert.deepEqual(startThinking(c, {settleMs: 1000, minMs: 4000, thinkMs: 300}), {settleUntil: 2000, deadline: 5300});
  assert.throws(() => startThinking(c, {settleMs: 0, minMs: 0, thinkMs: -1}), RangeError);
});

test("delay and after", () => {
  const c = advance(create(0), 500, both);
  assert.equal(after(c, 1500), 2000);
  assert.deepEqual(delay({settleUntil: 4000, deadline: 34000}, 340 * 4), {settleUntil: 5360, deadline: 35360});
  assert.throws(() => after(c, -1), RangeError);
  assert.throws(() => delay({settleUntil: 0, deadline: 0}, NaN), RangeError);
});

test("what happens on timeout follows the setting", () => {
  assert.equal(timeoutAction(settings, true), "check");
  assert.equal(timeoutAction(settings, false), "fold");
  assert.equal(timeoutAction(validateSettings({onTimeout: "fold"}), true), "fold");
  assert.equal(timeoutAction(validateSettings({onTimeout: "none"}), true), "none");
});

test("next wake: earliest deadline in wall time, nothing when nothing waits, outside wakes included", () => {
  const c = advance(create(10000), 12000, both);
  assert.equal(nextWake(c, [null, 20000, 15000]), 12000 + 15000 - 2000);
  assert.equal(nextWake(c, [1000]), 12000);
  assert.equal(nextWake(c, [null]), null);
  assert.equal(nextWake(c, [null], [13000]), 13000);
  assert.equal(nextWake(c, [20000], [99999]), 12000 + 18000);
});

test("client countdown matches the reference rows, frozen or not", () => {
  for (const [left, viewAt, now, frozen, expectedRemaining, expectedEnds] of fixture.rows) {
    assert.equal(remaining(left, viewAt, now, frozen), expectedRemaining, JSON.stringify([left, viewAt, now, frozen]));
    assert.equal(endsAt(left, viewAt, frozen), expectedEnds, JSON.stringify([left, viewAt, frozen]));
  }
  for (const [ms, text] of fixture.format) assert.equal(formatClock(ms), text, String(ms));
});

test("the consumer example: waiting inside the time, folding after it, waiting while the action clock is stopped", () => {
  const run = (wallAtEnd: number, running = true) => playOneDecision(0, wallAtEnd, running);
  assert.deepEqual(run(1000), {action: "waiting", left: 33000});
  assert.deepEqual(run(34000), {action: "fold", left: 0});
  assert.deepEqual(run(500000, false), {action: "waiting", left: 34000});
});

test("create, advance and reset work on run flags: each clock that runs gains the time, the others stand still", () => {
  let c: ClockState = create(1000);
  assert.deepEqual([c.clockAt, elapsed(c, "action"), elapsed(c, "level")], [1000, 0, 0]);
  c = advance(c, 1500, {action: true, level: true});
  assert.deepEqual([elapsed(c, "action"), elapsed(c, "level")], [500, 500]);
  c = advance(c, 2500, {action: true, level: false});
  assert.deepEqual([elapsed(c, "action"), elapsed(c, "level"), c.clockAt], [1500, 500, 2500]);
  c = advance(c, 3000, {action: false, level: false});
  assert.deepEqual([elapsed(c, "action"), elapsed(c, "level"), c.clockAt], [1500, 500, 3000]);
  c = advance(c, 2000, {action: true, level: true});
  assert.deepEqual([elapsed(c, "action"), c.clockAt], [1500, 3000], "a clock that goes backwards adds nothing and never moves back");
  const kept = advance(c, 3100, {action: true, level: true});
  assert.equal(c.actionMs, 1500, "the input state is unchanged");
  assert.equal(kept.actionMs, 1600);
  assert.deepEqual(reset(kept, 9000), {clockAt: 9000, actionMs: 0, levelMs: 0});
  assert.throws(() => create(NaN), RangeError);
  assert.throws(() => advance(c, Infinity, {action: true, level: true}), RangeError);
});

test("elapsed names the clock and rejects any other name", () => {
  const c = advance(create(0), 800, {action: true, level: false});
  assert.equal(elapsed(c, "action"), 800);
  assert.equal(elapsed(c, "level"), 0);
  assert.throws(() => elapsed(c, "wall" as never), RangeError);
});

test("wallAt: the epoch time a clock reaches a target if it keeps running, never before the last update", () => {
  let c = advance(create(10000), 12000, {action: true, level: false});
  assert.equal(wallAt(c, "action", 5000), 12000 + 3000);
  assert.equal(wallAt(c, "action", 2000), 12000, "already reached: now");
  assert.equal(wallAt(c, "action", 100), 12000, "a target in the past is not before the last update");
  assert.equal(wallAt(c, "level", 4000), 12000 + 4000, "the level clock stood still");
  assert.equal(wallAt(c, "action", 5000), nextWake(c, [5000]), "agrees with nextWake");
  assert.throws(() => wallAt(c, "action", NaN), RangeError);
  assert.throws(() => wallAt(c, "other" as never, 1), RangeError);
});
