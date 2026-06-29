const fs = require("fs")
const path = require("path")

const LEVELS = ["debug", "info", "warn", "error"]
const LEVEL_PRIORITY = { debug: 0, info: 1, warn: 2, error: 3 }

let ringBuffer = []
let maxEntries = 1000
let fileLogging = true
let logLevel = "info"
let logRetentionDays = 30
let logDir = path.join(process.cwd(), "data", "logs")

function configure(options = {}) {
	if (options.maxLogEntries) maxEntries = options.maxLogEntries
	if (typeof options.fileLogging === "boolean") fileLogging = options.fileLogging
	if (options.logLevel) logLevel = options.logLevel
	if (options.logRetentionDays) logRetentionDays = options.logRetentionDays
}

function shouldLog(level) {
	const priority = LEVEL_PRIORITY[level]
	if (priority === undefined) return true
	return priority >= (LEVEL_PRIORITY[logLevel] ?? 1)
}

function formatDate(d) {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, "0")
	const day = String(d.getDate()).padStart(2, "0")
	return `${y}-${m}-${day}`
}

function formatTimestamp(d) {
	return d.toISOString()
}

function ensureLogDir() {
	try {
		fs.mkdirSync(logDir, { recursive: true })
	} catch (e) {
		// ignore
	}
}

function writeToFile(entry) {
	if (!fileLogging) return
	try {
		ensureLogDir()
		const filename = path.join(logDir, `ipmimanager-${formatDate(new Date())}.log`)
		const line = JSON.stringify(entry) + "\n"
		fs.appendFileSync(filename, line)
	} catch (e) {
		// silently ignore file write errors
	}
}

function pruneOldLogs() {
	if (!fileLogging || logRetentionDays <= 0) return
	try {
		ensureLogDir()
		const files = fs.readdirSync(logDir)
		const cutoff = Date.now() - logRetentionDays * 24 * 60 * 60 * 1000
		for (const file of files) {
			if (!file.startsWith("ipmimanager-") || !file.endsWith(".log")) continue
			const stat = fs.statSync(path.join(logDir, file))
			if (stat.mtimeMs < cutoff) {
				fs.unlinkSync(path.join(logDir, file))
			}
		}
	} catch (e) {
		// ignore
	}
}

function consoleWrite(entry) {
	const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`
	let line = `${prefix} ${entry.message}`
	if (entry.metadata !== undefined) {
		line += " " + JSON.stringify(entry.metadata)
	}
	const fn = entry.level === "error" ? console.error : entry.level === "warn" ? console.warn : console.log
	fn(line)
}

function log(level, message, metadata) {
	if (!LEVELS.includes(level)) {
		level = "info"
	}
	if (!shouldLog(level)) return
	const entry = {
		timestamp: formatTimestamp(new Date()),
		level,
		message: String(message),
	}
	if (metadata !== undefined) {
		entry.metadata = metadata
	}
	ringBuffer.push(entry)
	if (ringBuffer.length > maxEntries) {
		ringBuffer = ringBuffer.slice(ringBuffer.length - maxEntries)
	}
	consoleWrite(entry)
	writeToFile(entry)
}

function debug(message, metadata) {
	log("debug", message, metadata)
}
function info(message, metadata) {
	log("info", message, metadata)
}
function warn(message, metadata) {
	log("warn", message, metadata)
}
function error(message, metadata) {
	log("error", message, metadata)
}

function getLogs(filters = {}) {
	let result = ringBuffer
	if (filters.level) {
		result = result.filter((e) => e.level === filters.level)
	}
	if (filters.since) {
		result = result.filter((e) => new Date(e.timestamp).getTime() >= filters.since)
	}
	if (filters.limit) {
		result = result.slice(-filters.limit)
	}
	return result
}

function clearLogs() {
	ringBuffer = []
}

module.exports = {
	log,
	debug,
	info,
	warn,
	error,
	getLogs,
	clearLogs,
	configure,
	pruneOldLogs,
	LEVELS,
}