import Foundation

// Time left on a server countdown, from when the view arrived; frozen while the game is paused or held.
public func remaining(_ ms: Int?, viewAt: Date, now: Date, paused: Bool) -> Int? {
    guard let ms else { return nil }
    if paused { return ms }
    return max(0, ms - max(0, Int(now.timeIntervalSince(viewAt) * 1000)))
}

// "m:ss", rounding up so a clock never shows 0:00 while time is left.
public func formatClock(_ ms: Int) -> String {
    let seconds = (max(0, ms) + 999) / 1000
    return "\(seconds / 60):" + (seconds % 60 < 10 ? "0" : "") + "\(seconds % 60)"
}
