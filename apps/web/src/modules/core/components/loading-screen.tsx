import { Center, Loader, Stack, Text } from '@mantine/core'

export function LoadingScreen() {
  return (
    <Center mih="60vh">
      <Stack align="center" gap="sm">
        <Loader />
        <Text c="dimmed">Loading…</Text>
      </Stack>
    </Center>
  )
}
