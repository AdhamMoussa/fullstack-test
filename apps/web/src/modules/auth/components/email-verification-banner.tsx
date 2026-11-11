import { Alert, Button, Group, Stack, Text } from '@mantine/core'

import { useSendVerificationEmailMutation } from '../queries/auth-mutations'

interface EmailVerificationBannerProps {
  email: string
}

export function EmailVerificationBanner({
  email,
}: EmailVerificationBannerProps) {
  const sendVerificationEmailMutation = useSendVerificationEmailMutation()

  const submitResend = () => sendVerificationEmailMutation.mutate()

  return (
    <Alert color="yellow" variant="light" title="Verify your email address">
      <Stack gap="xs">
        <Text size="sm">
          We sent a verification link to {email}. Open it to verify your
          address, or send a new one.
        </Text>

        {sendVerificationEmailMutation.isSuccess && (
          <Text size="sm">
            A new link is on its way. It expires in 24 hours.
          </Text>
        )}

        {sendVerificationEmailMutation.isError && (
          <Text size="sm">We couldn't send the link. Please try again.</Text>
        )}

        <Group>
          <Button
            size="xs"
            variant="light"
            loading={sendVerificationEmailMutation.isPending}
            onClick={submitResend}
          >
            Send a new link
          </Button>
        </Group>
      </Stack>
    </Alert>
  )
}
