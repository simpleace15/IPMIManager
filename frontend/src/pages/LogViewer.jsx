import React, { Component } from "react"
import {
  Card,
  Table,
  Tag,
  Input,
  Space,
  Button,
  Select,
  Switch,
  Typography,
  Empty,
  message,
} from "antd"
import {
  DownloadOutlined,
  ClearOutlined,
  SearchOutlined,
  FileTextOutlined,
} from "@ant-design/icons"
import socket from "../api/index"

const levelColors = {
  error: "error",
  warn: "warning",
  info: "processing",
  debug: "default",
}

export default class LogViewer extends Component {
  constructor(props) {
    super(props)
    this.state = {
      logs: [],
      filterLevel: "all",
      searchText: "",
      autoScroll: true,
    }
  }

  componentDidMount() {
    socket.emit("getLogs")
    socket.on("logs", (logs) => {
      this.setState({ logs: Array.isArray(logs) ? logs : [] })
    })
  }

  componentWillUnmount() {
    socket.off("logs")
  }

  getFilteredLogs() {
    let logs = this.state.logs
    if (this.state.filterLevel !== "all") {
      logs = logs.filter((l) => l.level === this.state.filterLevel)
    }
    if (this.state.searchText) {
      const search = this.state.searchText.toLowerCase()
      logs = logs.filter(
        (l) =>
          (l.message || "").toLowerCase().includes(search) ||
          (l.level || "").toLowerCase().includes(search)
      )
    }
    return logs.reverse()
  }

  downloadLogs() {
    const logs = this.getFilteredLogs()
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ipmimanager-logs-${new Date().toISOString().slice(0, 10)}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  render() {
    const { darkMode } = this.props
    const cardBg = darkMode ? "#111827" : "#fff"
    const cardBorder = darkMode ? "#1e2738" : "#f0f0f0"

    const columns = [
      {
        title: "Time",
        dataIndex: "timestamp",
        key: "timestamp",
        width: 180,
        render: (t) => <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t}</Typography.Text>,
      },
      {
        title: "Level",
        dataIndex: "level",
        key: "level",
        width: 80,
        render: (level) => <Tag color={levelColors[level] || "default"}>{level}</Tag>,
      },
      {
        title: "Message",
        dataIndex: "message",
        key: "message",
        render: (msg, row) => (
          <span>
            {msg}
            {row.metadata && (
              <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                {JSON.stringify(row.metadata)}
              </Typography.Text>
            )}
          </span>
        ),
      },
    ]

    return (
      <Card
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileTextOutlined />
            <span>Log Viewer</span>
            <Tag style={{ marginLeft: 4 }}>{this.getFilteredLogs().length}</Tag>
          </span>
        }
        style={{ background: cardBg, borderColor: cardBorder }}
        extra={
          <Space>
            <Select
              value={this.state.filterLevel}
              onChange={(v) => this.setState({ filterLevel: v })}
              style={{ width: 100 }}
              options={[
                { value: "all", label: "All" },
                { value: "error", label: "Error" },
                { value: "warn", label: "Warn" },
                { value: "info", label: "Info" },
                { value: "debug", label: "Debug" },
              ]}
            />
            <Input
              placeholder="Search..."
              prefix={<SearchOutlined />}
              value={this.state.searchText}
              onChange={(e) => this.setState({ searchText: e.target.value })}
              style={{ width: 180 }}
              allowClear
            />
            <Button icon={<DownloadOutlined />} onClick={() => this.downloadLogs()}>
              Export
            </Button>
            <Button
              danger
              icon={<ClearOutlined />}
              onClick={() => {
                socket.emit("clearLogs")
                message.success("Logs cleared")
              }}
            >
              Clear
            </Button>
          </Space>
        }
      >
        {this.getFilteredLogs().length === 0 ? (
          <Empty description="No log entries" />
        ) : (
          <Table
            columns={columns}
            dataSource={this.getFilteredLogs()}
            rowKey={(r, i) => i}
            size="small"
            pagination={{ pageSize: 50, showSizeChanger: false }}
            scroll={{ y: 500 }}
          />
        )}
      </Card>
    )
  }
}