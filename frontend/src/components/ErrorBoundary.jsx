import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // At minimum, this goes to the browser console so it's not a
    // silent failure - a real app might also send this to a logging
    // service, but that's out of scope here.
    console.error('[ErrorBoundary] caught a render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg text-text px-6">
          <div className="max-w-sm text-center flex flex-col gap-4">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-text-dim">
              SyncSpace hit an unexpected error and can't continue safely. Your
              room data is not affected — it's saved on the server, not in
              this browser tab.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-accent text-bg-deep rounded-md py-2.5 font-semibold text-sm cursor-pointer hover:brightness-110"
            >
              Reload SyncSpace
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}