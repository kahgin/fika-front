import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ParsedOpenHours {
  status: 'open' | 'closed'
  currentStatus: string
  openHours: Array<{
    day: string
    time: string
  }>
}

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function parseOpenHours(openHoursData: unknown): ParsedOpenHours | null {
  if (!openHoursData || typeof openHoursData !== 'object') {
    console.log('No open hours available')
    return null
  }

  const openHours = openHoursData as Record<string, unknown>

  if (Object.keys(openHours).length === 0) {
    return null
  }

  const parsedHours = DAYS_ORDER.map((day) => {
    const dayHours = openHours[day]
    let timeStr = 'Closed'

    if (Array.isArray(dayHours) && dayHours.length > 0) {
      timeStr = dayHours[0] // Take first entry if multiple
    } else if (typeof dayHours === 'string') {
      timeStr = dayHours
    }

    return {
      day,
      time: timeStr,
    }
  })

  // Determine current status
  const { isOpen, statusText } = getCurrentStatus(openHours)

  return {
    status: isOpen ? 'open' : 'closed',
    currentStatus: statusText,
    openHours: parsedHours,
  }
}

function getCurrentStatus(openHoursData: Record<string, unknown>): { isOpen: boolean; statusText: string } {
  try {
    const now = new Date()
    const currentDay = DAYS_ORDER[now.getDay() === 0 ? 6 : now.getDay() - 1]
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute

    const dayHours = openHoursData[currentDay]
    if (!dayHours) {
      return { isOpen: false, statusText: 'Closed' }
    }

    let timeRangeStr = ''
    if (Array.isArray(dayHours) && dayHours.length > 0) {
      timeRangeStr = dayHours[0]
    } else if (typeof dayHours === 'string') {
      timeRangeStr = dayHours
    }

    // Check if closed
    if (timeRangeStr.toLowerCase().includes('closed')) {
      return { isOpen: false, statusText: 'Closed now' }
    }

    // Parse time range
    const isOpen = checkIfOpenInRange(timeRangeStr, currentTimeInMinutes)

    return {
      isOpen,
      statusText: isOpen ? 'Open now' : 'Closed now',
    }
  } catch (error) {
    console.error('Error determining current status:', error)
    return { isOpen: false, statusText: 'Hours unavailable' }
  }
}

function checkIfOpenInRange(timeRange: string, currentTimeInMinutes: number): boolean {
  try {
    const normalized = timeRange.toLowerCase().trim()

    // Check if it's 24 hours
    if (normalized.includes('24') || normalized.includes('24 hours') || normalized === 'open 24 hours') {
      return true
    }

    // Split by dash to get start and end
    const parts = normalized.split('-')
    if (parts.length !== 2) return false

    const startStr = parts[0].trim()
    const endStr = parts[1].trim()

    // Parse times
    const startMinutes = parseTimeString(startStr)
    const endMinutes = parseTimeString(endStr)

    if (startMinutes === null || endMinutes === null) return false

    // Handle overnight hours (e.g., 10pm-2am)
    if (startMinutes > endMinutes) {
      return currentTimeInMinutes >= startMinutes || currentTimeInMinutes < endMinutes
    }

    return currentTimeInMinutes >= startMinutes && currentTimeInMinutes < endMinutes
  } catch (error) {
    console.error('Error parsing time range:', error)
    return false
  }
}

function parseTimeString(timeStr: string): number | null {
  const cleaned = timeStr.trim()

  // Extract hours and optional minutes
  const match = cleaned.match(/(\d+)(?::(\d+))?\s*(am|pm)?/i)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2] || '0', 10)
  const period = match[3]?.toLowerCase()

  // Handle 12-hour format
  if (period === 'pm' && hours !== 12) {
    hours += 12
  } else if (period === 'am' && hours === 12) {
    hours = 0
  }

  // Validate
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return hours * 60 + minutes // Include minutes
}
