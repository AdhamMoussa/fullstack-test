import { Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { AuthWrapper } from '../components/auth-wrapper'

export function ResetPasswordPage() {
  return (
    <AuthWrapper
      title="Reset password"
      description="The new-password form arrives in the next task."
    >
      <Text size="sm">
        Need a new link? <Link to="/forgot-password">Request another one</Link>.
      </Text>
    </AuthWrapper>
  )
}
