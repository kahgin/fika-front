import { describe, it, expect } from 'vitest'
import { parseOpenHours } from '@/lib/utils'

describe('parseOpenHours', () => {
  it('returns null for invalid input', () => {
    expect(parseOpenHours(null as unknown as object)).toBeNull()
    expect(parseOpenHours({})).toBeNull()
  })

  it('parses open hours and computes status', () => {
    const result = parseOpenHours({
      Monday: '9am-5pm',
      Tuesday: 'Closed',
      Wednesday: '10am-4pm',
      Thursday: '10am-4pm',
      Friday: '10am-4pm',
      Saturday: 'Closed',
      Sunday: 'Closed',
    })

    expect(result).not.toBeNull()
    expect(result?.openHours.length).toBe(7)
    expect(result?.openHours[0]).toEqual({ day: 'Monday', time: '9am-5pm' })
  })
})
