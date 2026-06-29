import React from "react"
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import App from "./App"

describe("App", () => {
  it("renders IPMI Manager brand in sidebar", () => {
    const { getAllByText } = render(<App />)
    const brand = getAllByText(/IPMI Manager/i)
    expect(brand.length).toBeGreaterThan(0)
  })

  it("renders all sidebar menu items", () => {
    const { getAllByText } = render(<App />)
    const servers = getAllByText(/Servers/i)
    expect(servers.length).toBeGreaterThan(0)
  })
})