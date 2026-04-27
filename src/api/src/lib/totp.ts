/**
 * TOTP 2FA utilities — RFC 6238.
 * Implementação manual com Web Crypto (Workers-compat).
 * Para produção heavy use a lib `otpauth`.
 */

import { randomToken, sha256Hex } from "./crypto";

const PERIOD = 30;
const DIGITS = 6;
const ALGORITHM = "SHA-1"; // RFC 6238 default
const ISSUER = "RJ%2B%20Hub"; // URL-encoded "RJ+ Hub"

/** Gera secret base32 (160 bits = 20 bytes). */
export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

/** URI otpauth:// pra QR code. */
export function buildTotpUri(secret: string, accountName: string): string {
  const account = encodeURIComponent(accountName);
  return `otpauth://totp/${ISSUER}:${account}?secret=${secret}&issuer=${ISSUER}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}

/** Verifica código TOTP. Aceita janela ±1 step (anti-clock-drift). */
export async function verifyTotpCode(
  secret: string,
  code: string
): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / PERIOD);
  for (const offset of [-1, 0, 1]) {
    const expected = await generateTotpCode(secret, counter + offset);
    if (constantTimeEqual(expected, code)) return true;
  }
  return false;
}

async function generateTotpCode(
  secret: string,
  counter: number
): Promise<string> {
  const keyBytes = base32Decode(secret);
  const counterBytes = new ArrayBuffer(8);
  new DataView(counterBytes).setBigUint64(0, BigInt(counter), false);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "HMAC", hash: ALGORITHM },
    false,
    ["sign"]
  );
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));
  const offset = hmac[hmac.length - 1]! & 0xf;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** 10 backup codes em formato XXXX-XXXX (8 hex chars cada). */
export function generateBackupCodes(): string[] {
  return Array.from({ length: 10 }, () => {
    const t = randomToken(4); // 8 hex chars
    return `${t.slice(0, 4)}-${t.slice(4, 8)}`.toUpperCase();
  });
}

export async function hashBackupCode(code: string): Promise<string> {
  return sha256Hex(code.toUpperCase().replace(/[^A-F0-9]/g, ""));
}

/* ───── Base32 helpers (RFC 4648, sem padding) ───── */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes: Uint8Array): string {
  let out = "";
  let bits = 0;
  let value = 0;
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  return out;
}

function base32Decode(s: string): Uint8Array {
  const clean = s.replace(/=+$/, "").toUpperCase();
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
