import ae.clock.formatClock
import ae.clock.remaining
import java.io.File

fun main() {
    var checks = 0
    fun verify(condition: Boolean, message: String) {
        check(condition) { "FAIL $message" }
        checks++
    }
    val row = Regex("""^\s*\[(null|\d+), (\d+), (\d+), (true|false), (null|\d+), (null|\d+)\],?$""")
    val format = Regex("""\[(-?\d+), "([0-9]+:[0-9]{2})"\]""")
    var rows = 0
    for (line in File("tests/fixtures/countdown.json").readLines()) {
        val m = row.matchEntire(line) ?: continue
        rows++
        val left = m.groupValues[1].toLongOrNull()
        val got = remaining(left, m.groupValues[2].toLong(), m.groupValues[3].toLong(), m.groupValues[4] == "true")
        verify(got == m.groupValues[5].toLongOrNull(), "remaining $line")
    }
    verify(rows == 8, "read $rows countdown rows")
    var formats = 0
    for (m in format.findAll(File("tests/fixtures/countdown.json").readText().substringAfter("\"format\""))) {
        formats++
        verify(formatClock(m.groupValues[1].toLong()) == m.groupValues[2], "format ${m.value}")
    }
    verify(formats == 9, "read $formats format rows")
    println("$checks countdown assertions passed")
}
