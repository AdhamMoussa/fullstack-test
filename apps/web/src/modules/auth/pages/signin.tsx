import { Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { AuthWrapper } from '../components/auth-wrapper'

export function SigninPage() {
  return (
    <AuthWrapper
      title="Sign in"
      description="The signin form arrives in the next task."
    >
      <Text size="sm">
        Need an account? <Link to="/signup">Create one</Link>. Forgot your
        password? <Link to="/forgot-password">Reset it</Link>.
      </Text>
    </AuthWrapper>
  )
}
