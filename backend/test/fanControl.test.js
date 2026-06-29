import { describe, it, expect } from "vitest"
import { calculateManualFanSpeed, DEFAULT_FAN_SPEED, normalizeFanCurve, buildFanTable, getHighestTemperature } from "../src/fanControl"
import { encrypt, decrypt, isEncrypted, resetKeyCache } from "../src/crypto"

describe("calculateManualFanSpeed", () => {
	it("falls back to default speed when fan curve is missing", () => {
		const result = calculateManualFanSpeed({
			manualFanControl: true,
			sensordata: [
				{ unit: "degrees C", value: 45 },
			],
		})

		expect(result).toEqual(
			expect.objectContaining({
				targetFanSpeed: DEFAULT_FAN_SPEED,
				reason: "missing_fancurve",
			})
		)
	})
})

describe("normalizeFanCurve", () => {
	it("normalizes a valid fan curve", () => {
		expect(normalizeFanCurve([20, 50, 100])).toEqual([20, 50, 100])
	})

	it("returns null for null input", () => {
		expect(normalizeFanCurve(null)).toBeNull()
	})

	it("returns null for non-array input", () => {
		expect(normalizeFanCurve("not an array")).toBeNull()
		expect(normalizeFanCurve(42)).toBeNull()
		expect(normalizeFanCurve({ a: 1 })).toBeNull()
	})

	it("returns null for fewer than 2 points", () => {
		expect(normalizeFanCurve([50])).toBeNull()
		expect(normalizeFanCurve([])).toBeNull()
	})

	it("clamps out-of-range values to [0, 100]", () => {
		expect(normalizeFanCurve([-10, 150])).toEqual([0, 100])
		expect(normalizeFanCurve([50, 200])).toEqual([50, 100])
	})
})

describe("buildFanTable", () => {
	it("builds a table with linear interpolation", () => {
		const table = buildFanTable([0, 100], 10)
		expect(table).toHaveLength(10)
		expect(table[0]).toBe(0)
		expect(table[9]).toBe(100)
		// Midpoint should be approximately 55.56 (interpolated)
		expect(table[5]).toBeCloseTo(55.56, 1)
	})

	it("handles single point curve", () => {
		const table = buildFanTable([50], 10)
		expect(table).toHaveLength(10)
		expect(table.every((v) => v === 50)).toBe(true)
	})

	it("handles empty curve", () => {
		const table = buildFanTable([], 10)
		expect(table).toHaveLength(10)
		expect(table.every((v) => v === DEFAULT_FAN_SPEED)).toBe(true)
	})
})

describe("getHighestTemperature", () => {
	it("returns the highest temperature from normal sensor data", () => {
		const sensors = [
			{ unit: "degrees C", value: 45 },
			{ unit: "degrees C", value: 60 },
			{ unit: "degrees C", value: 30 },
		]
		expect(getHighestTemperature(sensors)).toBe(60)
	})

	it("returns null for empty sensor data", () => {
		expect(getHighestTemperature([])).toBeNull()
		expect(getHighestTemperature()).toBeNull()
	})

	it("returns null for invalid values", () => {
		const sensors = [
			{ unit: "degrees C", value: "N/A" },
			{ unit: "degrees C", value: undefined },
			{ unit: "degrees C", value: "abc" },
		]
		expect(getHighestTemperature(sensors)).toBeNull()
	})

	it("ignores non-temperature units (mixed units)", () => {
		const sensors = [
			{ unit: "RPM", value: 5000 },
			{ unit: "degrees C", value: 55 },
			{ unit: "Watts", value: 200 },
		]
		expect(getHighestTemperature(sensors)).toBe(55)
	})
})

describe("crypto", () => {
	it("encrypt/decrypt roundtrip with ENCRYPTION_KEY set", () => {
		process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
		resetKeyCache()
		const plaintext = "mySecretPassword"
		const encrypted = encrypt(plaintext)
		expect(encrypted).not.toBe(plaintext)
		expect(isEncrypted(encrypted)).toBe(true)
		const decrypted = decrypt(encrypted)
		expect(decrypted).toBe(plaintext)
		delete process.env.ENCRYPTION_KEY
		resetKeyCache()
	})

	it("passthrough mode when ENCRYPTION_KEY not set", () => {
		delete process.env.ENCRYPTION_KEY
		resetKeyCache()
		const plaintext = "mySecretPassword"
		const encrypted = encrypt(plaintext)
		expect(encrypted).toBe(plaintext)
		const decrypted = decrypt(encrypted)
		expect(decrypted).toBe(plaintext)
	})

	it("isEncrypted detects encrypted strings", () => {
		process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
		resetKeyCache()
		const encrypted = encrypt("test")
		expect(isEncrypted(encrypted)).toBe(true)
		expect(isEncrypted("plain text")).toBe(false)
		expect(isEncrypted(null)).toBe(false)
		expect(isEncrypted(123)).toBe(false)
		delete process.env.ENCRYPTION_KEY
		resetKeyCache()
	})
})