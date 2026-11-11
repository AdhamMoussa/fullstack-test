import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { signInInputSchema } from '@repo/contract'
import { useForm } from 'react-hook-form'

import { AnchorLink } from '../../core/components/anchor-link'
import { getApiErrorStatus, getApiErrorMessage } from '../../core/lib/api-error'
import { AuthWrapper } from '../components/auth-wrapper'
import { FormErrorAlert } from '../components/form-error-alert'
import { useSignInMutation } from '../queries/auth-mutations'

const visibilityToggleButtonProps = {
  'aria-label': 'Toggle password visibility',
}

export function SigninPage() {
  const signInMutation = useSignInMutation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInInputSchema),
    defaultValues: { email: '', password: '' },
  })

  const submitSignIn = handleSubmit((credentials) => {
    signInMutation.mutate(credentials, {
      onError: (error) => {
        if (getApiErrorStatus(error) === 401) {
          setError('root.serverError', {
            message: 'Invalid email or password.',
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
      title="Sign in"
      description="Use your account to reach the protected application page."
    >
      <form noValidate onSubmit={submitSignIn}>
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
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            withAsterisk
            error={errors.password?.message}
            visibilityToggleButtonProps={visibilityToggleButtonProps}
            {...register('password')}
          />

          <Group justify="flex-end">
            <AnchorLink to="/forgot-password" size="sm">
              Forgot password?
            </AnchorLink>
          </Group>

          <Button type="submit" fullWidth loading={signInMutation.isPending}>
            Sign in
          </Button>
        </Stack>
      </form>

      <Text size="sm">
        Need an account? <AnchorLink to="/signup">Create one</AnchorLink>
      </Text>
    </AuthWrapper>
  )
}
