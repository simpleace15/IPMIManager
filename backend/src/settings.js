const fs = require("fs")
const path = require("path")

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json")

const DEFAULT_SETTINGS = {
	pollInterval: 30000,
	logLevel: "info",
	logRetentionDays: 30,
	maxLogEntries: 1000,
	fileLogging: true,
	fanMinSpeed: 0,
	fanMaxSpeed: 100,
	prometheusEnabled: true,
	autosaveInterval: 60000,
	theme: "dark",
}

let currentSettings = null

function loadSettings() {
	let loaded = {}
	try {
		const data = fs.readFileSync(SETTINGS_PATH, "utf8")
		if (data) {
			loaded = JSON.parse(data)
		}
	} catch (e) {
		// file may not exist yet
	}
	currentSettings = { ...DEFAULT_SETTINGS, ...loaded }
	return currentSettings
}

function validateSettings(settings) {
	if (typeof settings !== "object" || settings === null) return false
	return true
}

function saveSettings(newSettings) {
	if (!validateSettings(newSettings)) {
		throw new Error("Invalid settings")
	}
	currentSettings = { ...DEFAULT_SETTINGS, ...newSettings }
	const dir = path.dirname(SETTINGS_PATH)
	try {
		fs.mkdirSync(dir, { recursive: true })
	} catch (e) {
		// dir may already exist
	}
	fs.writeFileSync(SETTINGS_PATH, JSON.stringify(currentSettings, null, 4))
	return currentSettings
}

function getSettings() {
	if (!currentSettings) {
		return loadSettings()
	}
	return currentSettings
}

function updateSettings(partial) {
	const current = getSettings()
	const merged = { ...current, ...partial }
	return saveSettings(merged)
}

module.exports = {
	loadSettings,
	saveSettings,
	getSettings,
	updateSettings,
	DEFAULT_SETTINGS,
}