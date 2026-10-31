import nacl from 'tweetnacl';
import * as secp from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
const ALPH = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58decode(s) {
  const bytes = [0];
  for (const ch of s) {
    const v = ALPH.indexOf(ch); if (v < 0) throw new Error('bad base58');
    let carry = v;
    for (let j = 0; j < bytes.length; j++) { carry += bytes[j] * 58; bytes[j] = carry & 255; carry >>= 8; }
    while (carry) { bytes.push(carry & 255); carry >>= 8; }
  }
  for (const ch of s) { if (ch === '1') bytes.push(0); else break; }
  return Uint8Array.from(bytes.reverse());
}
function b58encode(u8) {
  const digits = [0];
  for (const b of u8) { let c = b; for (let j = 0; j < digits.length; j++) { c += digits[j] << 8; digits[j] = c % 58; c = (c / 58) | 0; } while (c) { digits.push(c % 58); c = (c / 58) | 0; } }
  let out = ''; for (const b of u8) { if (b === 0) out += '1'; else break; }
  for (let i = digits.length - 1; i >= 0; i--) out += ALPH[digits[i]];
  return out;
}
const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (h) => Uint8Array.from((h.replace(/^0x/, '').match(/../g) || []).map((x) => parseInt(x, 16)));
const enc = (s) => new TextEncoder().encode(s);
export function verifySolana(message, sig, address) {
  const pk = b58decode(address); if (pk.length !== 32) return false;
  const s = sig instanceof Uint8Array ? sig : (typeof sig === 'string' ? (/^(0x)?[0-9a-f]{128}$/i.test(sig) ? unhex(sig) : b58decode(sig)) : Uint8Array.from(sig));
  if (s.length !== 64) return false;
  return nacl.sign.detached.verify(enc(message), s, pk);
}
export function recoverEvm(message, sigHex) {
  const m = enc(message);
  const pre = enc('\x19Ethereum Signed Message:\n' + m.length);
  const all = new Uint8Array(pre.length + m.length); all.set(pre); all.set(m, pre.length);
  const h = keccak_256(all);
  const sig = unhex(sigHex); if (sig.length !== 65) throw new Error('bad sig');
  let v = sig[64]; if (v >= 27) v -= 27; if (v > 1) v = v % 2;
  const pub = secp.recoverPublicKey(h, sig.slice(0, 64), v, false);
  const addr = '0x' + hex(keccak_256(pub.slice(1)).slice(12));
  return addr;
}
export function verifyEvm(message, sigHex, address) {
  try { return recoverEvm(message, sigHex).toLowerCase() === String(address).toLowerCase(); } catch (e) { return false; }
}
export function randomNonce() { const b = new Uint8Array(16); crypto.getRandomValues(b); return b58encode(b); }
export { b58decode, b58encode };
// v8.25 Phantom mobile deeplink login (connect + signMessage): an EPHEMERAL x25519 key pair encrypts the deeplink payloads
// between Kyvo and Phantom (nacl.box). It is not a wallet key, holds no funds, and is deleted after the login.
export function boxKeyPair() { const k = nacl.box.keyPair(); return { publicKey: k.publicKey, secretKey: k.secretKey }; }
export function boxKeyPairFromSecret(sk) { const k = nacl.box.keyPair.fromSecretKey(sk); return { publicKey: k.publicKey, secretKey: k.secretKey }; }
export function boxBefore(theirPk, mySk) { return nacl.box.before(theirPk, mySk); }
export function boxOpenAfter(box, nonce, shared) { return nacl.box.open.after(box, nonce, shared); }
export function boxAfter(msg, nonce, shared) { return nacl.box.after(msg, nonce, shared); }
export function randomBytes(n) { return nacl.randomBytes(n); }
if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
  nacl.setPRNG((x, n) => { const v = new Uint8Array(n); globalThis.crypto.getRandomValues(v); for (let i = 0; i < n; i++) x[i] = v[i]; });
}
