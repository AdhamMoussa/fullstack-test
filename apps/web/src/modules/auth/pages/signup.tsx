import { zodResolver } from '@hookform/resolvers/zod'
import { Button, PasswordInput, Stack, Text, TextInput } from '@mantine/core'
import { signUpInputSchema } from '@repo/contract'
import { useForm } from 'react-hook-form'

import { AnchorLink } from '../../core/components/anchor-link'
import { getApiErrorStatus, getApiErrorMessage } from '../../core/lib/api-error'
import { AuthWrapper } from '../components/auth-wrapper'
import { FormErrorAlert } from '../components/form-error-alert'
import { useSignUpMutation } from '../queries/auth-mutations'

const passwordRulesDescription =
  'At least 8 characters, with a letter, a number, and a special character.'

const visibilityToggleButtonProps = {
  'aria-label': 'Toggle password visibility',
}

export function SignupPage() {
  const signUpMutation = useSignUpMutation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signUpInputSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
    },
  })

  const submitSignUp = handleSubmit((registration) => {
    signUpMutation.mutate(registration, {
      onError: (error) => {
        if (getApiErrorStatus(error) === 409) {
          setError('email', {
            message: 'An account with this email already exists.',
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
      title="Create account"
      description="Set up an account to reach the protected application page."
    >
      <form noValidate onSubmit={submitSignUp}>
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

          <TextInput
            label="Name"
            autoComplete="name"
            withAsterisk
            error={errors.name?.message}
            {...register('name')}
          />

          <PasswordInput
            label="Password"
            autoComplete="new-password"
            description={passwordRulesDescription}
            withAsterisk
            error={errors.password?.message}
            visibilityToggleButtonProps={visibilityToggleButtonProps}
            {...register('password')}
          />

          <PasswordInput
            label="Confirm password"
            autoComplete="new-password"
            withAsterisk
            error={errors.confirmPassword?.message}
            visibilityToggleButtonProps={visibilityToggleButtonProps}
            {...register('confirmPassword')}
          />

          <Button type="submit" fullWidth loading={signUpMutation.isPending}>
            Create account
          </Button>
        </Stack>
      </form>

      <Text size="sm">
        Already have an account? <AnchorLink to="/signin">Sign in</AnchorLink>
      </Text>
    </AuthWrapper>
  )
}
