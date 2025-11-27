import React from 'react'

const ICON_SIZES = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const

type IconSize = keyof typeof ICON_SIZES

type LogoProps = {
  variant?: 'mark' | 'type' | 'full'
  size?: number | IconSize
  color?: string
  strokeWidth?: number
  iconClassName?: string
  className?: string
}

const resolveSize = (s: number | IconSize | undefined, fallback = 20): number => (typeof s === 'string' ? ICON_SIZES[s] : (s ?? fallback))

const LogoMark: React.FC<{
  fontSize: number
  color: string
  strokeWidth?: number
  className?: string
}> = ({ fontSize, color, strokeWidth = 5, className }) => {
  const iconSize = Math.round(fontSize * 1)

  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 100 100"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        fill: 'none',
        stroke: color,
        strokeWidth: strokeWidth,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeMiterlimit: 10,
      }}
      aria-hidden="true"
    >
      <g>
        <path
          d="M87.3,73c-0.4-0.2-1.1-0.4-1.9-0.9c-0.9-0.6-2.5-1.9-4.9-7.3c-1.5-3.3-1.7-4.7-3.2-5.4
          c-1.1-0.5-2.1-0.2-2.4-0.2c-2.4,0.5-3.7,3-4.7,6.4c-0.3,0.9-0.6,1.9-0.8,2.8c-0.7,2.2-1.4,4.4-2.7,5.8c-1.3,1.4-3.2,2.2-5.1,2.2
          c-2,0-3.4-0.9-3.7-1.2c-3.1-2.1-3.9-6.5-4.3-8.7c-0.5-2.4-0.4-4.1-1.8-5.4c-0.2-0.2-1.1-0.8-2.3-1c-1.8-0.3-3.5,1-4.6,2.5
          c-0.9,1.2-1.4,2-1.9,2.9c-0.1,0.3-0.3,0.6-0.5,0.9c-0.4,0.7-0.9,1.6-1.5,2.5c-1.3,2.1-2.7,3.1-5.3,2.8c-1.8-0.3-2.9-2.6-3.7-5
          c-0.5-1.5-0.9-3.1-1.3-4.5c-1-3.4-2.3-5.9-5-6.3c-1.7-0.2-3.2,0.3-3.7,0.6c-2.1,1.1-2.9,3.6-4.2,7.5c-0.5,1.4-0.5,1.6-0.8,2.4
          c-0.3,0.9-1.1,2.7-2.7,4c-0.5,0.3-1.2,0.8-2.4,1.1"
        />
        <path
          d="M85.9,75.7c0,0-7.5,9.5-27.4,10.6c-0.2,0-0.4,0-0.6,0c-2.5,0.2-7.8,0.3-7.8,0.3s-5.9-0.2-8.1-0.3
          C27.6,85.6,18,81.8,13.1,74.9c-0.4-0.5-0.8-1.1-1.1-1.7c0,0-0.7-1.2-1.4-2.6c-5-10.4-3.2-26.4-3.1-27.6c0-0.4,0-1.1,0.1-1.9
          c0,0,0.2-5.8,2.4-10.1c1.3-2.5,4.1-6.6,11.9-10.5c20.2-10.2,46.4-5.1,57.4,0.6c0.6,0.3,7.1,3.8,10.1,8.8c1.2,2,2.3,5.1,2.6,6.9
          c0.2,1,0.3,2.3,0.3,2.3s0.1,1,0.2,2C94.3,66.3,85.9,75.7,85.9,75.7z"
        />
        <path
          d="M90.5,32.1c-0.1,0.5-0.4,1.2-0.7,2.1c0,0-2.1,5.4-7,10c-4.3,4.1-14.8,9.3-28.5,9.2c-15.5-0.2-29.7-7.4-31.9-14
          c-0.9-2.7-0.5-5.1-0.5-5.1c0.6-3.7,3.2-6.1,4.6-7.2c2-1.8,5.6-4.1,13.9-5.2c10.4-1.3,21.3,0.2,27.6,4.6c1.9,1.3,5.3,3.8,5.8,7.7
          c0.1,0.5,0.2,2.1-0.4,3.8c-2.6,6.9-14.7,7.9-16.4,8c-2.2,0.1-4.4,0.1-6.5-0.2C44.6,45,38.3,42,36.4,38c-0.2-0.5-0.8-1.7-0.6-3.2
          c0.2-1.6,1.2-2.6,1.6-3.1c2-2.2,4.8-2.7,7.1-3c2.6-0.4,5.3-0.2,7.7,0.3c1.2,0.3,5.3,1.5,6.8,4.4c0.3,0.5,0.8,1.6,0.5,2.8
          c-0.2,0.8-0.7,1.3-1,1.5c-0.8,0.8-1.8,0.9-2.9,1.1c-0.7,0.1-1.9,0.3-3.4-0.1c-2.7-0.7-4.2-2.7-4.6-3.3"
        />
      </g>
    </svg>
  )
}

export const Logo: React.FC<LogoProps> = ({ variant = 'full', size = 'md', color = 'currentColor', strokeWidth = 5, iconClassName, className }) => {
  const resolved = resolveSize(size)

  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ''}`}>
      {(variant === 'mark' || variant === 'full') && (
        <LogoMark fontSize={resolved} color={color} strokeWidth={strokeWidth} className={`mt-0.5 ${iconClassName}`} />
      )}
      {(variant === 'type' || variant === 'full') && (
        <span
          style={{
            fontFamily: 'Playfair Display, Times New Roman, serif',
            fontWeight: 700,
            fontSize: `${resolved}px`,
            lineHeight: 1,
            color,
            userSelect: 'none',
          }}
        >
          fika
        </span>
      )}
    </span>
  )
}

export default Logo
