import { Button, Center, Stack, Text, Title } from '@mantine/core'
import type { ErrorComponentProps } from '@tanstack/react-router'

/** Router-level failure view. Raw error details stay out of the UI. */
export function ErrorScreen({ reset }: ErrorComponentProps) {
  return (
    <Center mih="60vh">
      <Stack align="center" gap="sm">
        <Title order={2}>Something went wrong.</Title>
        <Text c="dimmed" ta="center">
          We couldn’t load this page. Check your connection and try again.
        </Text>
        <Button onClick={reset}>Try again</Button>
      </Stack>
    </Center>
  )
}
