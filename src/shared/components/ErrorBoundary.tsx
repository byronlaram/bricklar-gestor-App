import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button, Card, CardTitle, CardDescription } from '@/shared/components/ui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
          <Card className="max-w-md w-full p-6 text-center space-y-4 shadow-lg border-slate-200">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg text-slate-900 font-bold">
                Ocurrió un error inesperado
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                La aplicación encontró una inconsistencia al renderizar esta vista.
              </CardDescription>
            </div>

            {this.state.error && (
              <div className="bg-slate-100 p-3 rounded-lg text-left text-2xs font-mono text-slate-700 max-h-24 overflow-y-auto border border-slate-200">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Recargar Página
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.href = '/'
                }}
                leftIcon={<Home className="h-4 w-4" />}
              >
                Ir a Inicio
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
