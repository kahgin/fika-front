import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { POIIcon } from '@/lib/poi-icons'

// lucide-react icons render as SVG with role="img"

describe('POIIcon', () => {
  it('renders depot icon for role=depot', () => {
    const { container } = render(<POIIcon role="depot" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders meal icon for role=meal', () => {
    const { container } = render(<POIIcon role="meal" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('falls back to theme icon when role not provided', () => {
    const { container } = render(<POIIcon themes={["art_museums"]} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('falls back to generic icon when no role or known theme', () => {
    const { container } = render(<POIIcon themes={["unknown_theme"] as any} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
