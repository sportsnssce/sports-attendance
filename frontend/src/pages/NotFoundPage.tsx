import { Link } from 'react-router-dom'
import { Home, AlertCircle } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center space-y-4">
        <AlertCircle className="h-16 w-16 text-slate-300 mx-auto" />
        <h1 className="font-display text-4xl font-bold text-brand-900">Page Not Found</h1>
        <p className="font-sans text-slate-600 text-lg">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-sans font-medium rounded-lg hover:bg-accent-light transition-colors"
        >
          <Home className="h-4 w-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}