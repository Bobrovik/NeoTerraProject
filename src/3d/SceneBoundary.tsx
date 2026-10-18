import { Component, type ReactNode } from 'react'
import { ErrorState } from '../shared/ui/Status'

type Props = { children: ReactNode }
type State = { message: string | null }

export class SceneBoundary extends Component<Props, State> {
  state: State = { message: null }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'The 3D view failed to start.'
    return { message }
  }

  render() {
    if (this.state.message) {
      return <ErrorState title="The 3D view could not be shown" detail={this.state.message} />
    }
    return this.props.children
  }
}
