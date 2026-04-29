import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { runComponent } from '../runner'
import { registerRuntimeModule, unregisterRuntimeModule } from '../moduleRegistry'

describe('runComponent', () => {
  it('returns default exported component from compiled code', () => {
    const compiledCode =
      'exports.default = function Demo(){ return React.createElement("div", null, "Runner OK") }'
    const Component = runComponent(compiledCode)

    render(React.createElement(Component))

    expect(screen.getByText('Runner OK')).toBeInTheDocument()
  })

  it('throws when default export does not exist', () => {
    expect(() => runComponent('const a = 1')).toThrow(/default export/i)
  })

  it('throws when unsupported module is required', () => {
    const compiledCode =
      'const _ = require("lodash"); exports.default = function Demo(){ return React.createElement("div", null, "X") }'

    expect(() => runComponent(compiledCode)).toThrow(/supported modules/i)
  })

  it('allows requiring recharts module in sandbox', () => {
    const compiledCode = `
      const { LineChart } = require("recharts");
      exports.default = function Demo() {
        return React.createElement("div", null, typeof LineChart);
      }
    `

    const Component = runComponent(compiledCode)
    render(React.createElement(Component))
    expect(screen.getByText(/function|object/)).toBeInTheDocument()
  })

  it('supports custom runtime module via registry extension', () => {
    registerRuntimeModule('mock-lib', { meaning: 42 })
    const compiledCode = `
      const mod = require("mock-lib");
      exports.default = function Demo() {
        return React.createElement("div", null, String(mod.meaning));
      }
    `

    const Component = runComponent(compiledCode)
    render(React.createElement(Component))
    expect(screen.getByText('42')).toBeInTheDocument()

    unregisterRuntimeModule('mock-lib')
  })
})
