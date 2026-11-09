// Client side of the clocks: a server countdown arrives as "milliseconds left when the view was built" and the
// client runs it down from the moment the view arrived, standing still while the game is frozen.

// Milliseconds left now; null when there is no countdown. A frozen game shows the value as the server sent it,
// and a device clock that moved backwards does not add time.
export function remaining(leftAtView: number | null, viewAt: number, now: number, frozen: boolean): number | null {
  if (leftAtView === null) return null;
  return frozen ? leftAtView : Math.max(0, leftAtView - Math.max(0, now - viewAt));
}

// "m:ss", rounding up so a clock never shows 0:00 while time is left.
export function formatClock(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// Wall time at which a running countdown reaches zero, for a ticking display; null when frozen or absent.
export function endsAt(leftAtView: number | null, viewAt: number, frozen: boolean): number | null {
  return leftAtView === null || frozen ? null : viewAt + leftAtView;
}
