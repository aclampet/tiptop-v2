'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'


interface ReviewData {
  token: {
    id: string
    label: string
  }
  position: {
    id: string
    title: string
    rating: number
    review_count: number
    is_verified: boolean
  }
  worker: {
    id: string
    display_name: string
    slug: string
    avatar_url: string | null
    overall_rating: number
    total_reviews: number
  }
  company: {
    id: string
    name: string
    city: string | null
    state: string | null
    verification_status: 'verified' | 'registered' | 'unverified'
  }
}

export default function ReviewPage({ params }: { params: { tokenId: string } }) {
  const router = useRouter()
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reviewerName, setReviewerName] = useState('')

  useEffect(() => {
    fetchData()
  }, [params.tokenId])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/qr-tokens/${params.tokenId}/worker`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load review page')
      }

      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (rating === 0) {
        throw new Error('Please select a rating')
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_token_id: params.tokenId,
          rating,
          comment: comment.trim() || null,
          reviewer_name: reviewerName.trim() || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit review')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⭐</div>
          <p className="text-soft-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-2xl font-bold text-navy-600 mb-4">
            {error === 'This QR code is no longer active' 
              ? 'QR Code Inactive'
              : 'Invalid QR Code'}
          </h1>
          <p className="text-soft-500 mb-8">
            {error || 'This QR code is not valid or has been deactivated.'}
          </p>
          <a
            href="https://tiptop.review"
            className="inline-block text-navy-500 hover:text-navy-400 transition-colors"
          >
            Learn about TipTop →
          </a>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-green-500/10 border border-green-500/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <div className="text-5xl">✓</div>
          </div>
          <h1 className="text-3xl font-bold text-navy-600 mb-4">Thank you!</h1>
          <p className="text-soft-500 mb-2">
            Your review for <strong>{data.worker.display_name}</strong> has been saved.
          </p>
          <p className="text-sm text-soft-400 mb-8">
            This review is now part of their permanent professional record.
          </p>
          <div className="text-2xl mb-8">
            {'⭐'.repeat(rating)}
          </div>
          <a
            href={`/worker/${data.worker.slug}`}
            className="inline-block text-navy-500 hover:text-navy-400 transition-colors text-sm"
          >
            View {data.worker.display_name}'s profile →
          </a>
          <div className="mt-12 pt-8 border-t border-soft-200">
            <p className="text-xs text-soft-400">
              Powered by{' '}
              <a href="https://tiptop.review" className="text-navy-600 hover:text-navy-500">
                TipTop.review
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  const displayRating = hoveredRating || rating
  const stars = Array.from({ length: 5 }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">⭐</div>
          <h1 className="text-2xl font-bold text-navy-600 mb-2">
            Rate Your Experience
          </h1>
          <p className="text-soft-500">
            How was your experience with {data.worker.display_name}?
          </p>
        </div>

        {/* Worker & Position Context */}
        <div className="bg-white border border-soft-200 rounded-xl p-6 mb-8">
          <div className="text-center">
            {data.worker.avatar_url && (
              <img
                src={data.worker.avatar_url}
                alt={data.worker.display_name}
                className="w-16 h-16 rounded-full mx-auto mb-4"
              />
            )}
            <h2 className="text-xl font-semibold text-navy-600 mb-1">
              {data.worker.display_name}
            </h2>
            <p className="text-navy-500 mb-1">
              {data.position.title}
            </p>
            <p className="text-sm text-soft-500 mb-4">
              {data.company.name}
              {data.company.verification_status === 'verified' && (
                <span className="text-navy-500 ml-1">✓</span>
              )}
            </p>

            {/* Position Stats */}
            {data.position.review_count > 0 && (
              <div className="flex items-center justify-center gap-4 text-sm pt-4 border-t border-soft-200">
                <div className="text-soft-500">
                  <span className="text-navy-600 font-semibold">
                    {data.position.rating.toFixed(1)}
                  </span>
                  {' '}⭐ as {data.position.title}
                </div>
                <div className="text-soft-400">
                  {data.position.review_count} reviews
                </div>
              </div>
            )}

            {data.position.is_verified && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">
                  <span>✓</span>
                  <span>Verified Position</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-soft-200 rounded-xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Star Rating */}
          <div className="mb-8">
            <label className="block text-center text-sm font-medium text-soft-500 mb-4">
              Your Rating *
            </label>
            <div className="flex items-center justify-center gap-2">
              {stars.map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="text-5xl transition-all hover:scale-110 active:scale-95"
                >
                  {star <= displayRating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-navy-500 mt-3">
                {rating === 5 && 'Excellent!'}
                {rating === 4 && 'Very Good!'}
                {rating === 3 && 'Good'}
                {rating === 2 && 'Fair'}
                {rating === 1 && 'Poor'}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-soft-500 mb-2">
              Tell us more (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What made your experience great? What could be improved?"
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
            />
            <p className="text-xs text-soft-400 mt-1">
              {comment.length}/500 characters
            </p>
          </div>

          {/* Reviewer Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-soft-500 mb-2">
              Your Name (optional)
            </label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="John Smith"
              maxLength={50}
              className="w-full px-4 py-3 bg-white border border-soft-200 rounded-xl text-navy-600 placeholder:text-soft-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
            <p className="text-xs text-soft-400 mt-1">
              Your review will be public
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={rating === 0 || submitting}
            className="w-full bg-navy-600 hover:bg-navy-500 disabled:bg-soft-300 disabled:text-soft-400 text-white py-4 rounded-xl font-semibold transition-all active:scale-95"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>

          <p className="text-xs text-soft-400 text-center mt-4">
            By submitting, you agree your review may be displayed publicly
          </p>
        </form>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-soft-400">
            Powered by{' '}
            <a href="https://tiptop.review" className="text-navy-600 hover:text-navy-500">
              TipTop.review
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
