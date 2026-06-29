import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { encrypt, decrypt, isEncryptionEnabled } from "../src/crypto"

describe("crypto", () => {
	const originalKey = process.env.ENCRYPTION_KEY

	beforeEach(() => {
		process.env.ENCRYPTION_KEY = "test-key-1234567890123456789012"
	})

	afterEach(() => {
		process.env.ENCRYPTION_KEY = originalKey
	})

	describe("isEncryptionEnabled", () => {
		it("returns true when ENCRYPTION_KEY is set", () => {
			expect(isEncryptionEnabled()).toBe(true)
		})

		it("returns false when ENCRYPTION_KEY is empty", () => {
			delete process.env.ENCRYPTION_KEY
			expect(isEncryptionEnabled()).toBe(false)
		})
	})

	describe("encrypt/decrypt roundtrip", () => {
		it("encrypts and decrypts a string correctly", () => {
			const original = "calvin"
			const encrypted = encrypt(original)
			expect(encrypted).not.toBe(original)
			expect(encrypted.startsWith("enc:")).toBe(true)
			expect(decrypt(encrypted)).toBe(original)
		})

		it("produces different ciphertext for same plaintext (random IV)", () => {
			const a = encrypt("calvin")
			const b = encrypt("calvin")
			expect(a).not.toBe(b)
		})

		it("decrypts a known encrypted value", () => {
			const encrypted = encrypt("mySecret123")
			const decrypted = decrypt(encrypted)
			expect(decrypted).toBe("mySecret123")
		})
	})

	describe("plaintext passthrough", () => {
		it("encrypt returns plaintext when encryption is disabled", () => {
			delete process.env.ENCRYPTION_KEY
			expect(encrypt("calvin")).toBe("calvin")
		})

		it("decrypt returns plaintext for non-encrypted values", () => {
			expect(decrypt("plaintext-password")).toBe("plaintext-password")
		})

		it("decrypt returns null/undefined as-is", () => {
			expect(decrypt(null)).toBeNull()
			expect(decrypt(undefined)).toBeUndefined()
		})
	})

	describe("tamper detection", () => {
		it("returns the tampered value when auth tag is invalid", () => {
			const encrypted = encrypt("secret")
			// Tamper with the encrypted data
			const parts = encrypted.split(":")
			const tampered = `enc:${parts[1]}:${parts[2]}:AAAAAAAAAAAA`
			// decrypt should return the tampered string (not crash) when auth tag fails
			const result = decrypt(tampered)
			expect(typeof result).toBe("string")
		})
	})
})