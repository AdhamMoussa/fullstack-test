import { Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { AuthWrapper } from '../components/auth-wrapper'

export function SignupPage() {
  return (
    <AuthWrapper
      title="Create account"
      description="The signup form arrives in the next task."
    >
      <Text size="sm">
        Already have an account? <Link to="/signin">Sign in</Link>
      </Text>
    </AuthWrapper>
  )
}
