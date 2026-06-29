import React, { Component } from "react"
import { ConfigProvider, Layout, Menu, theme as antdTheme, Badge, Tooltip, Button } from "antd"
import {
  DesktopOutlined,
  SettingOutlined,
  FileTextOutlined,
  DashboardOutlined,
  ReloadOutlined,
} from "@ant-design/icons"
import { getWebclient } from "./api/index"
import ServerDashboard from "./pages/ServerDashboard"
import ServerDetail from "./pages/ServerDetail"
import SettingsPage from "./pages/SettingsPage"
import LogViewer from "./pages/LogViewer"
import socket from "./api/index"

const { Sider, Content, Header } = Layout

function getValue(key) {
  try {
    return JSON.parse(localStorage[key])
  } catch (e) {
    return undefined
  }
}
function setValue(key, value) {
  localStorage[key] = JSON.stringify(value)
}

const DARK = {
  colorBgLayout: "#0a0e17",
  colorBgContainer: "#111827",
  colorBgElevated: "#1a1f2e",
  colorBorder: "#1e2738",
  colorBorderSecondary: "#162032",
}

const LIGHT = {}

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      servers: [],
      activeView: getValue("activeView") || "dashboard",
      selectedServer: getValue("selectedServer") || null,
      collapsed: getValue("collapsed") || false,
      darkMode: getValue("darkMode") !== false,
      connectionStatus: "connecting",
    }
  }

  componentDidMount() {
    const s = getWebclient()
    s.on("servers", (servers) => this.setState({ servers, connectionStatus: "connected" }))
    s.on("sensordata", (data) => {
      const servers = this.state.servers
      const server = servers.find((x) => x.name === data.name)
      if (server) {
        server.sensordata = data.sensordata
        this.setState({ servers })
      }
    })
    s.on("connect", () => this.setState({ connectionStatus: "connected" }))
    s.on("disconnect", () => this.setState({ connectionStatus: "disconnected" }))
    s.on("connect_error", () => this.setState({ connectionStatus: "disconnected" }))
  }

  setView(view, serverAddress) {
    this.setState({ activeView: view, selectedServer: serverAddress || null })
    setValue("activeView", view)
    if (serverAddress) setValue("selectedServer", serverAddress)
  }

  toggleCollapsed() {
    const collapsed = !this.state.collapsed
    this.setState({ collapsed })
    setValue("collapsed", collapsed)
  }

  toggleDarkMode() {
    const darkMode = !this.state.darkMode
    this.setState({ darkMode })
    setValue("darkMode", darkMode)
  }

  renderServerStatus(server) {
    const hasData = server.sensordata && server.sensordata.length > 0
    const temps = hasData ? server.sensordata.filter((s) => s.unit === "degrees C") : []
    const maxTemp = temps.length ? Math.max(...temps.map((s) => Number(s.value))) : null
    const fans = hasData ? server.sensordata.filter((s) => s.unit === "RPM") : []
    const minFan = fans.length ? Math.min(...fans.map((s) => Number(s.value))) : null
    const warnSpeed = Number(server.warnspeed) || 3000

    let color = "#8c8c8c"
    if (hasData) {
      if (maxTemp !== null && maxTemp > 75) color = "#cf1322"
      else if (minFan !== null && minFan < warnSpeed) color = "#faad14"
      else color = "#52c41a"
    }
    return React.createElement(Badge, { color, text: server.name })
  }

  render() {
    const darkMode = this.state.darkMode
    const selectedServer = this.state.servers.find((s) => s.address === this.state.selectedServer)

    const menuItems = [
      { key: "dashboard", icon: React.createElement(DashboardOutlined), label: "Dashboard" },
      {
        key: "servers",
        icon: React.createElement(DesktopOutlined),
        label: "Servers",
        children: this.state.servers.map((server) => ({
          key: "server_" + server.address,
          label: this.renderServerStatus(server),
        })),
      },
      { key: "settings", icon: React.createElement(SettingOutlined), label: "Settings" },
      { key: "logs", icon: React.createElement(FileTextOutlined), label: "Logs" },
    ]

    let activeKey = this.state.activeView
    if (this.state.activeView === "server" && this.state.selectedServer) {
      activeKey = "server_" + this.state.selectedServer
    }

    const handleMenuClick = (info) => {
      const key = info.key
      if (key === "dashboard") this.setView("dashboard")
      else if (key === "settings") this.setView("settings")
      else if (key === "logs") this.setView("logs")
      else if (key.indexOf("server_") === 0) {
        const addr = key.substring(7)
        this.setView("server", addr)
      }
    }

    const themeConfig = {
      algorithm: darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: "#1668dc",
        borderRadius: 6,
        ...(darkMode ? DARK : LIGHT),
      },
    }

    const siderStyle = {
      overflow: "auto",
      height: "100vh",
      position: "sticky",
      top: 0,
      left: 0,
      background: darkMode ? "#0d1117" : undefined,
      borderRight: darkMode ? "1px solid #1e2738" : undefined,
    }

    const headerStyle = {
      padding: "0 24px",
      background: darkMode ? "#0d1117" : "#fff",
      borderBottom: darkMode ? "1px solid #1e2738" : "1px solid #f0f0f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 48,
      lineHeight: "48px",
    }

    const contentStyle = {
      margin: 0,
      padding: 24,
      background: darkMode ? "#0a0e17" : "#f5f5f5",
      minHeight: "calc(100vh - 48px)",
      overflow: "auto",
    }

    const breadcrumbText = this.state.activeView === "dashboard"
      ? "Dashboard"
      : this.state.activeView === "server" && selectedServer
        ? selectedServer.name
        : this.state.activeView === "settings"
          ? "Settings"
          : this.state.activeView === "logs"
            ? "Logs"
            : ""

    const connColor = this.state.connectionStatus === "connected"
      ? "#52c41a"
      : this.state.connectionStatus === "connecting"
        ? "#faad14"
        : "#cf1322"

    const connTooltip = this.state.connectionStatus === "connected"
      ? "Connected"
      : this.state.connectionStatus === "connecting"
        ? "Connecting..."
        : "Disconnected"

    const siderWidth = this.state.collapsed ? 80 : 240

    return (
      <ConfigProvider theme={themeConfig}>
        <Layout style={{ minHeight: "100vh" }}>
          <Sider
            collapsible
            collapsed={this.state.collapsed}
            onCollapse={() => this.toggleCollapsed()}
            width={240}
            style={siderStyle}
          >
            <div style={{
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: this.state.collapsed ? "center" : "flex-start",
              padding: this.state.collapsed ? "0" : "0 20px",
              borderBottom: darkMode ? "1px solid #1e2738" : "1px solid #f0f0f0",
              gap: "10px",
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "linear-gradient(135deg, #1668dc, #0c4a8e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}>
                IP
              </div>
              {!this.state.collapsed && (
                <span style={{ fontWeight: 600, fontSize: 14, color: darkMode ? "#e6eaf0" : "#1f1f1f", whiteSpace: "nowrap" }}>
                  IPMI Manager
                </span>
              )}
            </div>

            <Menu
              mode="inline"
              selectedKeys={[activeKey]}
              defaultOpenKeys={["servers"]}
              style={{ borderRight: 0, background: "transparent", paddingTop: 8 }}
              items={menuItems}
              onClick={handleMenuClick}
            />

            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "12px 16px",
              borderTop: darkMode ? "1px solid #1e2738" : "1px solid #f0f0f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}>
              <Tooltip title={connTooltip}>
                <Badge color={connColor} />
              </Tooltip>
              <Tooltip title={darkMode ? "Switch to Light" : "Switch to Dark"}>
                <Button
                  type="text"
                  size="small"
                  onClick={() => this.toggleDarkMode()}
                  style={{ color: darkMode ? "#8b96a8" : "#595959" }}
                >
                  {darkMode ? "Light" : "Dark"}
                </Button>
              </Tooltip>
            </div>
          </Sider>

          <Layout>
            <Header style={headerStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: darkMode ? "#8b96a8" : "#595959", fontSize: 13 }}>
                  {breadcrumbText}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Tooltip title="Refresh data">
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => socket.emit("getServers")}
                    style={{ color: darkMode ? "#8b96a8" : "#595959" }}
                  />
                </Tooltip>
              </div>
            </Header>

            <Content style={contentStyle}>
              {this.state.activeView === "dashboard" && (
                <ServerDashboard
                  servers={this.state.servers}
                  darkMode={darkMode}
                  onSelectServer={(addr) => this.setView("server", addr)}
                />
              )}
              {this.state.activeView === "server" && selectedServer && (
                <ServerDetail server={selectedServer} darkMode={darkMode} />
              )}
              {this.state.activeView === "settings" && <SettingsPage darkMode={darkMode} />}
              {this.state.activeView === "logs" && <LogViewer darkMode={darkMode} />}
            </Content>
          </Layout>
        </Layout>
      </ConfigProvider>
    )
  }
}

export default App