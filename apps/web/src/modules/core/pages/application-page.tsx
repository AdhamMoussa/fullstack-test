import { Container, Stack, Text, Title } from '@mantine/core'
import { getRouteApi } from '@tanstack/react-router'

const appRoute = getRouteApi('/_app')

export function ApplicationPage() {
  const { currentUser } = appRoute.useRouteContext()

  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={1}>Welcome to the application.</Title>

        <Text c="dimmed">Signed in as {currentUser.email}.</Text>
      </Stack>
    </Container>
  )
}
