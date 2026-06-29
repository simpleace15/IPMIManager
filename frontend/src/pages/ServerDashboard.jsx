import React from "react"
import { Row, Col, Card, Statistic, Tag, Empty, Spin, Progress, Typography } from "antd"
import {
  ThunderboltOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FireOutlined,
  DashboardOutlined,
} from "@ant-design/icons"

function getServerMetrics(server) {
  const data = server.sensordata || []
  const temps = data.filter((s) => s.unit === "degrees C")
  const fans = data.filter((s) => s.unit === "RPM")
  const power = data.filter((s) => s.unit === "Watts")

  const maxTemp = temps.length ? Math.max(...temps.map((s) => Number(s.value))) : null
  const minFan = fans.length ? Math.min(...fans.map((s) => Number(s.value))) : null
  const avgFan = fans.length ? Math.round(fans.reduce((a, s) => a + Number(s.value), 0) / fans.length) : null
  const powerDraw = power.length ? power.reduce((a, s) => a + Number(s.value), 0) : null

  return { maxTemp, minFan, avgFan, powerDraw, temps, fans, power, hasData: data.length > 0 }
}

function tempColor(temp) {
  if (temp === null) return "#8c8c8c"
  if (temp > 75) return "#cf1322"
  if (temp > 60) return "#faad14"
  return "#52c41a"
}

function fanColor(fan, warn) {
  if (fan === null) return "#8c8c8c"
  if (fan < warn) return "#cf1322"
  if (fan < warn * 1.2) return "#faad14"
  return "#52c41a"
}

function ServerCard({ server, darkMode, onClick }) {
  const { maxTemp, minFan, avgFan, powerDraw, hasData, temps, fans } = getServerMetrics(server)
  const warnSpeed = Number(server.warnspeed) || 3000

  let statusTag
  if (!hasData) {
    statusTag = <Tag icon={<Spin size="small" />} color="default">No data</Tag>
  } else if (maxTemp !== null && maxTemp > 75) {
    statusTag = <Tag icon={<AlertOutlined />} color="error">Critical</Tag>
  } else if (minFan !== null && minFan < warnSpeed) {
    statusTag = <Tag icon={<WarningOutlined />} color="warning">Warning</Tag>
  } else {
    statusTag = <Tag icon={<CheckCircleOutlined />} color="success">Normal</Tag>
  }

  const cardBg = darkMode ? "#111827" : "#fff"
  const cardBorder = darkMode ? "#1e2738" : "#f0f0f0"
  const labelColor = darkMode ? "#8b96a8" : "#8c8c8c"

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        background: cardBg,
        borderColor: cardBorder,
        transition: "all 0.2s ease",
      }}
      styles={{ body: { padding: 20 } }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: darkMode ? "#1a1f2e" : "#f0f5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DashboardOutlined style={{ fontSize: 18, color: "#1668dc" }} />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 15, color: darkMode ? "#e6eaf0" : "#1f1f1f" }}>
              {server.name}
            </Typography.Text>
            <div style={{ fontSize: 11, color: labelColor }}>{server.address}</div>
          </div>
        </div>
        {statusTag}
      </div>

      {/* Metrics grid */}
      {hasData ? (
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <div style={{ padding: "12px", background: darkMode ? "#0d1117" : "#fafafa", borderRadius: 8, textAlign: "center" }}>
              <FireOutlined style={{ fontSize: 16, color: tempColor(maxTemp) }} />
              <Statistic
                value={maxTemp ?? "--"}
                suffix="°C"
                valueStyle={{ fontSize: 22, color: tempColor(maxTemp) }}
                title="Max Temp"
              />
              <div style={{ fontSize: 11, color: labelColor, marginTop: 2 }}>
                {temps.length} sensors
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ padding: "12px", background: darkMode ? "#0d1117" : "#fafafa", borderRadius: 8, textAlign: "center" }}>
              <ThunderboltOutlined style={{ fontSize: 16, color: "#1668dc" }} />
              <Statistic
                value={powerDraw ?? "--"}
                suffix="W"
                valueStyle={{ fontSize: 22, color: "#1668dc" }}
                title="Power"
              />
              <div style={{ fontSize: 11, color: labelColor, marginTop: 2 }}>
                {server.sensordata.filter((s) => s.unit === "Watts").length} rails
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ padding: "12px", background: darkMode ? "#0d1117" : "#fafafa", borderRadius: 8, textAlign: "center" }}>
              <AlertOutlined style={{ fontSize: 16, color: fanColor(minFan, warnSpeed) }} />
              <Statistic
                value={avgFan ?? "--"}
                suffix=" RPM"
                valueStyle={{ fontSize: 22, color: fanColor(minFan, warnSpeed) }}
                title="Avg Fan"
              />
              <div style={{ fontSize: 11, color: labelColor, marginTop: 2 }}>
                {fans.length} fans · warn {warnSpeed}
              </div>
            </div>
          </Col>
        </Row>
      ) : (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Empty description="Waiting for sensor data..." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )}
    </Card>
  )
}

export default function ServerDashboard({ servers, darkMode, onSelectServer }) {
  const totalServers = servers.length
  const onlineServers = servers.filter((s) => s.sensordata && s.sensordata.length > 0).length
  const allMetrics = servers.map(getServerMetrics)
  const highestTemp = allMetrics
    .map((m) => m.maxTemp)
    .filter((t) => t !== null)
    .reduce((max, t) => Math.max(max, t), 0)
  const totalPower = allMetrics
    .map((m) => m.powerDraw)
    .filter((p) => p !== null)
    .reduce((sum, p) => sum + p, 0)

  const statCardBg = darkMode ? "#111827" : "#fff"
  const statCardBorder = darkMode ? "#1e2738" : "#f0f0f0"

  return (
    <div>
      {/* Summary stats bar */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card style={{ background: statCardBg, borderColor: statCardBorder }} styles={{ body: { padding: 16 } }}>
            <Statistic
              title="Servers"
              value={totalServers}
              suffix={`/ ${onlineServers} online`}
              valueStyle={{ color: "#1668dc" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: statCardBg, borderColor: statCardBorder }} styles={{ body: { padding: 16 } }}>
            <Statistic
              title="Highest Temp"
              value={highestTemp || "--"}
              suffix="°C"
              valueStyle={{ color: tempColor(highestTemp) }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: statCardBg, borderColor: statCardBorder }} styles={{ body: { padding: 16 } }}>
            <Statistic
              title="Total Power"
              value={totalPower || "--"}
              suffix="W"
              valueStyle={{ color: "#1668dc" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: statCardBg, borderColor: statCardBorder }} styles={{ body: { padding: 16 } }}>
            <Statistic
              title="System Status"
              value={onlineServers === totalServers ? "All OK" : "Check"}
              valueStyle={{
                color: onlineServers === totalServers ? "#52c41a" : "#faad14",
                fontSize: 20,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Server cards */}
      {servers.length === 0 ? (
        <Card style={{ background: statCardBg, borderColor: statCardBorder }}>
          <Empty description="No servers configured. Go to Settings → Connections to add one." />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {servers.map((server) => (
            <Col xs={24} sm={12} lg={8} key={server.address}>
              <ServerCard
                server={server}
                darkMode={darkMode}
                onClick={() => onSelectServer(server.address)}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}