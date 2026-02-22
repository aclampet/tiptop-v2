import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav — Navy */}
      <nav className="bg-navy-600">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/"><span className="font-display text-2xl text-white">TipTop</span></Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-white/80 hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="bg-gold-300 hover:bg-gold-400 text-navy-600 px-5 py-2 rounded-lg text-sm font-semibold transition-colors">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero — White */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-5xl md:text-6xl text-navy-600 mb-6 leading-tight">
            Build a{' '}
            <span className="relative inline-block">
              reputation
              <span className="absolute bottom-1 left-0 w-full h-2 bg-gold-300/40 -z-10 rounded" />
            </span>{' '}
            that follows you
          </h1>
          <p className="text-lg text-soft-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            TipTop gives service workers a portable professional profile. Collect verified reviews across every job — they travel with you, not your employer.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/signup" className="bg-navy-600 hover:bg-navy-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
              Get Your QR Code
            </Link>
            <Link href="/login" className="border-2 border-navy-600 text-navy-600 hover:bg-navy-600 hover:text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works — Soft Gray */}
      <section className="bg-soft-100 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl text-navy-600 text-center mb-16">How TipTop Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { n: '1', t: 'Add Your Position', d: 'Enter your company and job title. We verify your employment through email or HR approval.' },
              { n: '2', t: 'Share Your QR Code', d: 'Print it, display it, or share the link. Customers scan to leave a review in seconds.' },
              { n: '3', t: 'Carry It Forever', d: 'Your reviews follow you to every new job. Build a reputation that\'s yours — not your employer\'s.' },
            ].map(s => (
              <div key={s.n} className="text-center">
                <div className="w-14 h-14 bg-navy-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">{s.n}</div>
                <h3 className="text-xl font-semibold text-navy-600 mb-2">{s.t}</h3>
                <p className="text-soft-500 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — White */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl text-navy-600 text-center mb-4">Built for Service Workers</h2>
          <p className="text-soft-500 text-center mb-16 max-w-2xl mx-auto">
            Whether you&apos;re a bartender, barber, contractor, or concierge — your reputation matters.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { i: '⭐', t: 'Verified Reviews', d: 'Every review is tied to a verified position. No fake reviews, no manipulation.' },
              { i: '📱', t: 'QR Code Access', d: 'Unique QR code for each position. Customers scan and review in under 30 seconds.' },
              { i: '🏢', t: 'Company Verification', d: 'Three-tier verification system ensures legitimate employment records.' },
              { i: '🔒', t: 'You Own Your Data', d: 'Your reputation is portable. Switch jobs, keep your reviews.' },
            ].map(f => (
              <div key={f.t} className="flex gap-4 bg-soft-50 border border-soft-200 rounded-xl p-6">
                <div className="text-3xl">{f.i}</div>
                <div>
                  <h3 className="text-lg font-semibold text-navy-600 mb-1">{f.t}</h3>
                  <p className="text-soft-500 text-sm leading-relaxed">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — Navy */}
      <section className="bg-navy-600 py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl text-white mb-4">Start building your reputation today</h2>
          <p className="text-navy-200 mb-10">Free to sign up. Free to use. Your reputation is priceless.</p>
          <Link href="/signup" className="inline-block bg-gold-300 hover:bg-gold-400 text-navy-600 px-10 py-4 rounded-lg font-bold text-lg transition-colors">
            Get Your QR Code →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-700 py-10 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <span className="font-display text-xl text-white">TipTop</span>
            <p className="text-navy-200 text-sm mt-1">Portable professional reputation</p>
          </div>
          <p className="text-navy-300 text-sm">&copy; {new Date().getFullYear()} TipTop.review</p>
        </div>
      </footer>
    </div>
  )
}
