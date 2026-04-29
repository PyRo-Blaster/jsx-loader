import { describe, expect, it } from 'vitest'

import { compileJSX } from '../compiler'

describe('compileJSX', () => {
  it('transpiles jsx source into executable javascript', () => {
    const source = 'export default function Demo(){ return <div>Hello</div> }'
    const result = compileJSX(source)

    expect(result).toContain('exports.default')
    expect(result).toContain('React.createElement')
  })

  it('throws a readable error when jsx source is invalid', () => {
    expect(() => compileJSX('export default () => <div>')).toThrow(/Compilation failed/)
  })

  it('supports react named imports used by uploaded jsx files', () => {
    const source = `
      import { useState, useMemo } from "react";
      export default function Demo() {
        const [n] = useState(1);
        const x = useMemo(() => n + 1, [n]);
        return <div>{x}</div>;
      }
    `

    const result = compileJSX(source)
    expect(result).toContain('require("react")')
    expect(result).toContain('useState')
    expect(result).toContain('useMemo')
  })

  it('supports third-party named imports such as recharts', () => {
    const source = `
      import { ComposedChart, Line } from "recharts";
      export default function Demo() {
        return <ComposedChart><Line dataKey="x" /></ComposedChart>;
      }
    `

    const result = compileJSX(source)
    expect(result).toContain('require("recharts")')
  })
})
