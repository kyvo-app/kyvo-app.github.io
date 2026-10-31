kyvo-crypto.min.js = esbuild IIFE bundle (global `KyvoCrypto`) of source-entry.js with:
- tweetnacl 1.0.3 (Unlicense) — ed25519 verify (Solana signMessage)
- @noble/secp256k1 1.7.1 (MIT) — recoverPublicKey (EVM personal_sign)
- @noble/hashes 1.3.3 (MIT) — keccak_256
Verification of wallet signatures. v8.25: also nacl.box (x25519 + XSalsa20-Poly1305) for the Phantom mobile deeplink login —
Kyvo creates a throwaway encryption key pair per login to exchange the encrypted connect / signMessage payloads with Phantom.
It is NOT a wallet key, can't sign transactions, holds nothing and is deleted after the login. Rebuild:
  npm i tweetnacl@1.0.3 @noble/secp256k1@1.7.1 @noble/hashes@1.3.3 esbuild@0.21.5
  npx esbuild source-entry.js --bundle --minify --format=iife --global-name=KyvoCrypto --outfile=kyvo-crypto.min.js
