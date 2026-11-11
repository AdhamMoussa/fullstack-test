import { Alert } from '@mantine/core'

interface FormErrorAlertProps {
  message?: string
}

/** Surfaces server-side errors above a form, preserving multi-line messages. */
export function FormErrorAlert({ message }: FormErrorAlertProps) {
  if (!message) {
    return null
  }

  return (
    <Alert color="red" variant="light" style={{ whiteSpace: 'pre-line' }}>
      {message}
    </Alert>
  )
}
