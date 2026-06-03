import React from 'react'

interface State {
  error: Error | null
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col gap-3 p-6">
          <p className="text-sm font-semibold text-red-700">Something went wrong</p>
          <p className="text-xs text-gray-500 font-mono break-all">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="self-start rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200"
          >
            Dismiss
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
