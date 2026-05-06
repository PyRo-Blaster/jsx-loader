import { describe, expect, it } from 'vitest'

import { analyzeJSXSource } from '../preflight'

describe('analyzeJSXSource', () => {
  it('allows supported react-only files', () => {
    const report = analyzeJSXSource(`
      import { useState } from "react";
      export default function Demo() {
        const [count] = useState(1)
        return <div>{count}</div>
      }
    `)

    expect(report.canProceed).toBe(true)
    expect(report.imports).toEqual(['react'])
    expect(report.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0)
  })

  it('blocks files that import unsupported modules', () => {
    const report = analyzeJSXSource(`
      import _ from "lodash";
      export default function Demo() {
        return <div>{String(Boolean(_))}</div>
      }
    `)

    expect(report.canProceed).toBe(false)
    expect(report.issues.some((issue) => issue.code === 'unsupported-module')).toBe(true)
  })

  it('warns on mixed default and named react imports', () => {
    const report = analyzeJSXSource(`
      import React, { useMemo } from "react";
      export default function Demo() {
        const value = useMemo(() => 1, [])
        return <div>{value}</div>
      }
    `)

    expect(report.canProceed).toBe(true)
    expect(report.issues.some((issue) => issue.code === 'react-default-named-import')).toBe(true)
  })

  it('blocks files without a default export', () => {
    const report = analyzeJSXSource(`
      export function Demo() {
        return <div>Hello</div>
      }
    `)

    expect(report.canProceed).toBe(false)
    expect(report.issues.some((issue) => issue.code === 'missing-default-export')).toBe(true)
  })

  it('warns on supported side-effect imports', () => {
    const report = analyzeJSXSource(`
      import "react";
      export default function Demo() {
        return <div>Hello</div>
      }
    `)

    expect(report.canProceed).toBe(true)
    expect(report.issues.some((issue) => issue.code === 'side-effect-import')).toBe(true)
  })

  it('allows supported third-party runtime modules', () => {
    const report = analyzeJSXSource(`
      import { LineChart } from "recharts";
      export default function Demo() {
        return <LineChart />
      }
    `)

    expect(report.canProceed).toBe(true)
    expect(report.imports).toEqual(['recharts'])
  })
})
