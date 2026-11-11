import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import {
  EmailVerificationService,
  PasswordResetService,
  Public,
  SignInService,
} from '@nestjs/authentication'
import {
  ApiAcceptedResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import {
  authResponseSchema,
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  signInInputSchema,
  signUpInputSchema,
  verifyEmailInputSchema,
  type AuthResponse,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
  type VerifyEmailInput,
} from '@repo/contract'

import {
  ApiErrorResponse,
  ApiUntrustedOriginResponse,
  SESSION_COOKIE_SECURITY,
  sessionCookieHeader,
  VALIDATION_ERROR_DESCRIPTION,
} from '../openapi/api-responses.js'
import { UsersRepository } from '../users/users.repository.js'
import { CredentialsService } from './credentials.service.js'

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly signInService: SignInService,
    private readonly passwordResetService: PasswordResetService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly usersRepository: UsersRepository,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: 'Create an account and start a session' })
  @ApiCreatedResponse({
    description: 'The account was created and signed in.',
    standardSchema: authResponseSchema,
    headers: sessionCookieHeader,
  })
  @ApiErrorResponse(400, VALIDATION_ERROR_DESCRIPTION)
  @ApiErrorResponse(409, 'Email already registered.')
  @ApiUntrustedOriginResponse()
  async signUp(
    @Body({ schema: signUpInputSchema }) body: SignUpInput,
  ): Promise<AuthResponse> {
    const registeredUser = await this.credentialsService.register({
      email: body.email,
      name: body.name,
      password: body.password,
    })

    await this.signInService.signIn(registeredUser.id, {
      method: 'password',
    })

    // The account and its session already exist, so a mail failure must not
    // turn signup into an error; the user can resend from `/app`.
    this.emailVerificationService
      .send({ id: registeredUser.id, email: registeredUser.email })
      .catch((error: unknown) => {
        this.logger.warn(
          'Could not send the verification email after signup.',
          {
            userId: registeredUser.id,
            error: error instanceof Error ? error.message : String(error),
          },
        )
      })

    return { user: registeredUser }
  }

  @Post('signin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({
    description: 'Credentials accepted; the session cookie is set.',
    standardSchema: authResponseSchema,
    headers: sessionCookieHeader,
  })
  @ApiErrorResponse(400, VALIDATION_ERROR_DESCRIPTION)
  @ApiErrorResponse(401, 'Invalid email or password.')
  @ApiUntrustedOriginResponse()
  async signIn(
    @Body({ schema: signInInputSchema }) body: SignInInput,
  ): Promise<AuthResponse> {
    const authenticatedUser = await this.credentialsService.verifyPassword(
      body.email,
      body.password,
    )

    if (!authenticatedUser) {
      throw new UnauthorizedException('Invalid email or password.')
    }

    await this.signInService.signIn(authenticatedUser.id, {
      method: 'password',
    })

    return { user: authenticatedUser }
  }

  @Post('verify-email')
  @HttpCode(204)
  @ApiOperation({ summary: 'Verify an email address with a link token' })
  @ApiNoContentResponse({ description: 'The address is verified.' })
  @ApiErrorResponse(
    400,
    'Body failed the shared contract schema, or the token is invalid, expired, or already used.',
  )
  @ApiUntrustedOriginResponse()
  async verifyEmail(
    @Body({ schema: verifyEmailInputSchema }) body: VerifyEmailInput,
  ): Promise<void> {
    const verifiedAddress = await this.emailVerificationService.verify(
      body.token,
    )

    if (!verifiedAddress) {
      throw new BadRequestException('Invalid or expired verification link.')
    }
  }

  @Post('forgot-password')
  @HttpCode(202)
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiAcceptedResponse({
    description:
      'Always 202 with no body, whether or not the account exists. In development the reset link is logged by the API.',
  })
  @ApiErrorResponse(400, VALIDATION_ERROR_DESCRIPTION)
  @ApiUntrustedOriginResponse()
  forgotPassword(
    @Body({ schema: forgotPasswordInputSchema }) body: ForgotPasswordInput,
  ): void {
    // Returns before the lookup and mail; known and unknown addresses get the
    // same response and timing.
    this.passwordResetService.request(body.email)
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset the password and sign in' })
  @ApiOkResponse({
    description: 'The password was reset and the user was signed in.',
    standardSchema: authResponseSchema,
    headers: sessionCookieHeader,
  })
  @ApiErrorResponse(
    400,
    'Body failed the shared contract schema, or the token is invalid, expired, or already used.',
  )
  @ApiUntrustedOriginResponse()
  async resetPassword(
    @Body({ schema: resetPasswordInputSchema }) body: ResetPasswordInput,
  ): Promise<AuthResponse> {
    const passwordResetResult = await this.passwordResetService.reset(
      body.token,
      body.password,
      { signIn: true },
    )

    if (!passwordResetResult) {
      throw new BadRequestException('Invalid or expired reset link.')
    }

    const resetUser = await this.usersRepository.findById(
      passwordResetResult.userId,
    )

    if (!resetUser) {
      throw new BadRequestException('Invalid or expired reset link.')
    }

    return { user: resetUser }
  }

  @Post('sign-out')
  @HttpCode(204)
  @ApiCookieAuth(SESSION_COOKIE_SECURITY)
  @ApiOperation({ summary: 'End the current session' })
  @ApiNoContentResponse({
    description:
      'Ends the current session and clears the cookie; also 204 without a session.',
  })
  @ApiUntrustedOriginResponse()
  async signOut(): Promise<void> {
    await this.signInService.signOut()
  }
}
