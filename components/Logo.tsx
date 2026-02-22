import Image from 'next/image'
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
  className = ''
}: LogoProps) {
  const { width, height } = sizes[size]
  
  const logoElement = (
    <Image
      src="/logo.png"
      alt="TipTop"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority
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
