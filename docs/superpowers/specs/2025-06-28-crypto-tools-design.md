# Crypto Tools — Design Spec

**Date:** 2025-06-28
**Status:** Draft

## Overview

Add 5 new tools and redesign 1 existing tool for cryptographic and identifier operations in ztools. All cryptography uses Web Crypto API (no Rust backend changes needed, except Hash file hashing retains existing Rust `hash_file` command).

## Tools

| # | Tool | Type | Route | File |
|---|------|------|-------|------|
| 1 | Hash Calculator | Redesign | `/hash` | `src/tools/HashCalculator.vue` |
| 2 | AES Encrypt/Decrypt | New | `/aes` | `src/tools/AesTool.vue` |
| 3 | RSA Key Generator | New | `/rsa-keys` | `src/tools/RsaKeyGen.vue` |
| 4 | RSA Encrypt/Decrypt | New | `/rsa-crypto` | `src/tools/RsaCrypto.vue` |
| 5 | HMAC Calculator | New | `/hmac` | `src/tools/HmacTool.vue` |
| 6 | UUID Generator | New | `/uuid` | `src/tools/UuidTool.vue` |
| — | Crypto utilities | New (shared) | — | `src/utils/crypto.ts` |

## Architecture

```
src/
├── utils/
│   ├── crypto.ts          ← NEW: AES/RSA/HMAC key import, encrypt/decrypt/sign/verify, format conversion
│   └── hash.ts            ← MODIFY: expose algorithm list, single-algorithm hash
├── tools/
│   ├── HashCalculator.vue ← MODIFY: algorithm dropdown, single result
│   ├── AesTool.vue        ← NEW
│   ├── RsaKeyGen.vue      ← NEW
│   ├── RsaCrypto.vue      ← NEW
│   ├── HmacTool.vue       ← NEW
│   └── UuidTool.vue       ← NEW
├── router/index.ts        ← MODIFY: add routes + modify hash route (unchanged path)
├── components/Sidebar.vue ← MODIFY: add 5 sidebar entries
└── i18n/zh-CN.ts, en-US.ts← MODIFY: add 5 tool i18n groups
```

### Design Principles

- **Pure Web Crypto API** — all AES/RSA/HMAC ops run in browser sandbox. Keys never sent to backend.
- **Reuse shared components** — ToolLayout, ToolTextarea, CodeOutput, ToolActionBar.
- **No new dependencies** — Web Crypto API is built-in. No `crypto-js`, `node-forge`, etc.
- **Auto-recalculate** — when any parameter changes and input exists with last successful result, re-run automatically.

---

## Tool 1: Hash Calculator (Redesign)

### Changes from current
- **Before:** input text → calculates all SHA algorithms (SHA-1, SHA-256, SHA-384, SHA-512) simultaneously, displays all results at once.
- **After:** input text → select one algorithm from dropdown → calculate only that one → display single result.

### UI Layout

```
┌─ Hash Calculator ────────────────────────┐
│  [ToolTextarea: input text]              │
│                                          │
│  Algorithm [SHA-256 ▼]  [Calculate]      │
│            [Clear] [File Hash]           │
│                                          │
│  ┌─ SHA-256 ─────────────────────────┐   │
│  │  e3b0c44298fc1c149afbf4c8996fb... │   │
│  └───────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

### Algorithms

| Algorithm | Web Crypto Name | Default |
|-----------|----------------|---------|
| MD5 | N/A (custom impl or skip) | no |
| SHA-1 | `SHA-1` | no |
| SHA-256 | `SHA-256` | **yes** |
| SHA-384 | `SHA-384` | no |
| SHA-512 | `SHA-512` | no |
| SHA3-256 | `SHA3-256` | no |
| SHA3-512 | `SHA3-512` | no |

**Note on MD5:** Web Crypto API does not support MD5. Include a pure JS implementation (~80 lines, well-known algorithm). Widely used for checksums and legacy interop.

### Behavior

- Switching algorithm with existing input + successful prior result → auto-recalculate.
- File Hash button: uses existing Rust `hash_file` command but only returns the selected algorithm result (previously returned all 4).
- Output panel title shows selected algorithm name.

### Files changed

- `src/tools/HashCalculator.vue`: full UI redesign, remove multi-result output, add dropdown.
- `src/utils/hash.ts`: expose `HASH_ALGORITHMS` list, add single-algorithm helpers.

---

## Tool 2: AES Encrypt/Decrypt

### UI Layout

```
┌─ AES Encrypt/Decrypt ──────────────────────────────┐
│  ┌─ Input ─────────────────────────────────────┐   │
│  │  [ToolTextarea: plaintext / ciphertext]      │   │
│  │                                              │   │
│  │  Key   [text input________________] [Random] │   │
│  │  IV    [text input________________] [Random] │   │
│  │                                              │   │
│  │  Mode    [CBC ▼]    Key Size  [256 bit ▼]   │   │
│  │  Padding [PKCS7 ▼]  Output    [Base64 ▼]    │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Result ─────────────────────────────────────┐   │
│  │  [Encrypt] [Decrypt] [Clear]                  │   │
│  │  ─────────────────────────────────────        │   │
│  │  [CodeOutput]                                 │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Parameters

| Parameter | Options | Default | Notes |
|-----------|---------|---------|-------|
| Mode | ECB, CBC, CFB, OFB, CTR, GCM | CBC | ECB: IV hidden. GCM: auth tag shown/required |
| Key Size | 128 bit, 192 bit, 256 bit | 256 bit | Determines key length for random generation |
| Padding | PKCS7, NoPadding, ZeroPadding, ISO10126, ANSI X.923 | PKCS7 | NoPadding: validate input length matches block size |
| Output | Base64, HEX | Base64 | Changes display, not internal computation |

### Key/IV Input

- Accept HEX and Base64 keys (auto-detect format).
- "[Random]" button generates cryptographically random key/IV via `crypto.getRandomValues`.
- Key length enforced: 128-bit key rejects 24-byte input with clear error message.

### GCM Mode

- Encrypt: output includes auth tag appended; auth tag extracted and shown separately.
- Decrypt: separate auth tag input field appears; decryption fails without correct tag.

### Edge Cases

- ECB mode: IV row hidden entirely.
- NoPadding: block misalignment → error message.
- Decryption with wrong key/IV → `OperationError` caught, clear error displayed.

### Files created

- `src/tools/AesTool.vue`

---

## Tool 3: RSA Key Generator

### UI Layout

```
┌─ RSA Key Generator ──────────────────────────────┐
│                                                   │
│  Key Size [2048 ▼]   Format [PEM ▼]  [Generate]  │
│                                                   │
│  ┌─ Public Key ──────────────────────────────┐   │
│  │  -----BEGIN PUBLIC KEY-----               │   │
│  │  MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...     │   │
│  │  -----END PUBLIC KEY------                │   │
│  │                                 [Copy]    │   │
│  └───────────────────────────────────────────┘   │
│                                                   │
│  ┌─ Private Key ⚠️ Keep Secret ──────────────┐   │
│  │  -----BEGIN PRIVATE KEY----               │   │
│  │  MIIEvQIBADANBgkqhkiG9w0BAQEFA...        │   │
│  │  -----END PRIVATE KEY-----                │   │
│  │                                 [Copy]    │   │
│  └───────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┘
```

### Parameters

| Parameter | Options | Default | Notes |
|-----------|---------|---------|-------|
| Key Size | 1024, 2048, 4096 | 2048 | 1024 considered weak but available for interop |
| Format | PEM, DER | PEM | DER output displayed as HEX |

### Behavior

- Click "Generate" → `crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength, ... })` → export as `spki` (public) and `pkcs8` (private) → wrap in PEM headers.
- Private key panel has distinct background (warning tint) to visually separate from public key.
- Each click generates a new key pair (no reuse).
- Copy buttons per key panel.

### Files created

- `src/tools/RsaKeyGen.vue`

---

## Tool 4: RSA Encrypt/Decrypt

### UI Layout

```
┌─ RSA Encrypt/Decrypt ────────────────────────────────────┐
│  ┌─ Input ───────────────────────────────────────────┐   │
│  │                                                    │   │
│  │  Data                                              │   │
│  │  [ToolTextarea: plaintext / ciphertext / signature]│   │
│  │                                                    │   │
│  │  Public Key                                        │   │
│  │  [multiline textarea: -----BEGIN PUBLIC KEY-----]  │   │
│  │                                                    │   │
│  │  Private Key                                       │   │
│  │  [multiline textarea: -----BEGIN PRIVATE KEY-----]  │   │
│  │                                                    │   │
│  │  Encrypt Padding [OAEP-SHA256 ▼]                  │   │
│  │  Sign Padding    [PSS-SHA256 ▼]                   │   │
│  │  Output Format   [Base64 ▼]                       │   │
│  └────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Result ──────────────────────────────────────────┐   │
│  │  [Public Encrypt] [Private Decrypt]               │   │
│  │  [Private Sign] [Public Verify] [Clear]           │   │
│  │  ───────────────────────────────────              │   │
│  │  [CodeOutput]                                     │   │
│  └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### Operations

| Button | Crypto Op | Key Used | Direction |
|--------|-----------|----------|-----------|
| Public Encrypt | `subtle.encrypt` | Public key | Data privacy |
| Private Decrypt | `subtle.decrypt` | Private key | Data recovery |
| Private Sign | `subtle.sign` | Private key | Identity proof |
| Public Verify | `subtle.verify` | Public key | Signature validation |

### Parameters

| Parameter | Options | Default | Notes |
|-----------|---------|---------|-------|
| Encrypt Padding | PKCS#1 v1.5, OAEP-SHA-1, OAEP-SHA-256, OAEP-SHA-512 | OAEP-SHA-256 | For encrypt/decrypt operations |
| Sign Padding | PKCS#1 v1.5, PSS-SHA-256, PSS-SHA-512 | PSS-SHA-256 | For sign/verify operations |
| Output Format | Base64, HEX | Base64 | For encrypt/sign output |

### Constraints

- **Input length limit:** RSA encrypt max plaintext = `keySize/8 - 2*hashSize - 2` bytes (OAEP). E.g., 2048-bit OAEP-SHA256: max ~190 bytes. Exceeding this shows a clear error.
- **Key format:** Auto-detect PEM/DER from input. PEM lines stripped internally.
- **Signing:** Signature output is not meaningful to display as text — Base64/HEX representation shown.

### Edge Cases

- Invalid PEM format → parse error shown at key input.
- Wrong key type (e.g., private key in public key field) → clear error on operation.
- Empty key fields → button disabled with tooltip "Requires public key" etc.

### Files created

- `src/tools/RsaCrypto.vue`

---

## Tool 5: HMAC Calculator

### Purpose

Compute Hash-based Message Authentication Code. Natural complement to the Hash tool — same algorithm selection plus a secret key.

### UI Layout

```
┌─ HMAC Calculator ───────────────────────────┐
│  ┌─ Input ──────────────────────────────┐   │
│  │  [ToolTextarea: message]             │   │
│  │                                      │   │
│  │  Secret Key [text input________]     │   │
│  │                                      │   │
│  │  Algorithm [SHA-256 ▼]              │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌─ Result ────────────────────────────┐   │
│  │  [Calculate] [Clear]                │   │
│  │  ──────────────────────────────     │   │
│  │  [CodeOutput: HEX result]           │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Algorithms

SHA-1, SHA-256 (default), SHA-384, SHA-512.

### Behavior

- Output always HEX (HMAC standard convention).
- Auto-recalculate on algorithm/key/message change.

### Files created

- `src/tools/HmacTool.vue`

---

## Tool 6: UUID Generator

### Purpose

Generate UUIDs on demand. Dead simple — no dependencies, just `crypto.randomUUID()` and formatting logic.

### UI Layout

```
┌─ UUID Generator ────────────────────────────┐
│                                              │
│  Version [v4 ▼]    Count [1 ▼]  [Generate]  │
│                                              │
│  ┌─ Results ────────────────────────────┐   │
│  │  550e8400-e29b-41d4-a716-446655440000│   │
│  │  6ba7b810-9dad-11d1-80b4-00c04fd430c8│   │
│  │  ...                                 │   │
│  │                           [Copy All] │   │
│  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### Parameters

| Parameter | Options | Default | Notes |
|-----------|---------|---------|-------|
| Version | v4 (random) | v4 | v1/v7 planned as future enhancement |
| Count | 1, 5, 10, 50, 100 | 1 | Batch generation |

### Implementation notes

- v4: `crypto.randomUUID()` — one-liner. Start here.
- v1 and v7: custom implementation needed. Scope as future enhancement — not in initial implementation.
- "Copy All" copies newline-separated UUIDs.

### Files created

- `src/tools/UuidTool.vue`

---

## Shared Utility: `src/utils/crypto.ts`

### Exports

```typescript
// AES
export function aesEncrypt(plaintext: string, key: ArrayBuffer, iv: ArrayBuffer, mode: string, padding: string): Promise<ArrayBuffer>
export function aesDecrypt(ciphertext: ArrayBuffer, key: ArrayBuffer, iv: ArrayBuffer, mode: string, padding: string): Promise<ArrayBuffer>

// RSA
export function rsaEncrypt(data: ArrayBuffer, publicKey: CryptoKey, padding: string): Promise<ArrayBuffer>
export function rsaDecrypt(data: ArrayBuffer, privateKey: CryptoKey, padding: string): Promise<ArrayBuffer>
export function rsaSign(data: ArrayBuffer, privateKey: CryptoKey, padding: string): Promise<ArrayBuffer>
export function rsaVerify(signature: ArrayBuffer, data: ArrayBuffer, publicKey: CryptoKey, padding: string): Promise<boolean>

// Key handling
export function importAesKey(keyData: ArrayBuffer, format: 'raw', keySize: number): Promise<CryptoKey>
export function importRsaPublicKey(pem: string): Promise<CryptoKey>
export function importRsaPrivateKey(pem: string): Promise<CryptoKey>
export function exportRsaPublicKey(key: CryptoKey, format: 'pem' | 'der'): Promise<string>
export function exportRsaPrivateKey(key: CryptoKey, format: 'pem' | 'der'): Promise<string>

// HMAC
export function computeHmac(message: string, key: string, algorithm: string): Promise<string>

// UUID
export function generateUuidV4(): string
export function generateUuidV7(): string
export function generateUuidV1(): string
export function generateUuids(version: string, count: number): string[]

// Format conversion
export function arrayBufferToBase64(buffer: ArrayBuffer): string
export function arrayBufferToHex(buffer: ArrayBuffer): string
export function base64ToArrayBuffer(b64: string): ArrayBuffer
export function hexToArrayBuffer(hex: string): ArrayBuffer
export function pemToArrayBuffer(pem: string): ArrayBuffer
export function arrayBufferToPem(buffer: ArrayBuffer, type: 'PUBLIC KEY' | 'PRIVATE KEY'): string
```

### Error Handling

All functions throw typed errors (`AesError`, `RsaError`, `KeyFormatError`) with human-readable messages suitable for direct display in the UI.

---

## i18n Additions

### Keys pattern

Each tool gets:
```
tools.<key>.name          — Tool title in sidebar and header
tools.<key>.description   — Tooltip / description
tools.<key>.*             — UI labels as needed
```

### New tool keys

- `aes`, `rsaKeys`, `rsaCrypto`, `hmac`, `uuid`

### Updated tool keys

- `hash` — may add `algorithm`, `selectAlgorithm` etc.

---

## Testing Strategy

- **Unit tests:** `src/utils/__tests__/crypto.test.ts` — all utility functions with known test vectors (NIST test vectors for AES, RSA, HMAC).
- **Component tests:** `src/tools/__tests__/AesTool.test.ts`, etc. — basic render, parameter interaction.
- **Manual verification:** Real browser environment for Web Crypto integration.

---

## Non-Goals

- File encryption (AES/RSA on files) — text only.
- Rust backend changes (except existing `hash_file` adaptation).
- JWT debugger, certificate viewer, SSH key tools — out of scope.
- Key storage / keychain integration.
- Drag-and-drop file input.
- Dark mode (already handled by existing theme system).
