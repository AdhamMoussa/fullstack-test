import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import {
  PasswordResetService,
  Public,
  SignInService,
} from '@nestjs/authentication'
import {
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  signInInputSchema,
  signUpInputSchema,
  type AuthResponse,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
} from '@repo/contract'

import { UsersRepository } from '../users/users.repository.js'
import { CredentialsService } from './credentials.service.js'

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly signInService: SignInService,
    private readonly passwordResetService: PasswordResetService,
    private readonly usersRepository: UsersRepository,
  ) {}

  @Post('signup')
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

    return { user: registeredUser }
  }

  @Post('signin')
  @HttpCode(200)
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

  @Post('forgot-password')
  @HttpCode(202)
  forgotPassword(
    @Body({ schema: forgotPasswordInputSchema }) body: ForgotPasswordInput,
  ): void {
    // Returns before the lookup and mail; known and unknown addresses get the
    // same response and timing.
    this.passwordResetService.request(body.email)
  }

  @Post('reset-password')
  @HttpCode(200)
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
  async signOut(): Promise<void> {
    await this.signInService.signOut()
  }
}
