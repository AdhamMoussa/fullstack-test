import { Alert, Button, Container, Stack, Text } from '@mantine/core'
import { getRouteApi } from '@tanstack/react-router'

import { AnchorLink } from '../../core/components/anchor-link'
import { getApiErrorMessage, getApiErrorStatus } from '../../core/lib/api-error'
import { AuthWrapper } from '../components/auth-wrapper'
import { FormErrorAlert } from '../components/form-error-alert'
import { useVerifyEmailMutation } from '../queries/auth-mutations'

const verifyEmailRoute = getRouteApi('/verify-email')

export function VerifyEmailPage() {
  const { token } = verifyEmailRoute.useSearch()

  return (
    <Container size="xs" py="xl">
      <AuthWrapper
        title="Verify your email"
        description="Confirm your email address to finish setting up your account."
      >
        {token ? (
          <VerifyEmailForm key={token} token={token} />
        ) : (
          <Stack gap="md">
            <Alert color="red" variant="light">
              This verification link is missing or incomplete.
            </Alert>

            <Text size="sm">
              <AnchorLink to="/app">
                Go to the application (you can send a new link there)
              </AnchorLink>
            </Text>
          </Stack>
        )}
      </AuthWrapper>
    </Container>
  )
}

interface VerifyEmailFormProps {
  token: string
}

export function VerifyEmailForm({ token }: VerifyEmailFormProps) {
  const verifyEmailMutation = useVerifyEmailMutation()

  // Mail scanners and link previews open links on their own, so the token is
  // only spent on an explicit click. It also keeps this page free of effects.
  const submitVerification = () => verifyEmailMutation.mutate({ token })

  if (verifyEmailMutation.isSuccess) {
    return (
      <Stack gap="md">
        <Alert color="green" variant="light" title="Email verified">
          Your email address is verified.
        </Alert>

        <Text size="sm">
          <AnchorLink to="/app">Continue to the application</AnchorLink>
        </Text>
      </Stack>
    )
  }

  const isInvalidLink = getApiErrorStatus(verifyEmailMutation.error) === 400

  return (
    <Stack gap="md">
      {verifyEmailMutation.isError &&
        (isInvalidLink ? (
          <>
            <Alert color="red" variant="light">
              This verification link is invalid or has expired. Sign in and send
              a new one from the application page.
            </Alert>

            <Text size="sm">
              <AnchorLink to="/app">Go to the application</AnchorLink>
            </Text>
          </>
        ) : (
          <FormErrorAlert
            message={getApiErrorMessage(
              verifyEmailMutation.error,
              'Something went wrong. Please try again.',
            )}
          />
        ))}

      <Button
        fullWidth
        loading={verifyEmailMutation.isPending}
        onClick={submitVerification}
      >
        Verify my email
      </Button>
    </Stack>
  )
}
