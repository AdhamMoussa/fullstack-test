import {
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { getRouteApi } from '@tanstack/react-router'

import { EmailVerificationBanner } from '../../auth/components/email-verification-banner'
import { FormErrorAlert } from '../../auth/components/form-error-alert'
import { useSignOutMutation } from '../../auth/queries/auth-mutations'

const appRoute = getRouteApi('/_app')

export function ApplicationPage() {
  const { currentUser } = appRoute.useRouteContext()
  const signOutMutation = useSignOutMutation()

  const submitSignOut = () => signOutMutation.mutate()

  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={1}>Welcome to the application.</Title>

        {!currentUser.emailVerified && (
          <EmailVerificationBanner email={currentUser.email} />
        )}

        <FormErrorAlert
          message={
            signOutMutation.isError
              ? 'Could not sign out. Please try again.'
              : undefined
          }
        />

        <Paper withBorder p="md">
          <Stack gap="xs">
            <div>
              <Text size="xs" c="dimmed">
                Name
              </Text>

              <Text>{currentUser.name}</Text>
            </div>

            <div>
              <Text size="xs" c="dimmed">
                Email
              </Text>

              <Group gap="xs">
                <Text>{currentUser.email}</Text>

                <Badge
                  size="sm"
                  variant="light"
                  color={currentUser.emailVerified ? 'green' : 'yellow'}
                >
                  {currentUser.emailVerified ? 'Verified' : 'Not verified'}
                </Badge>
              </Group>
            </div>
          </Stack>
        </Paper>

        <Button
          variant="light"
          onClick={submitSignOut}
          loading={signOutMutation.isPending}
        >
          Log out
        </Button>
      </Stack>
    </Container>
  )
}
