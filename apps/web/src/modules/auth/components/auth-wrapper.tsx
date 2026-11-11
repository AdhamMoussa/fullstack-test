import { Stack, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'

interface AuthWrapperProps {
  title: string
  description: string
  children?: ReactNode
}

export function AuthWrapper({
  title,
  description,
  children,
}: AuthWrapperProps) {
  return (
    <Stack gap="md">
      <Title order={1}>{title}</Title>

      <Text c="dimmed">{description}</Text>
      {children}
    </Stack>
  )
}
