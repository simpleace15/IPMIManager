import React, { Component } from "react"
import {
  Card,
  Tabs,
  Button,
  Input,
  Form,
  Row,
  Col,
  Divider,
  Popover,
  InputNumber,
  Switch,
  Select,
  Slider,
  Space,
  Typography,
  message,
} from "antd"
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  SettingOutlined,
  CloudServerOutlined,
  ToolOutlined,
} from "@ant-design/icons"
import socket from "../api/index"
import FanCurveGraph from "../components/FanCurveGraph"
import Switch2 from "../components/Switch"

const layout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 16 },
}
const tailLayout = {
  wrapperCol: { offset: 6, span: 16 },
}

export default class SettingsPage extends Component {
  constructor(props) {
    super(props)
    this.state = {
      servers: [],
      settings: {},
      activeTab: "connections",
    }
  }

  componentDidMount() {
    socket.emit("getServers")
    socket.emit("getSettings")
    socket.on("servers", (servers) => this.setState({ servers }))
    socket.on("settings", (settings) => this.setState({ settings }))
    socket.on("addServerError", ({ errors }) => {
      message.error(errors.join(", "))
    })
  }

  addServer() {
    socket.emit("addServer", {
      server: {
        name: "New server",
        address: "192.168.0.1",
        username: "root",
        password: "calvin",
        warnspeed: "3000",
      },
    })
  }

  saveSettings(values) {
    socket.emit("updateSettings", values)
    message.success("Settings saved")
  }

  render() {
    const { darkMode } = this.props
    const cardBg = darkMode ? "#111827" : "#fff"
    const cardBorder = darkMode ? "#1e2738" : "#f0f0f0"

    return (
      <Card
        style={{ background: cardBg, borderColor: cardBorder, maxWidth: 900 }}
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SettingOutlined />
            <span>Settings</span>
          </span>
        }
      >
        <Tabs
          activeKey={this.state.activeTab}
          onChange={(key) => this.setState({ activeTab: key })}
          items={[
            {
              key: "connections",
              label: (
                <span>
                  <CloudServerOutlined /> Connections
                </span>
              ),
              children: this.renderConnections(),
            },
            {
              key: "general",
              label: (
                <span>
                  <ToolOutlined /> General
                </span>
              ),
              children: this.renderGeneral(),
            },
          ]}
        />
      </Card>
    )
  }

  renderConnections() {
    const { darkMode } = this.props
    const cardBg = darkMode ? "#0d1117" : "#fafafa"
    const cardBorder = darkMode ? "#1e2738" : "#f0f0f0"

    return (
      <div>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography.Text type="secondary">
            {this.state.servers.length} server{this.state.servers.length !== 1 ? "s" : ""} configured
          </Typography.Text>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => this.addServer()}>
            Add Server
          </Button>
        </div>

        <Tabs
          type="editable"
          onEdit={(key, action) => {
            if (action === "add") this.addServer()
          }}
          items={this.state.servers.map((server) => ({
            key: server.address,
            label: server.name,
            children: (
              <Form
                {...layout}
                name={`server-${server.address}`}
                initialValues={server}
                onFinish={(data) => {
                  socket.emit("updateServer", { address: server.address, update: data })
                  message.success(`Saved ${server.name}`)
                }}
              >
                <Form.Item label="Name" name="name" rules={[{ required: true, message: "Server name required" }]}>
                  <Input />
                </Form.Item>
                <Form.Item label="Address" name="address" rules={[{ required: true, message: "iDRAC address required" }]}>
                  <Input placeholder="192.168.0.1" />
                </Form.Item>
                <Form.Item label="Username" name="username" rules={[{ required: true, message: "Username required" }]}>
                  <Input />
                </Form.Item>
                <Form.Item label="Password" name="password" rules={[{ required: true, message: "Password required" }]}>
                  <Input.Password />
                </Form.Item>
                <Form.Item label="Warning RPM" name="warnspeed" rules={[{ required: true, message: "Fan threshold required" }]}>
                  <InputNumber min={0} max={20000} style={{ width: "100%" }} />
                </Form.Item>

                <Divider>Custom Fan Control</Divider>
                <Form.Item label="Manual Fan Control" name="manualFanControl" valuePropName="checked">
                  <Switch2 checkedChildren="Enabled" unCheckedChildren="Disabled" />
                </Form.Item>
                <Row>
                  <Col span={6}></Col>
                  <Col span={16}>
                    <FanCurveGraph />
                  </Col>
                </Row>

                <Form.Item {...tailLayout}>
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                      Save
                    </Button>
                    <Popover
                      trigger="click"
                      content={
                        <Button
                          type="primary"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => socket.emit("deleteServer", { address: server.address })}
                        >
                          Confirm Delete
                        </Button>
                      }
                    >
                      <Button danger icon={<DeleteOutlined />}>
                        Delete
                      </Button>
                    </Popover>
                  </Space>
                </Form.Item>
              </Form>
            ),
          }))}
        />
      </div>
    )
  }

  renderGeneral() {
    const s = this.state.settings

    return (
      <Form
        {...layout}
        initialValues={s}
        onFinish={(values) => this.saveSettings(values)}
      >
        <Divider orientation="left">Polling</Divider>
        <Form.Item label="Poll Interval" name="pollInterval">
          <InputNumber min={5000} max={300000} addonAfter="ms" style={{ width: "100%" }} />
        </Form.Item>

        <Divider orientation="left">Logging</Divider>
        <Form.Item label="Log Level" name="logLevel">
          <Select
            options={[
              { value: "debug", label: "Debug" },
              { value: "info", label: "Info" },
              { value: "warn", label: "Warn" },
              { value: "error", label: "Error" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Max Log Entries" name="maxLogEntries">
          <InputNumber min={100} max={10000} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Log Retention" name="logRetentionDays">
          <InputNumber min={1} max={365} addonAfter="days" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="File Logging" name="fileLogging" valuePropName="checked">
          <Switch checkedChildren="On" unCheckedChildren="Off" />
        </Form.Item>

        <Divider orientation="left">Fan Control Safety</Divider>
        <Form.Item label="Min Fan Speed" name="fanMinSpeed">
          <Slider min={0} max={100} marks={{ 0: "0%", 50: "50%", 100: "100%" }} />
        </Form.Item>
        <Form.Item label="Max Fan Speed" name="fanMaxSpeed">
          <Slider min={0} max={100} marks={{ 0: "0%", 50: "50%", 100: "100%" }} />
        </Form.Item>

        <Divider orientation="left">Prometheus</Divider>
        <Form.Item label="Metrics Enabled" name="prometheusEnabled" valuePropName="checked">
          <Switch checkedChildren="On" unCheckedChildren="Off" />
        </Form.Item>

        <Divider orientation="left">Autosave</Divider>
        <Form.Item label="Autosave Interval" name="autosaveInterval">
          <InputNumber min={10000} max={600000} addonAfter="ms" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item {...tailLayout}>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
            Save Settings
          </Button>
        </Form.Item>
      </Form>
    )
  }
}