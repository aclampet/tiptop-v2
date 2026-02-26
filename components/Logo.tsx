import Link from 'next/link'

interface LogoProps {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  linkToHome?: boolean
  className?: string
}

const sizes = {
  sm: { width: 100, height: 32 },
  md: { width: 140, height: 44 },
  lg: { width: 180, height: 56 },
}

export default function Logo({
  variant = 'dark',
  size = 'md',
  linkToHome = true,
  className = '',
}: LogoProps) {
  const { width, height } = sizes[size]
  const src = variant === 'light' ? '/logo-light.svg' : '/logo.svg'

  const logoElement = (
    <img
      src={src}
      alt="TipTop"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      style={{ height: `${height}px`, width: 'auto' }}
      fetchPriority="high"
    />
  )

  if (linkToHome) {
    return (
      <Link href="/" className="inline-block">
        {logoElement}
      </Link>
    )
  }

  return logoElement
}
