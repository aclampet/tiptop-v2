import Link from 'next/link'
import Logo from '@/components/Logo'
import HomeSearch from '@/app/components/HomeSearch'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-navy-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo size="sm" variant="light" />
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="text-sm text-white/80 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link
              href="/enroll"
              className="bg-gold-300 hover:bg-gold-400 text-navy-600 px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-navy-600 mb-6 leading-tight">
            Excellence has a{' '}
            <span className="relative inline-block">
              name
              <span className="absolute bottom-1 sm:bottom-1.5 left-0 w-full h-2 sm:h-3 bg-gold-300/50 -z-10 rounded" />
            </span>
            .
          </h1>
          <p className="text-lg sm:text-xl text-soft-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            TipTop recognizes the people who make excellence happen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/enroll"
              className="bg-gold-300 hover:bg-gold-400 text-navy-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              Let your excellence shine
            </Link>
            <a
              href="#search"
              className="border-2 border-navy-600 text-navy-600 hover:bg-navy-600 hover:text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              Search TipTop
            </a>
          </div>
        </div>
      </section>

      {/* What TipTop Is */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-soft-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl text-navy-600 text-center mb-4">What is TipTop?</h2>
          <p className="text-soft-500 text-center mb-12 max-w-2xl mx-auto">
            A new kind of professional credential — built by service, verified by the people you serve.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white border border-soft-200 rounded-2xl p-6 sm:p-8 text-center">
              <div className="w-14 h-14 bg-gold-300/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎫</span>
              </div>
              <h3 className="text-lg font-semibold text-navy-600 mb-2">Verified Excellence Passport</h3>
              <p className="text-soft-500 text-sm leading-relaxed">
                Your professional profile travels with you. Verified positions, authentic reviews, portable reputation.
              </p>
            </div>
            <div className="bg-white border border-soft-200 rounded-2xl p-6 sm:p-8 text-center">
              <div className="w-14 h-14 bg-gold-300/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-lg font-semibold text-navy-600 mb-2">Recognition That&apos;s Earned</h3>
              <p className="text-soft-500 text-sm leading-relaxed">
                No manipulation. No drama. Just real feedback from the people you&apos;ve actually served.
              </p>
            </div>
            <div className="bg-white border border-soft-200 rounded-2xl p-6 sm:p-8 text-center">
              <div className="w-14 h-14 bg-gold-300/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏢</span>
              </div>
              <h3 className="text-lg font-semibold text-navy-600 mb-2">A System Employers Respect</h3>
              <p className="text-soft-500 text-sm leading-relaxed">
                Verified employment history. Credible reviews. The truth about who delivers excellence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Workers */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-gold-500 font-semibold text-sm uppercase tracking-wide mb-2">For Workers</p>
              <h2 className="font-display text-2xl sm:text-3xl text-navy-600 mb-4">
                Boots on the ground deserve recognition.
              </h2>
              <p className="text-soft-500 mb-6 leading-relaxed">
                You&apos;re the one making it happen — day in, day out. TipTop captures the excellence you deliver and gives
                you a record that&apos;s truly yours. When you move on, your reputation moves with you.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-gold-400 mt-1">✓</span>
                  <span className="text-soft-600">Own your reviews — they follow you, not your employer</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gold-400 mt-1">✓</span>
                  <span className="text-soft-600">Verified positions prove where you&apos;ve worked</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gold-400 mt-1">✓</span>
                  <span className="text-soft-600">QR codes let customers leave feedback in seconds</span>
                </li>
              </ul>
              <Link
                href="/enroll"
                className="inline-block bg-navy-600 hover:bg-navy-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Start building your profile
              </Link>
            </div>
            <div className="bg-soft-100 rounded-2xl p-8 sm:p-10 text-center">
              <p className="font-display text-5xl sm:text-6xl text-navy-600 mb-2">&ldquo;</p>
              <p className="text-navy-600 text-lg leading-relaxed mb-4">
                Finally, a way to show what I&apos;ve built — not just where I&apos;ve worked.
              </p>
              <p className="text-soft-500 text-sm">— Service professional</p>
            </div>
          </div>
        </div>
      </section>

      {/* For Employers */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-soft-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1 bg-white rounded-2xl border border-soft-200 p-8 sm:p-10">
              <h4 className="text-navy-600 font-semibold mb-4">Your team, showcased</h4>
              <p className="text-soft-500 text-sm leading-relaxed mb-4">
                TipTop company pages highlight the people who represent your brand. Verified reviews build trust with
                customers before they even walk in.
              </p>
              <div className="flex items-center gap-3 border-t border-soft-200 pt-4">
                <div className="w-10 h-10 bg-soft-200 rounded-full"></div>
                <div>
                  <p className="text-navy-600 font-medium text-sm">Acme Hospitality</p>
                  <p className="text-soft-400 text-xs">12 verified employees</p>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <p className="text-gold-500 font-semibold text-sm uppercase tracking-wide mb-2">For Employers</p>
              <h2 className="font-display text-2xl sm:text-3xl text-navy-600 mb-4">
                Great teams deserve visibility.
              </h2>
              <p className="text-soft-500 mb-6 leading-relaxed">
                TipTop is still people-first — but that includes the people you hire. Company pages showcase your
                employees&apos; excellence, giving prospective customers confidence in your team.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-gold-400 mt-1">✓</span>
                  <span className="text-soft-600">Claim and verify your company page</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gold-400 mt-1">✓</span>
                  <span className="text-soft-600">Feature top-rated team members</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gold-400 mt-1">✓</span>
                  <span className="text-soft-600">Build trust through transparency</span>
                </li>
              </ul>
              <Link
                href="/login"
                className="inline-block border-2 border-navy-600 text-navy-600 hover:bg-navy-600 hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Claim your company
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl text-navy-600 text-center mb-4">How It Works</h2>
          <p className="text-soft-500 text-center mb-12 max-w-xl mx-auto">
            Three steps to a verified professional profile.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            <div className="text-center">
              <div className="w-14 h-14 bg-navy-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-navy-600 mb-2">Tell us who you are</h3>
              <p className="text-soft-500 text-sm leading-relaxed">
                Add your name, role, and where you work. We verify your position through email or HR approval.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-navy-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-navy-600 mb-2">Share your QR code</h3>
              <p className="text-soft-500 text-sm leading-relaxed">
                Print it, display it, or share a link. Customers scan to leave you a review in seconds.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-navy-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-navy-600 mb-2">Build your passport</h3>
              <p className="text-soft-500 text-sm leading-relaxed">
                Your reviews travel with you. Switch jobs, keep your reputation. Excellence has a record.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section id="search" className="py-16 sm:py-20 px-4 sm:px-6 bg-soft-50 scroll-mt-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl sm:text-3xl text-navy-600 mb-4">Find excellence</h2>
          <p className="text-soft-500 mb-8">Search for people or companies on TipTop.</p>
          <HomeSearch />
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-navy-600 py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl sm:text-3xl text-white mb-4">Excellence has a name. Make sure it&apos;s yours.</h2>
          <p className="text-navy-200 mb-8 sm:mb-10">
            Free to join. Free to use. Your reputation is priceless.
          </p>
          <Link
            href="/enroll"
            className="inline-block bg-gold-300 hover:bg-gold-400 text-navy-600 px-10 py-4 rounded-lg font-bold text-lg transition-colors"
          >
            Let your excellence shine →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-700 py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <Logo size="sm" variant="light" />
            <p className="text-navy-200 text-sm mt-1">Excellence has a name.</p>
          </div>
          <p className="text-navy-300 text-sm">&copy; {new Date().getFullYear()} TipTop.review</p>
        </div>
      </footer>
    </div>
  )
}
