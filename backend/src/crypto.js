const crypto = require("crypto")

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
// Marker prefix to identify encrypted strings. Format: "ENC:<ivHex>:<authTagHex>:<ciphertextHex>"
const PREFIX = "ENC:"

let key = null
let keyResolved = false

function resetKeyCache() {
	key = null
	keyResolved = false
}

function getKey() {
	if (keyResolved) return key
	keyResolved = true
	const envKey = process.env.ENCRYPTION_KEY
	if (!envKey) {
		key = null
		return null
	}
	// Try to decode as hex (64 chars = 32 bytes) first, then base64
	let decoded
	if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
		decoded = Buffer.from(envKey, "hex")
	} else {
		try {
			decoded = Buffer.from(envKey, "base64")
		} catch (e) {
			return null
		}
	}
	if (decoded.length !== 32) return null
	key = decoded
	return key
}

function encrypt(plaintext) {
	const k = getKey()
	if (!k) return plaintext // passthrough (legacy mode)
	if (plaintext === null || plaintext === undefined) return plaintext
	const text = String(plaintext)
	const iv = crypto.randomBytes(IV_LENGTH)
	const cipher = crypto.createCipheriv(ALGORITHM, k, iv)
	let encrypted = cipher.update(text, "utf8", "hex")
	encrypted += cipher.final("hex")
	const authTag = cipher.getAuthTag()
	return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

function decrypt(ciphertext) {
	const k = getKey()
	if (!k) return ciphertext // passthrough (legacy mode)
	if (typeof ciphertext !== "string" || !ciphertext.startsWith(PREFIX)) return ciphertext
	try {
		const rest = ciphertext.slice(PREFIX.length)
		const parts = rest.split(":")
		if (parts.length !== 3) return ciphertext
		const iv = Buffer.from(parts[0], "hex")
		const authTag = Buffer.from(parts[1], "hex")
		const encrypted = parts[2]
		const decipher = crypto.createDecipheriv(ALGORITHM, k, iv)
		decipher.setAuthTag(authTag)
		let decrypted = decipher.update(encrypted, "hex", "utf8")
		decrypted += decipher.final("utf8")
		return decrypted
	} catch (e) {
		return ciphertext
	}
}

function isEncrypted(str) {
	return typeof str === "string" && str.startsWith(PREFIX)
}

module.exports = {
	encrypt,
	decrypt,
	isEncrypted,
	resetKeyCache,
}