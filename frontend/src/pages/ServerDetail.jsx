import React from "react"
import { Card, Row, Col, Statistic, Tooltip, Divider, Typography, Tag, Descriptions, Empty } from "antd"
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ThunderboltOutlined,
  FireOutlined,
  ReloadOutlined,
} from "@ant-design/icons"

function SensorCard({ sensor, darkMode, type }) {
  const value = Number(sensor.value)
  const prev = Number(sensor.previousValue)
  const trend = sensor.trend
  const cardBg = darkMode ? "#111827" : "#fff"
  const innerBg = darkMode ? "#0d1117" : "#fafafa"

  let color = "#1668dc"
  let icon = <ThunderboltOutlined />

  if (type === "temp") {
    icon = <FireOutlined />
    if (value > 75) color = "#cf1322"
    else if (value > 60) color = "#faad14"
    else color = "#52c41a"
  } else if (type === "fan") {
    icon = <ReloadOutlined />
    const warn = Number(sensor.WH) || 3000
    const critical = Number(sensor.WL) || 1000
    if (value < critical) color = "#cf1322"
    else if (value < warn) color = "#faad14"
    else color = "#52c41a"
  } else if (type === "power") {
    icon = <ThunderboltOutlined />
    color = "#1668dc"
  }

  const trendIcon =
    trend > 0 ? <ArrowUpOutlined style={{ fontSize: 10, color: "#cf1322" }} /> :
    trend < 0 ? <ArrowDownOutlined style={{ fontSize: 10, color: "#52c41a" }} /> : null

  return (
    <Col xs={12} sm={8} md={6} lg={4} key={sensor.name + sensor.unit}>
      <Tooltip title={`Previous: ${Math.floor(prev) || "--"} · Status: ${sensor.status || "Unknown"}`}>
        <div
          style={{
            padding: "14px",
            background: innerBg,
            borderRadius: 8,
            border: darkMode ? "1px solid #1e2738" : "1px solid #f0f0f0",
            textAlign: "center",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ marginBottom: 6 }}>
            {React.cloneElement(icon, { style: { fontSize: 18, color } })}
          </div>
          <Statistic
            value={sensor.value}
            precision={sensor.unit === "Amps" ? 2 : 0}
            suffix={
              <span style={{ fontSize: 12, color: darkMode ? "#8b96a8" : "#8c8c8c" }}>
                {sensor.unit} {trendIcon}
              </span>
            }
            valueStyle={{ fontSize: 20, color, fontWeight: 600 }}
          />
          <div
            style={{
              fontSize: 11,
              color: darkMode ? "#8b96a8" : "#8c8c8c",
              marginTop: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {sensor.name}
          </div>
        </div>
      </Tooltip>
    </Col>
  )
}

function SensorSection({ title, icon, sensors, darkMode, type }) {
  if (!sensors || sensors.length === 0) return null
  const sectionBg = darkMode ? "#111827" : "#fff"
  const sectionBorder = darkMode ? "#1e2738" : "#f0f0f0"
  const labelColor = darkMode ? "#8b96a8" : "#595959"

  return (
    <Card
      title={
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon}
          <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
          <Tag style={{ marginLeft: 4 }}>{sensors.length}</Tag>
        </span>
      }
      style={{ background: sectionBg, borderColor: sectionBorder, marginBottom: 16 }}
      styles={{ header: { borderBottom: darkMode ? "1px solid #1e2738" : "1px solid #f0f0f0" } }}
    >
      <Row gutter={[12, 12]}>
        {sensors.map((s, i) => (
          <SensorCard key={`${s.name}-${i}`} sensor={s} darkMode={darkMode} type={type} />
        ))}
      </Row>
    </Card>
  )
}

export default function ServerDetail({ server, darkMode }) {
  const data = server.sensordata || []
  const temps = data.filter((s) => s.unit === "degrees C")
  const fans = data.filter((s) => s.unit === "RPM")
  const power = data.filter((s) => ["Volts", "Amps", "Watts"].includes(s.unit))
  const misc = data.filter((s) => !["degrees C", "RPM", "Volts", "Amps", "Watts"].includes(s.unit))

  const maxTemp = temps.length ? Math.max(...temps.map((s) => Number(s.value))) : null
  const totalPower = power.filter((s) => s.unit === "Watts").reduce((a, s) => a + Number(s.value), 0)
  const minFan = fans.length ? Math.min(...fans.map((s) => Number(s.value))) : null
  const warnSpeed = Number(server.warnspeed) || 3000

  const headerBg = darkMode ? "#111827" : "#fff"
  const headerBorder = darkMode ? "#1e2738" : "#f0f0f0"
  const labelColor = darkMode ? "#8b96a8" : "#8c8c8c"

  let statusTag
  if (!data.length) {
    statusTag = <Tag color="default">No Data</Tag>
  } else if (maxTemp > 75) {
    statusTag = <Tag color="error">Critical</Tag>
  } else if (minFan < warnSpeed) {
    statusTag = <Tag color="warning">Warning</Tag>
  } else {
    statusTag = <Tag color="success">Normal</Tag>
  }

  return (
    <div>
      {/* Server header */}
      <Card
        style={{ background: headerBg, borderColor: headerBorder, marginBottom: 16 }}
        styles={{ body: { padding: 20 } }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0, color: darkMode ? "#e6eaf0" : "#1f1f1f" }}>
              {server.name}
            </Typography.Title>
            <div style={{ color: labelColor, fontSize: 13, marginTop: 4 }}>
              {server.address} · {server.manualFanControl ? "Manual Fan Control" : "Auto Fan Control"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {statusTag}
          </div>
        </div>

        {data.length > 0 && (
          <Row gutter={[24, 16]} style={{ marginTop: 20 }}>
            <Col xs={12} sm={6}>
              <Statistic
                title="Max Temp"
                value={maxTemp ?? "--"}
                suffix="°C"
                valueStyle={{ color: maxTemp > 75 ? "#cf1322" : maxTemp > 60 ? "#faad14" : "#52c41a" }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Total Power"
                value={totalPower || "--"}
                suffix="W"
                valueStyle={{ color: "#1668dc" }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Min Fan"
                value={minFan ?? "--"}
                suffix=" RPM"
                valueStyle={{ color: minFan < warnSpeed ? "#cf1322" : "#52c41a" }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Sensors"
                value={data.length}
                valueStyle={{ color: labelColor }}
              />
            </Col>
          </Row>
        )}
      </Card>

      {data.length === 0 ? (
        <Card style={{ background: headerBg, borderColor: headerBorder }}>
          <Empty description="Waiting for sensor data from IPMI..." />
        </Card>
      ) : (
        <>
          <SensorSection
            title="Temperature"
            icon={<FireOutlined style={{ color: "#fa541c" }} />}
            sensors={temps}
            darkMode={darkMode}
            type="temp"
          />
          <SensorSection
            title="Fans"
            icon={<ReloadOutlined style={{ color: "#1668dc" }} />}
            sensors={fans}
            darkMode={darkMode}
            type="fan"
          />
          <SensorSection
            title="Power"
            icon={<ThunderboltOutlined style={{ color: "#722ed1" }} />}
            sensors={power}
            darkMode={darkMode}
            type="power"
          />
          {misc.length > 0 && (
            <SensorSection
              title="Other"
              icon={<ThunderboltOutlined />}
              sensors={misc}
              darkMode={darkMode}
              type="other"
            />
          )}
        </>
      )}
    </div>
  )
}