/**
 * The session cookie name for the given `Secure` setting. Mirrors the
 * `@nestjs/authentication` default so the API and the OpenAPI document agree.
 *
 * A `__Host-` prefix is only valid on a cookie that is Secure, has `Path=/`,
 * and sets no `Domain`; browsers drop a prefixed cookie that breaks those
 * rules, and the package fails at startup instead. Plain-HTTP dev therefore
 * uses the unprefixed `sid`.
 */
export function sessionCookieName(secure: boolean): string {
  return secure ? '__Host-sid' : 'sid'
}
