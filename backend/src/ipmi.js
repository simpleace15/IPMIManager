const { execFile } = require("child_process")

function buildBaseArgs(config) {
	return [
		"-I", "lanplus",
		"-H", config.address,
		"-U", config.username,
		"-P", config.password,
	]
}

function getSensors(config) {
	return new Promise((resolve, reject) => {
		const args = [...buildBaseArgs(config), "sensor"]
		execFile("ipmitool", args, (error, out, err) => {
			if (error) {
				return reject(error)
			}
			if (!out) {
				return resolve([])
			}
			try {
				const data = out
					.split("\n")
					.map((x) => x.split("|").map((y) => y.trim()))
					.filter((x) => x[1] !== "na" && x[0])
				resolve(data)
			} catch (e) {
				reject(e)
			}
		})
	})
}

function enableManualFancontrol(config) {
	return new Promise((resolve, reject) => {
		const args = [...buildBaseArgs(config), "raw", "0x30", "0x30", "0x01", "0x00"]
		execFile("ipmitool", args, (error, out, err) => {
			if (error) {
				return reject(error)
			}
			resolve(out)
		})
	})
}

function enableAutomaticFancontrol(config) {
	return new Promise((resolve, reject) => {
		const args = [...buildBaseArgs(config), "raw", "0x30", "0x30", "0x01", "0x01"]
		execFile("ipmitool", args, (error, out, err) => {
			if (error) {
				return reject(error)
			}
			resolve(out)
		})
	})
}

function setFanSpeed(config, speed) {
	return new Promise((resolve, reject) => {
		let hexSpeed
		try {
			hexSpeed = speed.toString(16).padStart(2, "0")
		} catch (e) {
			return reject(e)
		}
		if (process.argv[2] !== "dev") {
			const args = [...buildBaseArgs(config), "raw", "0x30", "0x30", "0x02", "0xff", `0x${hexSpeed}`]
			execFile("ipmitool", args, (error, out, err) => {
				if (error) {
					return reject(error)
				}
				resolve(out)
			})
		} else {
			execFile("ls", [], (error, out, err) => {
				if (error) {
					return reject(error)
				}
				resolve(out)
			})
		}
	})
}

module.exports = {
	getSensors,
	enableManualFancontrol,
	enableAutomaticFancontrol,
	setFanSpeed,
}