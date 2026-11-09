import Foundation

let data = try Data(contentsOf: URL(fileURLWithPath: "tests/fixtures/countdown.json"))
let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
var checks = 0
func expect(_ condition: Bool, _ message: String) {
    if !condition { FileHandle.standardError.write(Data("FAIL \(message)\n".utf8)); exit(1) }
    checks += 1
}
for row in fixture["rows"] as! [[Any]] {
    let left = row[0] as? Int
    let viewAt = Date(timeIntervalSince1970: Double(row[1] as! Int) / 1000)
    let now = Date(timeIntervalSince1970: Double(row[2] as! Int) / 1000)
    let got = remaining(left, viewAt: viewAt, now: now, paused: row[3] as! Bool)
    expect(got == (row[4] as? Int), "remaining \(row)")
}
for row in fixture["format"] as! [[Any]] {
    expect(formatClock(row[0] as! Int) == (row[1] as! String), "format \(row)")
}
print("\(checks) countdown assertions passed")
