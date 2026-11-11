import { Button, Container, Paper, Stack, Text, Title } from '@mantine/core'
import { getRouteApi } from '@tanstack/react-router'

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
              <Text>{currentUser.email}</Text>
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
