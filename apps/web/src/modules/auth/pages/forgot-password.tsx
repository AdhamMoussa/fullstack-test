import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Stack, Text, TextInput } from '@mantine/core'
import { forgotPasswordInputSchema } from '@repo/contract'
import { useForm } from 'react-hook-form'

import { AnchorLink } from '../../core/components/anchor-link'
import { AuthWrapper } from '../components/auth-wrapper'
import { FormErrorAlert } from '../components/form-error-alert'

import { useRequestPasswordResetMutation } from '../queries/auth-mutations'

import { getApiErrorMessage } from '../../core/lib/api-error'

export function ForgotPasswordPage() {
  const requestPasswordResetMutation = useRequestPasswordResetMutation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordInputSchema),
    defaultValues: { email: '' },
  })

  const submitForgotPassword = handleSubmit((request) => {
    requestPasswordResetMutation.mutate(request, {
      onError: (error) => {
        setError('root.serverError', {
          message: getApiErrorMessage(
            error,
            'Something went wrong. Please try again.',
          ),
        })
      },
    })
  })

  if (requestPasswordResetMutation.isSuccess) {
    return (
      <AuthWrapper
        title="Forgot password"
        description="Request a link to choose a new password."
      >
        <Alert color="green" variant="light" title="Check your email">
          If an account exists for that email, we&apos;ve sent a link to reset
          your password. The link expires soon and can be used once.
        </Alert>

        <Text size="sm">
          <AnchorLink to="/signin">Back to sign in</AnchorLink>
        </Text>
      </AuthWrapper>
    )
  }

  return (
    <AuthWrapper
      title="Forgot password"
      description="Enter your email and we'll send a link to reset your password."
    >
      <form noValidate onSubmit={submitForgotPassword}>
        <Stack gap="md">
          <FormErrorAlert message={errors.root?.serverError?.message} />

          <TextInput
            label="Email"
            type="email"
            autoComplete="email"
            withAsterisk
            error={errors.email?.message}
            {...register('email')}
          />

          <Button
            type="submit"
            fullWidth
            loading={requestPasswordResetMutation.isPending}
          >
            Send reset link
          </Button>
        </Stack>
      </form>

      <Text size="sm">
        Remembered it? <AnchorLink to="/signin">Back to sign in</AnchorLink>
      </Text>
    </AuthWrapper>
  )
}
