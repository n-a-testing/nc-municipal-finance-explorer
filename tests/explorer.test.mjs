import test from "node:test"
import assert from "node:assert/strict"
import {
  BROAD_FUNCTIONS, composition, estimateTax, medianValue, peersFor, reported, shortValue, trendPoints,
} from "../src/lib/explorer.ts"

// Synthetic fixtures are only for calculation tests, never displayed by the app.
const row = (name, overrides = {}) => ({ municipality: name, county: "Test County", population: 100, fiscal_year: 2024, ...overrides })

test("reported numbers exclude null, NaN, and infinity but preserve explicit zero", () => {
  assert.equal(reported(0), true)
  for (const value of [null, undefined, NaN, Infinity, "100"]) assert.equal(reported(value), false)
})

test("null-friendly display never invents zero", () => {
  assert.equal(shortValue(null), "—")
  assert.equal(shortValue(0), "$0")
  assert.equal(shortValue(0.44, "rate"), "$0.440")
})

test("median excludes missing data and preserves source zeros", () => {
  assert.equal(medianValue([null, 0, 10, 20, undefined]), 10)
  assert.equal(medianValue([null, 10, 20]), 15)
  assert.equal(medianValue([null, NaN]), null)
})

test("municipal estimate uses the published rate per $100", () => {
  assert.equal(estimateTax(400_000, 0.44), 1760)
  assert.equal(estimateTax(400_000, 0), 0)
  assert.equal(estimateTax(0, 0.44), 0)
})

test("combined estimate needs both published rates", () => {
  assert.equal(estimateTax(400_000, 0.44, 0.60), 4160)
  assert.equal(estimateTax(400_000, 0.44, null), null)
  assert.equal(estimateTax(400_000, null, 0.60), null)
  assert.equal(estimateTax(-1, 0.44), null)
})

test("population peers are inclusive at ±25%, excluding the subject", () => {
  const subject = row("Subject")
  const rows = [subject, row("Lower", { population: 75 }), row("Upper", { population: 125 }), row("Outside", { population: 126 }), row("Missing", { population: null })]
  assert.deepEqual(peersFor(rows, subject, "population", []).map((r) => r.municipality), ["Lower", "Upper"])
})

test("unknown county is not a shared county", () => {
  const subject = row("Subject", { county: null })
  assert.deepEqual(peersFor([subject, row("Unknown", { county: null })], subject, "county", []), [])
})

test("custom and all-dataset peers exclude the subject", () => {
  const subject = row("Subject")
  const rows = [subject, row("A"), row("B")]
  assert.deepEqual(peersFor(rows, subject, "selected", ["Subject", "B"]).map((r) => r.municipality), ["B"])
  assert.equal(peersFor(rows, subject, "all", []).length, 2)
})

test("broad composition uses the reported total as denominator", () => {
  const broad = Object.fromEntries(BROAD_FUNCTIONS.map(({ key }, index) => [key, index === 0 ? 500 : 100]))
  const result = composition(row("Subject", { total_expenditure: 1000, ...broad }))
  assert.equal(result.public_safety_expenditure, 50)
  assert.equal(Object.values(result).reduce((sum, value) => sum + value, 0), 100)
})

test("composition is withheld for missing, negative, and unreconciled categories", () => {
  const broad = Object.fromEntries(BROAD_FUNCTIONS.map(({ key }) => [key, 100]))
  const complete = row("Subject", { total_expenditure: 600, ...broad })
  assert.equal(composition({ ...complete, utilities_expenditure: null }), null)
  assert.equal(composition({ ...complete, total_expenditure: 1000 }), null)
  assert.equal(composition({ ...complete, other_expenditure: -1 }), null)
  assert.equal(composition({ ...complete, total_expenditure: 0 }), null)
})

test("historical series retains missing middle and endpoint years", () => {
  const rows = [row("A", { fiscal_year: 2022, spending_per_capita: 100 }), row("A", { fiscal_year: 2024, spending_per_capita: 300 })]
  assert.deepEqual(trendPoints(rows, ["A", "B"], "spending_per_capita", [2024, 2023, 2022]), [
    { year: 2022, city0: 100, city1: null },
    { year: 2023, city0: null, city1: null },
    { year: 2024, city0: 300, city1: null },
  ])
})
