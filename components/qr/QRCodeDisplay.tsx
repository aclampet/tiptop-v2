'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  token: any
  position: any
  isActive: boolean
}

export default function QRCodeDisplay({ token, position, isActive }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [reviewUrl, setReviewUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const url = `${baseUrl}/review/${token.id}`
    setReviewUrl(url)

    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        url,
        {
          width: 300,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        }
      )
    }
  }, [token.id])

  const handleDownload = () => {
    if (!canvasRef.current) return

    // Create a new canvas with white background and watermark
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 400
    canvas.width = size
    canvas.height = size + 80

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size + 80)

    // Draw QR code
    ctx.drawImage(canvasRef.current, 50, 50, 300, 300)

    // Add watermark
    ctx.fillStyle = '#64748b'
    ctx.font = '14px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('Scan to leave a review • TipTop.review', size / 2, size + 40)
    ctx.fillText(`${position.title} at ${position.company.name}`, size / 2, size + 60)

    // Download
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tiptop-qr-${position.title.toLowerCase().replace(/\s+/g, '-')}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(reviewUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* QR Code Preview */}
      <div className="flex flex-col items-center">
        <div className={`bg-white p-6 rounded-xl ${!isActive ? 'opacity-50' : ''}`}>
          <canvas ref={canvasRef} />
        </div>
        {!isActive && (
          <p className="text-yellow-400 text-sm mt-3 text-center">
            QR code will activate once position is verified
          </p>
        )}
      </div>

      {/* Actions & Info */}
      <div className="flex flex-col justify-center space-y-4">
        <div>
          <h3 className="text-sm font-medium text-soft-500 mb-2">Review Link</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={reviewUrl}
              readOnly
              className="flex-1 px-4 py-2 bg-white border border-soft-200 rounded-lg text-navy-600 text-sm"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-soft-100 hover:bg-white/20 text-navy-600 rounded-lg transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={!isActive}
          className="w-full bg-navy-600 hover:bg-navy-500 disabled:bg-soft-300 disabled:text-soft-400 text-white py-3 rounded-lg font-semibold transition-all"
        >
          📥 Download PNG
        </button>

        <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between text-soft-500">
            <span>Label:</span>
            <span className="text-navy-600">{token.label}</span>
          </div>
          <div className="flex items-center justify-between text-soft-500">
            <span>Scans:</span>
            <span className="text-navy-600">{token.scan_count || 0}</span>
          </div>
          <div className="flex items-center justify-between text-soft-500">
            <span>Status:</span>
            <span className={isActive ? 'text-green-400' : 'text-yellow-400'}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            💡 <strong>Tip:</strong> Print this QR code and display it where customers can easily scan it — or share the link directly!
          </p>
        </div>
      </div>
    </div>
  )
}
