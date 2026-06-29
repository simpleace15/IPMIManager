const fs = require("fs")
const mkdirp = require("mkdirp")
const express = require("express")
const http = require("http")
const promclient = require("prom-client")
const process = require("process")
const { Server } = require("socket.io")

const { calculateManualFanSpeed } = require("./fanControl")
const logger = require("./logger")
const settings = require("./settings")
const crypto = require("./crypto")

const port = process.argv[2] === "dev" ? 8082 : 8080

var app = express()
var server = http.createServer(app)
var io = new Server(server, {
	cors: { origin: "*" },
})
server.listen(port)
logger.info(`Server starting, listening on port ${port}`)

// Basic auth middleware (optional)
const AUTH_USERNAME = process.env.AUTH_USERNAME
const AUTH_PASSWORD = process.env.AUTH_PASSWORD

if (AUTH_USERNAME && AUTH_PASSWORD) {
	app.use((req, res, next) => {
		const auth = req.headers.authorization
		if (!auth || !auth.startsWith("Basic ")) {
			res.setHeader("WWW-Authenticate", 'Basic realm="IPMI Manager"')
			return res.status(401).send("Authentication required")
		}
		const encoded = auth.split(" ")[1]
		const decoded = Buffer.from(encoded, "base64").toString("utf8")
		const [user, pass] = decoded.split(":")
		if (user !== AUTH_USERNAME || pass !== AUTH_PASSWORD) {
			res.setHeader("WWW-Authenticate", 'Basic realm="IPMI Manager"')
			return res.status(401).send("Authentication required")
		}
		next()
	})
}

app.use("/", express.static("build"))
app.get("/info", (req, res) => {
	res.send("Dell server monitor express server")
})
app.get("/api/logs", (req, res) => {
	res.json(logger.getLogs())
})

// Set up prometheus
app.get("/metrics", async (req, res) => {
	const metrics = await promclient.register.metrics()
	res.set("Content-Type", promclient.register.contentType)
	res.send(metrics)
})
promclient.collectDefaultMetrics({
	labels: { application: "serverManager" },
})
const gauge = new promclient.Gauge({
	name: "servermanager_statistics_gauge",
	help: "Contains all gauge statistics from the dell server manager labeled by name and type, ex fan speed or temperature",
	labelNames: ["name", "type", "unit", "address", "host_name"],
})

const units = require("./units")
const { getSensors, enableManualFancontrol, enableAutomaticFancontrol, setFanSpeed } = require("./ipmi")
mkdirp.sync("./data")
mkdirp.sync("./data/logs")

// Load settings at startup
const currentSettings = settings.loadSettings()
logger.configure({
	maxLogEntries: currentSettings.maxLogEntries,
	fileLogging: currentSettings.fileLogging,
	logLevel: currentSettings.logLevel,
	logRetentionDays: currentSettings.logRetentionDays,
})
logger.info("Settings loaded", currentSettings)

let serversOnDisk = ""
let servers
try {
	let data = fs.readFileSync("./data/servers.json", "utf8")
	if (data) {
		serversOnDisk = data
		servers = JSON.parse(data)
		// Decrypt passwords on load
		servers.forEach((server) => {
			if (server.password) {
				server.password = crypto.decrypt(server.password)
			}
		})
		logger.info("Loaded server data from disk")
	}
} catch (e) {
	// no data file yet
}
function save() {
	if (JSON.stringify(servers, null, 4) !== serversOnDisk) {
		// Encrypt passwords before saving
		const encryptedServers = servers.map((server) => ({
			...server,
			password: server.password ? crypto.encrypt(server.password) : server.password,
		}))
		serversOnDisk = JSON.stringify(servers, null, 4)
		fs.writeFileSync("./data/servers.json", JSON.stringify(encryptedServers, null, 4))
		logger.info("Saved server data to disk")
	}
}
setInterval(save, currentSettings.autosaveInterval)
const clients = []
servers = servers || [
	{
		name: "R720 main",
		address: "192.168.10.170",
		username: "root",
		password: "calvin",
		warnspeed: "3000",
		sensordataRaw: [],
		sensordata: [],
	},
	{
		name: "R720 secondary",
		address: "192.168.10.169",
		username: "root",
		password: "calvin",
		warnspeed: "3000",
		sensordataRaw: [],
		sensordata: [],
	},
]

function validateServer(server, existingServers = []) {
	const errors = []
	if (!server) {
		return ["Server object is required"]
	}
	const { name, address, username, password } = server
	if (!name) errors.push("name is required")
	if (!address) errors.push("address is required")
	if (!username) errors.push("username is required")
	if (!password) errors.push("password is required")

	// 255 char max on string fields
	if (name && name.length > 255) errors.push("name must be 255 characters or fewer")
	if (address && address.length > 255) errors.push("address must be 255 characters or fewer")
	if (username && username.length > 255) errors.push("username must be 255 characters or fewer")
	if (password && password.length > 255) errors.push("password must be 255 characters or fewer")

	// IP / hostname format check
	if (address) {
		const octetRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
		const ipRegex = new RegExp(`^${octetRegex.source}\\.${octetRegex.source}\\.${octetRegex.source}\\.${octetRegex.source}$`)
		const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,253}[a-zA-Z0-9])?(\\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,253}[a-zA-Z0-9])?)*$/
		if (!ipRegex.test(address) && !hostnameRegex.test(address)) {
			errors.push("address must be a valid IP address or hostname")
		}
	}

	// Duplicate address/name check
	if (address) {
		const dup = existingServers.find((s) => s.address === address)
		if (dup) errors.push("address already exists")
	}
	if (name) {
		const dup = existingServers.find((s) => s.name === name)
		if (dup) errors.push("name already exists")
	}

	return errors.length ? errors : null
}

// Startup tasks
servers.forEach(async (server) => {
	try {
		if (server.manualFanControl) {
			await enableManualFancontrol(server)
		} else {
			await enableAutomaticFancontrol(server)
		}
	} catch (e) {
		logger.warn(`Startup fan control failed for ${server.name}: ${e.message}`)
	}
})

async function updateServers() {
	for (let i in servers) {
		let config = servers[i]
		try {
			config.sensordataRaw = await getSensors(config)
		} catch (e) {
			logger.warn(`getSensors failed for ${config.name}: ${e.message}`)
			config.sensordataRaw = []
			config.sensordata = config.sensordata || []
			broadcast("sensordata", {
				name: config.name,
				sensordata: config.sensordata,
			})
			continue
		}
		// Transform sensor data into easier to use format
		config.sensordata = config.sensordataRaw.map((sensor, i) => {
			return {
				name: sensor[0],
				value: sensor[1],
				unit: sensor[2],
				status: sensor[3],
				x: sensor[4],
				ALL: sensor[5],
				WL: sensor[6],
				WH: sensor[7],
				AHH: sensor[8],
				y: sensor[9],
				trend: Number(sensor[1]) - Number(config.sensordata[i]?.previousValue) || undefined,
				previousValue: config.sensordata[i]?.value,
			}
		})
		broadcast("sensordata", {
			name: config.name,
			sensordata: config.sensordata,
		})
		if (config.manualFanControl) {
			const { targetFanSpeed, highestTemperature, reason } = calculateManualFanSpeed(config)
			logger.info(`Highest temperature is ${highestTemperature} ${reason ? `reason=${reason}` : ""} Setting fan speed ${targetFanSpeed}%`)
			try {
				await setFanSpeed(config, targetFanSpeed)
			} catch (e) {
				logger.warn(`setFanSpeed failed for ${config.name}: ${e.message}`)
			}
		}
	}
	// Report metrics to prometheus
	if (currentSettings.prometheusEnabled) {
		promclient.register.resetMetrics()
		for (let config of servers) {
			config.sensordata
				.filter((x) => !Number.isNaN(Number(x.value)))
				.forEach((sensor) => {
					gauge.set(
						{
							name: sensor.name,
							type: units.unit_to_type[sensor.unit],
							unit: sensor.unit,
							address: config.address,
							host_name: config.name,
						},
						Number(sensor.value)
					)
				})
		}
	}
}
function broadcast(channel, data) {
	clients.forEach((client) => client.socket.emit(channel, data))
}

let updateTimer = null
async function updateServerLoop() {
	let lastUpdateStart = Date.now()
	logger.debug("updateServers started")
	await updateServers()
	logger.debug("updateServers finished")
	const elapsed = Date.now() - lastUpdateStart
	updateTimer = setTimeout(updateServerLoop, Math.max(0, currentSettings.pollInterval - elapsed))
}
updateServerLoop()

io.on("connection", (socket) => {
	socket.on("registerWebclient", ({ id }) => {
		logger.info(`Client registered: ${id}`)
		let client = {
			socket,
			id,
			tagListeners: [],
			screenListeners: [],
		}
		clients.push(client)
		socket.emit("servers", servers)
	})
	socket.on("getServers", () => {
		socket.emit("servers", servers)
	})
	socket.on("getSettings", () => {
		socket.emit("settings", settings.getSettings())
	})
	socket.on("updateSettings", (newSettings) => {
		const updated = settings.updateSettings(newSettings)
		logger.configure({
			maxLogEntries: updated.maxLogEntries,
			fileLogging: updated.fileLogging,
			logLevel: updated.logLevel,
			logRetentionDays: updated.logRetentionDays,
		})
		broadcast("settings", updated)
	})
	socket.on("getLogs", (filters) => {
		socket.emit("logs", logger.getLogs(filters))
	})
	socket.on("clearLogs", () => {
		logger.clearLogs()
		broadcast("logs", [])
	})
	socket.on("updateServer", async ({ address, update }) => {
		logger.info("Updating server", { address, update: cleanSensitive(update) })
		let server = servers.find((x) => x.address === address)

		// If we toggled the manualFanControl option, run IPMI to toggle fan control mode
		if (server.manualFanControl !== update.manualFanControl) {
			try {
				if (update.manualFanControl) {
					await enableManualFancontrol(server)
				} else {
					await enableAutomaticFancontrol(server)
				}
			} catch (e) {
				logger.warn(`Fan control toggle failed for ${address}: ${e.message}`)
			}
		}

		// Merge to prevent stale overwrites
		const idx = servers.indexOf(server)
		servers[idx] = { ...server, ...update }
		broadcast("servers", servers)

		// Reset prometheus gauges in case some of the label names were changed
		promclient.register.resetMetrics()
	})
	socket.on("addServer", ({ server }) => {
		const errors = validateServer(server, servers)
		if (errors) {
			logger.warn(`addServer validation failed: ${errors.join(", ")}`)
			socket.emit("addServerError", { errors })
			return
		}
		servers.push(server)
		broadcast("servers", servers)
	})
	socket.on("deleteServer", ({ address }) => {
		servers = servers.filter((x) => x.address !== address)
		broadcast("servers", servers)
	})
	socket.on("disconnect", () => {
		const idx = clients.findIndex((c) => c.socket === socket)
		if (idx !== -1) {
			clients.splice(idx, 1)
			logger.debug(`Client disconnected, removed from clients list`)
		}
	})
})

function cleanSensitive(object) {
	let clean = { ...object }
	if (clean.password) clean.password = "hidden"
	return clean
}

// Graceful shutdown
function gracefulShutdown(signal) {
	logger.info(`Received ${signal}, shutting down gracefully`)
	if (updateTimer) clearTimeout(updateTimer)
	try {
		save()
	} catch (e) {
		logger.error(`Error saving during shutdown: ${e.message}`)
	}
	server.close(() => {
		logger.info("HTTP server closed")
	})
	io.close(() => {
		logger.info("Socket.io server closed")
	})
	setTimeout(() => {
		process.exit(0)
	}, 1000)
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))
logger.info("Server startup complete")