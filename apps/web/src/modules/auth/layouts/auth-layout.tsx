import { Container, Stack } from '@mantine/core'
import { Outlet } from '@tanstack/react-router'

export function AuthLayout() {
  return (
    <Container size="xs" py="xl">
      <Stack gap="lg">
        <Outlet />
      </Stack>
    </Container>
  )
}
