import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-brand-400 mb-4">
          TipTop
        </h1>
        <p className="text-xl text-ink-400 mb-8">
          Build your reputation once, carry it everywhere
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-lg font-semibold transition-all"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-lg font-semibold transition-all border border-white/10"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
