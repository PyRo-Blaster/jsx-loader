import * as Babel from '@babel/standalone'

function normalizeDefaultExport(code: string): string {
  const fnMatch = code.match(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)\s*\(/)
  if (fnMatch) {
    const name = fnMatch[1]
    return code.replace(
      /export\s+default\s+function\s+([A-Za-z_$][\w$]*)\s*\(/,
      'function $1(',
    ) + `\nexports.default = ${name};\n`
  }

  const exprMatch = code.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/)
  if (exprMatch) {
    return code.replace(
      /export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/,
      'exports.default = $1;',
    )
  }

  return code
}

function normalizeNamedImports(specifierBlock: string): string {
  const inner = specifierBlock.trim().slice(1, -1).trim()
  if (!inner) return '{}'

  const mapped = inner
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/\s+as\s+/i, ': '))

  return `{ ${mapped.join(', ')} }`
}

function normalizeModuleImports(code: string): string {
  const withFromImports = code.replace(
    /import\s+([^;]+?)\s+from\s+['"]([^'"]+)['"]\s*;?/g,
    (_full, rawSpecifiers: string, moduleName: string) => {
      const specifiers = rawSpecifiers.trim()

      if (specifiers.startsWith('{')) {
        return `const ${normalizeNamedImports(specifiers)} = require("${moduleName}");`
      }

      if (specifiers.startsWith('*')) {
        const nsMatch = specifiers.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/)
        if (!nsMatch) return _full
        return `const ${nsMatch[1]} = require("${moduleName}");`
      }

      const defaultAndNamed = specifiers.match(
        /^([A-Za-z_$][\w$]*)\s*,\s*(\{[^}]+\}|\*\s+as\s+[A-Za-z_$][\w$]*)$/,
      )
      if (defaultAndNamed) {
        const defaultName = defaultAndNamed[1]
        const rest = defaultAndNamed[2]
        if (rest.startsWith('{')) {
          return `const ${defaultName} = require("${moduleName}"); const ${normalizeNamedImports(rest)} = ${defaultName};`
        }
        const nsMatch = rest.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/)
        if (nsMatch) {
          return `const ${defaultName} = require("${moduleName}"); const ${nsMatch[1]} = ${defaultName};`
        }
      }

      if (/^[A-Za-z_$][\w$]*$/.test(specifiers)) {
        return `const ${specifiers} = require("${moduleName}");`
      }

      return _full
    },
  )

  // Side-effect imports
  return withFromImports.replace(
    /import\s+['"]([^'"]+)['"]\s*;?/g,
    (_full, moduleName: string) => `require("${moduleName}");`,
  )
}

export function compileJSX(code: string): string {
  try {
    const preparedCode = normalizeDefaultExport(normalizeModuleImports(code))

    const transformed = Babel.transform(preparedCode, {
      presets: ['react'],
      sourceType: 'script',
      filename: 'dynamic.jsx',
    }).code

    if (!transformed) {
      throw new Error('Empty compile result')
    }

    return transformed
  } catch (error) {
    throw new Error(`Compilation failed: ${(error as Error).message}`)
  }
}
