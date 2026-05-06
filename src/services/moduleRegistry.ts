import React from 'react'
import * as Recharts from 'recharts'

const runtimeModules = new Map<string, unknown>([
  ['react', React],
  ['recharts', Recharts],
])

export function registerRuntimeModule(name: string, moduleValue: unknown): void {
  runtimeModules.set(name, moduleValue)
}

export function unregisterRuntimeModule(name: string): void {
  if (name === 'react' || name === 'recharts') return
  runtimeModules.delete(name)
}

export function resolveRuntimeModule(name: string): unknown | undefined {
  return runtimeModules.get(name)
}

export function hasRuntimeModule(name: string): boolean {
  return runtimeModules.has(name)
}

export function listSupportedRuntimeModules(): string[] {
  return Array.from(runtimeModules.keys()).sort()
}
