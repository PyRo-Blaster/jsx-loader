import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App shell', () => {
  it('renders empty stage and manager entry', () => {
    render(<App />)

    expect(screen.getByText('JSX Asset Loader')).toBeInTheDocument()
    expect(screen.getByText('JSX Asset Manager')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load Project Sample' })).toBeInTheDocument()
  })
})
