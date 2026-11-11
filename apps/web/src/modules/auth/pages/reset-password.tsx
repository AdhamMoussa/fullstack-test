import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, PasswordInput, Stack, Text } from '@mantine/core'
import { resetPasswordInputSchema } from '@repo/contract'
import { getRouteApi } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'

import { AnchorLink } from '../../core/components/anchor-link'
import { AuthWrapper } from '../components/auth-wrapper'
import { FormErrorAlert } from '../components/form-error-alert'

import { useResetPasswordMutation } from '../queries/auth-mutations'

import { getApiErrorStatus, getApiErrorMessage } from '../../core/lib/api-error'

const resetPasswordRoute = getRouteApi('/_auth/reset-password')

const passwordRulesDescription =
  'At least 8 characters, with a letter, a number, and a special character.'

const visibilityToggleButtonProps = {
  'aria-label': 'Toggle password visibility',
}

export function ResetPasswordPage() {
  const { token } = resetPasswordRoute.useSearch()

  if (!token) {
    return (
      <AuthWrapper
        title="Reset password"
        description="Choose a new password for your account."
      >
        <Alert color="red" variant="light">
          This reset link is missing or incomplete. Request a new one to
          continue.
        </Alert>

        <Text size="sm">
          <AnchorLink to="/forgot-password">Request a new link</AnchorLink>
        </Text>
      </AuthWrapper>
    )
  }

  return <ResetPasswordForm key={token} token={token} />
}

interface ResetPasswordFormProps {
  token: string
}

function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const resetPasswordMutation = useResetPasswordMutation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordInputSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
  })

  const submitResetPassword = handleSubmit((passwordReset) => {
    resetPasswordMutation.mutate(passwordReset, {
      onError: (error) => {
        if (getApiErrorStatus(error) === 400) {
          setError('root.serverError', {
            message:
              'This reset link is invalid or has expired. Request a new one.',
          })

          return
        }

        setError('root.serverError', {
          message: getApiErrorMessage(
            error,
            'Something went wrong. Please try again.',
          ),
        })
      },
    })
  })

  return (
    <AuthWrapper
      title="Reset password"
      description="Choose a new password for your account."
    >
      <form noValidate onSubmit={submitResetPassword}>
        <Stack gap="md">
          <FormErrorAlert message={errors.root?.serverError?.message} />

          <PasswordInput
            label="New password"
            autoComplete="new-password"
            description={passwordRulesDescription}
            withAsterisk
            error={errors.password?.message}
            visibilityToggleButtonProps={visibilityToggleButtonProps}
            {...register('password')}
          />
          <PasswordInput
            label="Confirm new password"
            autoComplete="new-password"
            withAsterisk
            error={errors.confirmPassword?.message}
            visibilityToggleButtonProps={visibilityToggleButtonProps}
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            fullWidth
            loading={resetPasswordMutation.isPending}
          >
            Reset password
          </Button>
        </Stack>
      </form>

      <Text size="sm">
        Need a new link?{' '}
        <AnchorLink to="/forgot-password">Request a new link</AnchorLink>
      </Text>
    </AuthWrapper>
  )
}
