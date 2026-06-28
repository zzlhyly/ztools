# Crypto Tools — Design Spec

**Date:** 2025-06-28
**Status:** Draft

## Overview

Add 5 new tools and redesign 1 existing tool for cryptographic and identifier operations in ztools. All cryptography uses Web Crypto API. One Rust backend change: `hash_file` command modified to accept an `algorithm` parameter so file hashing only computes the selected algorithm instead of all four.

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
| Mode | ECB, CBC, CTR, GCM | CBC | CFB/OFB removed — not supported by Web Crypto API in any browser. ECB: IV hidden. GCM: auth tag handling |
| Key Size | 128 bit, 192 bit, 256 bit | 256 bit | Determines key length for random generation |
| Padding | PKCS7, NoPadding, ZeroPadding, ISO10126, ANSI X.923 | PKCS7 | NoPadding: validate input length matches block size |
| Output | Base64, HEX | Base64 | Changes display, not internal computation |

### Key/IV Input

- Accept HEX and Base64 keys (auto-detect format).
- "[Random]" button generates cryptographically random key/IV via `crypto.getRandomValues`.
- Key length enforced: 128-bit key rejects 24-byte input with clear error message.

### Key Format Detection

Key and IV inputs auto-detect format: if input is pure HEX characters with even length → parse as HEX; otherwise treat as UTF-8 string. A small label beside the input shows detected format and byte count.

### GCM Mode

- Encrypt: ciphertext and 128-bit auth tag displayed separately (two lines in CodeOutput).
- Decrypt: user pastes `ciphertext || tag` concatenated into the input field; tool splits internally by tag length (last 16 bytes). No separate tag input field needed. Matches how most libraries output GCM results.
- Auth tag length fixed at 128 bits (Web Crypto default).

### Edge Cases

- ECB mode: IV row hidden entirely.
- CTR mode: no padding allowed — padding dropdown hidden/disabled, forced to NoPadding.
- NoPadding: input byte count displayed in real-time below input (`当前: 47 / 16 字节（未对齐）`), turns warning color when misaligned. Encrypt button not disabled but shows warning icon. Decrypt never checks alignment (ciphertext always aligned).
- When NoPadding selected, other padding options hidden (padding dropdown replaced with static "NoPadding" label).
- Decryption with wrong key/IV → `OperationError` caught, translated to user-friendly message.
- Key byte count label warns on mismatch (e.g., 24-byte key for 256-bit AES).

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

- Click "Generate" → `crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength, ... })` → export as `spki` (public) and `pkcs8` (private) → wrap in PEM headers.
- Key generated with RSA-OAEP algorithm, but PEM export is algorithm-agnostic (bare RSA parameters). In RSA Crypto tool, the same PEM can be imported as RSA-OAEP for encryption or RSA-PSS for signing — seamlessly dual-use.
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

### Key Dual-Use

Same PEM key pair from Key Generator can be used for both encryption and signing in this tool. Internally, PEM is imported separately for each operation with the appropriate Web Crypto algorithm name:
- Encrypt/Decrypt: import as `RSA-OAEP`
- Sign/Verify: import as `RSA-PSS`

### Input Length Limit

RSA encrypt max payload size depends on key size and padding. Displayed as live hint below the data input:

```
当前可加密: ≤190 字节  (2048-bit, OAEP-SHA256)
```

When input exceeds the limit, encrypt button is disabled with tooltip: `输入超过 190 字节上限`。Decrypt has no size limit (ciphertext always fits).

**Formula:** `maxBytes = keyBits/8 - 2*hashBytes - 2` (for OAEP).

### Edge Cases

- Invalid PEM format → parse error shown beside key input field immediately.
- Wrong key type (e.g., private key pasted into public key field) → clear error on operation: `密钥格式错误：需要公钥 PEM 格式`.
- Empty key fields → operation buttons disabled with appropriate tooltip.

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

### Key Input

Secret key auto-detects format: pure HEX string with even length → treated as HEX bytes; otherwise treated as UTF-8 string. Label beside input shows: `（已识别为 HEX / 4 字节）` or `（UTF-8 字符串 / 8 字节）`.

No "random generate" button — HMAC keys are pre-shared from external systems, random generation offers no value.

### Behavior

- Output always HEX (HMAC standard convention).
- Auto-recalculate on algorithm/key/message change when all required fields filled and last operation succeeded.

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

### Error Handling — Two-Layer Strategy

**Layer 1: Input validation (pre-Web Crypto)**
Format checks, length validation, PEM parsing done before calling Web Crypto. Produces specific Chinese messages:
- `密钥格式错误：需要 PEM 或 HEX 格式`
- `输入超过 190 字节上限（2048-bit OAEP-SHA256）`
- `IV 长度必须为 16 字节（AES 块大小）`

**Layer 2: Runtime fallback (Web Crypto exceptions)**
Web Crypto `DOMException` translated to broad categories (no per-exception mapping):
- `OperationError` during decrypt → `解密失败：密钥或 IV 不匹配，或密文已损坏`
- `OperationError` during encrypt → `加密失败：请检查密钥长度和算法兼容性`
- `DataError` during key import → `密钥格式无效`
- Unexpected errors → original message with `加密异常：` prefix

Typed errors (`AesError`, `RsaError`, `KeyFormatError`) used internally in `crypto.ts`. Components catch and display the message string.

---

## State Management — Auto-Recalculate Rules

A tool enters "computable" state when **all required fields are non-empty + last operation succeeded + no format errors**. Auto-recalculate only fires on parameter change while in this state.

**Required fields per tool:**
| Tool | Required |
|------|----------|
| Hash | Input text |
| AES | Input text + Key (+ IV for CBC/CTR/GCM) |
| HMAC | Message + Secret Key |
| RSA Crypto | Data + key fields needed for the last-used operation |
| RSA KeyGen | None (button-only trigger) |
| UUID | None (button-only trigger) |

`ToolTextarea` `submit-hotkey` (Ctrl+Enter) triggers the primary action (calculate/encrypt/generate) across all tools.

---

## Browser Compatibility

| Algorithm | Chrome | Firefox | Safari | Edge |
|-----------|--------|---------|--------|------|
| SHA-256/384/512 | ✅ | ✅ | ✅ | ✅ |
| SHA3-256/512 | ✅ 85+ | ✅ 118+ | ⚠️ | ✅ |
| AES-CBC/CTR/GCM | ✅ | ✅ | ✅ | ✅ |
| AES-CFB/OFB | ❌ | ❌ | ❌ | ❌ |
| RSA-OAEP/PSS | ✅ | ✅ | ✅ | ✅ |

**Decisions:**
- **AES-CFB/OFB removed** — not available in any browser's Web Crypto. Uncommon in practice.
- **SHA3 kept with runtime detection** — if `subtle.digest('SHA3-...')` throws `NotSupportedError`, the algorithm is greyed out in Hash dropdown with label "（浏览器不支持）". No JS fallback — SHA-256 is the practical alternative.

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

- **Unit tests:** `src/utils/__tests__/crypto.test.ts` — all utility functions with hand-picked golden test vectors from each algorithm's RFC or Wikipedia examples (not parsing NIST format). Each function: 2-3 happy path cases + 1 error case.
- **Component tests:** `src/tools/__tests__/*.test.ts` — UI parameter interaction only (algorithm switch clears output, required-field button states, GCM tag UI toggle). Do not retest `crypto.ts` logic at component level.
- **Manual verification:** Real browser environment for full Web Crypto integration (test CI can't simulate `crypto.subtle`).

---

## Non-Goals

- File encryption/decryption (AES/RSA on files) — text only.
- JWT debugger, certificate viewer, SSH key tools — out of scope.
- Key storage / keychain integration.
- Drag-and-drop file input.
- Dark mode (already handled by existing theme system).
