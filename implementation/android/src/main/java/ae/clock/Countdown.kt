package ae.clock

// Time left on a server countdown, from when the view arrived; frozen while the game is paused or held.
fun remaining(remainingMs: Long?, viewAt: Long, now: Long, paused: Boolean): Long? {
    if (remainingMs == null) return null
    return if (paused) remainingMs else (remainingMs - (now - viewAt).coerceAtLeast(0)).coerceAtLeast(0)
}

// "m:ss", rounding up so a clock never shows 0:00 while time is left.
fun formatClock(ms: Long): String {
    val seconds = (ms.coerceAtLeast(0) + 999) / 1000
    return "${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}"
}
