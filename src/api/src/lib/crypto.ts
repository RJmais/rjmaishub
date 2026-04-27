/**
 * crypto.ts — Web Crypto API primitives (Workers-compatible)
 * - PBKDF2 SHA-256 100k iterations para password hashing
 * - AES-256-GCM para dados sensíveis (CPF, TOTP secret)
 * - Random token generation via crypto.getRandomValues()
 */

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_SALT_LENGTH = 32; // 256 bits
const AES_TAG_LENGTH = 128; // bits

/**
 * Hash password com PBKDF2-SHA256.
 * Retorna formato: "iterations$salt$hash" (separados por $)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  // Salt aleatório (32 bytes = 256 bits)
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH));

  // PBKDF2-SHA256 com 100k iterações
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordData,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    256 // 32 bytes
  );

  const hash = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashHex = Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

/**
 * Verify password contra hash armazenado.
 * Comparação em tempo constante (timing-safe).
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [iterationsStr, saltHex, storedHashHex] = storedHash.split("$");
  if (!iterationsStr || !saltHex || !storedHashHex) return false;

  const iterations = parseInt(iterationsStr, 10);
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  // Reconstitui salt a partir de hex
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

  // Repete PBKDF2 com mesmo salt e iterações
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordData,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    keyMaterial,
    256
  );

  const hash = new Uint8Array(derivedBits);
  const computedHashHex = Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Comparação timing-safe
  return timingSafeEqual(computedHashHex, storedHashHex);
}

/**
 * Timing-safe string comparison.
 * Evita ataques de timing em verificações de senha/token.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Encrypt dados sensíveis com AES-256-GCM.
 * Retorna formato: "iv:ciphertext:tag" (em hex)
 */
export async function encryptAES256GCM(
  plaintext: string,
  key: Uint8Array
): Promise<string> {
  const encoder = new TextEncoder();
  const plaintextData = encoder.encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits (recomendado para GCM)

  const keyObj = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const cipherBits = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: AES_TAG_LENGTH,
    },
    keyObj,
    plaintextData
  );

  const ciphertext = new Uint8Array(cipherBits);
  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const ciphertextHex = Array.from(ciphertext)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${ivHex}:${ciphertextHex}`;
}

/**
 * Decrypt dados com AES-256-GCM.
 * Espera formato: "iv:ciphertext:tag"
 */
export async function decryptAES256GCM(
  encrypted: string,
  key: Uint8Array
): Promise<string> {
  const [ivHex, ciphertextHex] = encrypted.split(":");
  if (!ivHex || !ciphertextHex) throw new Error("Invalid encrypted format");

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const ciphertext = new Uint8Array(
    ciphertextHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );

  const keyObj = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const plaintextBits = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: AES_TAG_LENGTH,
    },
    keyObj,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintextBits);
}

/**
 * Generate random token (default 32 bytes = 256 bits).
 * Para email verify, password reset, session tokens.
 */
export function randomToken(byteLength: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * SHA-256 hex (alias para hashToken — consistência com lib/email e session).
 */
export async function sha256Hex(input: string): Promise<string> {
  return hashToken(input);
}

/**
 * Hash token para armazenar em DB (evita exposição de token cheio em caso de breach).
 * Usa SHA-256.
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBits = await crypto.subtle.digest("SHA-256", data);
  const hash = new Uint8Array(hashBits);
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
