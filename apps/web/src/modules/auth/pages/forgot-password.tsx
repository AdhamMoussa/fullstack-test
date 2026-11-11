import { Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { AuthWrapper } from '../components/auth-wrapper'

export function ForgotPasswordPage() {
  return (
    <AuthWrapper
      title="Forgot password"
      description="The account lookup form arrives in the next task."
    >
      <Text size="sm">
        Remembered it? <Link to="/signin">Back to sign in</Link>.
      </Text>
    </AuthWrapper>
  )
}
