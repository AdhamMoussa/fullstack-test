import { randomUUID } from 'node:crypto'

import type { INestApplication } from '@nestjs/common'
import {
  AUTHENTICATION_MODULE_OPTIONS,
  PasswordHasher,
  type AuthenticationModuleOptions,
} from '@nestjs/authentication'
import { InMemoryMailTransport, MailTransport } from '@nestjs/mail'
import { Test } from '@nestjs/testing'
import type { User } from '@repo/contract'
import request from 'supertest'
import type { App } from 'supertest/types.js'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'

import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

const TEST_PASSWORD = 'Passw0rd!'
const NEW_TEST_PASSWORD = 'NewPassw0rd!'
const WRONG_PASSWORD = 'WrongPassw0rd!'
const trustedOrigin = new URL(process.env.WEB_ORIGIN ?? 'http://localhost:5173')
  .origin

const mailbox = new InMemoryMailTransport()
const createdUserIds: string[] = []

let app: INestApplication<App>
let prismaService: PrismaService
let server: App

type SupertestAgent = ReturnType<typeof request.agent>

const uniqueEmail = () => `e2e-${randomUUID()}@example.com`

const signupBody = (email: string) => ({
  email,
  name: 'E2E User',
  password: TEST_PASSWORD,
  confirmPassword: TEST_PASSWORD,
})

function getSetCookie(response: request.Response): string {
  const setCookie = response.headers['set-cookie']
  expect(setCookie).toBeDefined()

  return Array.isArray(setCookie) ? setCookie[0] : setCookie
}

async function signUpUser(
  agent: SupertestAgent,
  email = uniqueEmail(),
): Promise<{
  agent: SupertestAgent
  createdUser: User
  email: string
  signupResponse: request.Response
}> {
  const signupResponse = await agent
    .post('/auth/signup')
    .send(signupBody(email))
    .expect(201)
  const createdUser = signupResponse.body.user as User
  createdUserIds.push(createdUser.id)

  return { agent, createdUser, email, signupResponse }
}

async function deleteUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return
  }

  await prismaService.client.authSession.deleteMany({
    where: { userId: { in: userIds } },
  })
  await prismaService.client.authEmailToken.deleteMany({
    where: { userId: { in: userIds } },
  })
  await prismaService.client.user.deleteMany({
    where: { id: { in: userIds } },
  })
}

async function requestResetMail(email: string) {
  await request(server)
    .post('/auth/forgot-password')
    .send({ email })
    .expect(202)

  const deadline = Date.now() + 5_000

  while (Date.now() < deadline) {
    const sentMail = mailbox.find({ to: email })
    if (sentMail) {
      return sentMail
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  throw new Error(`No password-reset mail arrived for ${email}`)
}

function resetTokenFromMail(email: string): Promise<string> {
  return requestResetMail(email).then((sentMail) => {
    const resetToken = sentMail
      .link('/reset-password')
      .searchParams.get('token')

    if (!resetToken) {
      throw new Error('Reset mail has no token')
    }

    return resetToken
  })
}

beforeAll(async () => {
  // Supertest talks HTTP, so the test cookie cannot be Secure. Production
  // keeps the package default: Secure __Host-sid.
  const authOptions: AuthenticationModuleOptions = {
    session: {
      absoluteTtl: '7d',
      idleTtl: '1d',
      cookie: { secure: false },
      trustedOrigins: [trustedOrigin],
    },
    passwordReset: { url: `${trustedOrigin}/reset-password` },
    emailVerification: { url: `${trustedOrigin}/verify-email` },
  }

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(AUTHENTICATION_MODULE_OPTIONS)
    .useValue(authOptions)
    .overrideProvider(PasswordHasher)
    .useValue(new PasswordHasher({ logN: 10 }))
    .overrideProvider(MailTransport)
    .useValue(mailbox)
    .compile()

  app = moduleFixture.createNestApplication()
  app.enableCsrfProtection({ trustedOrigins: [trustedOrigin] })
  await app.init()

  prismaService = app.get(PrismaService)
  server = app.getHttpServer()
})

beforeEach(() => {
  mailbox.clear()
})

afterEach(async () => {
  await deleteUsers(createdUserIds)
  createdUserIds.length = 0
})

afterAll(async () => {
  const leftoverUsers = await prismaService.client.user.findMany({
    where: { email: { startsWith: 'e2e-' } },
    select: { id: true },
  })

  await deleteUsers(leftoverUsers.map(({ id }) => id))
  await app.close()
})

describe('Auth API (e2e)', () => {
  describe('POST /auth/signup', () => {
    it('creates a user, sets an HttpOnly SameSite cookie, and returns no token', async () => {
      const agent = request.agent(server)
      const email = uniqueEmail()
      const { createdUser, signupResponse } = await signUpUser(agent, email)
      const setCookie = getSetCookie(signupResponse)

      expect(setCookie).toContain('sid=')
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).toContain('SameSite=Lax')
      expect(signupResponse.body).toEqual({ user: createdUser })
      expect(signupResponse.body).not.toHaveProperty('accessToken')
      expect(createdUser.email).toBe(email)
      expect(createdUser.emailVerified).toBe(false)
      expect(createdUser).not.toHaveProperty('passwordHash')
      expect(createdUser).not.toHaveProperty('confirmPassword')

      const meResponse = await agent.get('/users/me').expect(200)
      expect(meResponse.body).toEqual(createdUser)
    })

    it('rejects a duplicate email with 409', async () => {
      const agent = request.agent(server)
      const { email } = await signUpUser(agent)

      await agent
        .post('/auth/signup')
        .send(signupBody(email.toUpperCase()))
        .expect(409)
    })

    it('rejects invalid input with 400', async () => {
      const invalidSignupResponse = await request(server)
        .post('/auth/signup')
        .send({
          email: 'not-an-email',
          name: 'Al',
          password: 'weak',
          confirmPassword: 'different',
        })
        .expect(400)

      expect(invalidSignupResponse.body.message).toEqual(expect.any(Array))
    })
  })

  describe('POST /auth/signin', () => {
    it('signs in with the right password and sets a session cookie', async () => {
      const signupAgent = request.agent(server)
      const { email } = await signUpUser(signupAgent)
      const signinAgent = request.agent(server)

      const signinResponse = await signinAgent
        .post('/auth/signin')
        .send({ email, password: TEST_PASSWORD })
        .expect(200)

      expect(getSetCookie(signinResponse)).toContain('sid=')
      expect(signinResponse.body.user.email).toBe(email)
      await signinAgent.get('/users/me').expect(200)
    })

    it('returns 401 for a wrong password or an unknown email', async () => {
      const signupAgent = request.agent(server)
      const { email } = await signUpUser(signupAgent)
      const signinAgent = request.agent(server)

      await signinAgent
        .post('/auth/signin')
        .send({ email, password: WRONG_PASSWORD })
        .expect(401)

      await signinAgent
        .post('/auth/signin')
        .send({ email: uniqueEmail(), password: TEST_PASSWORD })
        .expect(401)
    })
  })

  describe('GET /users/me', () => {
    it('returns 401 without a session cookie', async () => {
      await request(server).get('/users/me').expect(401)
    })

    it('returns 401 for an invalid cookie', async () => {
      await request(server)
        .get('/users/me')
        .set('Cookie', 'sid=not-a-real-session')
        .expect(401)
    })

    it('returns 401 when the stored session has expired', async () => {
      const agent = request.agent(server)
      const { createdUser } = await signUpUser(agent)

      await prismaService.client.authSession.updateMany({
        where: { userId: createdUser.id },
        data: { expiresAt: new Date(0) },
      })

      await agent.get('/users/me').expect(401)
    })

    it('returns 401 after the user is deleted', async () => {
      const agent = request.agent(server)
      const { createdUser } = await signUpUser(agent)

      await prismaService.client.user.delete({
        where: { id: createdUser.id },
      })

      await agent.get('/users/me').expect(401)
    })
  })

  describe('POST /auth/sign-out', () => {
    it('returns 204 and does not let the old cookie authorize requests', async () => {
      const agent = request.agent(server)
      await signUpUser(agent)

      const signoutResponse = await agent.post('/auth/sign-out').expect(204)

      expect(getSetCookie(signoutResponse)).toContain('Max-Age=0')
      await agent.get('/users/me').expect(401)
    })
  })

  describe('password reset', () => {
    it('returns the same 202 response for known and unknown addresses', async () => {
      const agent = request.agent(server)
      const { email } = await signUpUser(agent)
      const unknownEmail = uniqueEmail()

      const knownResponse = await request(server)
        .post('/auth/forgot-password')
        .send({ email })
        .expect(202)
      const unknownResponse = await request(server)
        .post('/auth/forgot-password')
        .send({ email: unknownEmail })
        .expect(202)

      expect(knownResponse.text).toBe('')
      expect(knownResponse.body).toEqual(unknownResponse.body)
      expect(knownResponse.text).toBe(unknownResponse.text)
      await requestResetMail(email)
    })

    it('resets the password, signs the user in, and marks the address verified', async () => {
      const signupAgent = request.agent(server)
      const { email } = await signUpUser(signupAgent)
      const resetToken = await resetTokenFromMail(email)
      const resetAgent = request.agent(server)

      const resetResponse = await resetAgent
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: NEW_TEST_PASSWORD,
          confirmPassword: NEW_TEST_PASSWORD,
        })
        .expect(200)

      expect(resetResponse.body.user.emailVerified).toBe(true)
      expect(getSetCookie(resetResponse)).toContain('sid=')
      await resetAgent.get('/users/me').expect(200)

      await request(server)
        .post('/auth/signin')
        .send({ email, password: TEST_PASSWORD })
        .expect(401)

      await request(server)
        .post('/auth/signin')
        .send({ email, password: NEW_TEST_PASSWORD })
        .expect(200)

      await request(server)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: NEW_TEST_PASSWORD,
          confirmPassword: NEW_TEST_PASSWORD,
        })
        .expect(400)
    })

    it('rejects invalid and expired reset tokens with 400', async () => {
      const agent = request.agent(server)
      const { createdUser, email } = await signUpUser(agent)
      const expiredToken = await resetTokenFromMail(email)

      await prismaService.client.authEmailToken.updateMany({
        where: { userId: createdUser.id, purpose: 'password-reset' },
        data: { expiresAt: new Date(0) },
      })

      await request(server)
        .post('/auth/reset-password')
        .send({
          token: 'not-a-real-token',
          password: NEW_TEST_PASSWORD,
          confirmPassword: NEW_TEST_PASSWORD,
        })
        .expect(400)

      await request(server)
        .post('/auth/reset-password')
        .send({
          token: expiredToken,
          password: NEW_TEST_PASSWORD,
          confirmPassword: NEW_TEST_PASSWORD,
        })
        .expect(400)
    })
  })

  describe('security and routing', () => {
    it('rejects a cross-origin state-changing request from an untrusted origin', async () => {
      await request(server)
        .post('/auth/signup')
        .set('Origin', 'http://evil.example')
        .send(signupBody(uniqueEmail()))
        .expect(403)
    })

    it('allows a state-changing request from the trusted origin', async () => {
      const trustedSignupResponse = await request(server)
        .post('/auth/signup')
        .set('Origin', trustedOrigin)
        .send(signupBody(uniqueEmail()))
        .expect(201)

      createdUserIds.push(trustedSignupResponse.body.user.id)
    })

    it('does not register /auth/me', async () => {
      await request(server).get('/auth/me').expect(404)
    })
  })
})
