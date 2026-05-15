// lib/auth.ts
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

const SESSION_COOKIE = 'todo_session';
const FALLBACK_SECRET = 'change-this-long-random-secret';

function getSecret() {
  return process.env.JWT_SECRET || FALLBACK_SECRET;
}

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64url(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function hashPin(pin: string, salt = cryptoSalt()) {
  const hash = scryptSync(pin, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function cryptoSalt() {
  return randomBytes(16).toString('hex');
}

export function verifyPin(pin: string, storedHash: string) {
  const [scheme, salt, hash] = storedHash.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(pin, salt, expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function signSession(userId: string) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
    }),
  );
  const signature = base64url(
    createHmac('sha256', getSecret()).update(`${header}.${payload}`).digest(),
  );

  return `${header}.${payload}.${signature}`;
}

export function verifySession(token: string | undefined) {
  if (!token) return null;

  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;

  const expected = base64url(
    createHmac('sha256', getSecret()).update(`${header}.${payload}`).digest(),
  );
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64url(payload)) as { sub?: unknown };
    return typeof parsed.sub === 'string' ? parsed.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUserId() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value) || DEFAULT_USER_ID;
}

export function setSessionCookie(response: NextResponse, token: string) {
  const isHttps = process.env.NEXT_PUBLIC_API_URL?.startsWith('https://') ?? false;

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}
