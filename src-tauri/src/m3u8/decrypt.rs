use aes::cipher::{generic_array::GenericArray, BlockDecryptMut, KeyIvInit};
use cbc::Decryptor;
use tracing::{debug, warn};

type Aes128CbcDec = Decryptor<aes::Aes128>;

/// Decrypt AES-128-CBC encrypted data.
/// key: 16 bytes AES key
/// iv: 16 bytes initialization vector
/// Returns decrypted bytes (no padding removal — TS segments use full-block encryption).
pub fn decrypt_aes128_cbc(data: &[u8], key: &[u8], iv: &[u8]) -> Result<Vec<u8>, String> {
    debug!("Decrypting {} bytes with AES-128-CBC", data.len());
    if key.len() != 16 {
        warn!("Invalid key length: {}", key.len());
        return Err(format!(
            "Invalid key length: expected 16 bytes, got {}",
            key.len()
        ));
    }
    if iv.len() != 16 {
        warn!("Invalid IV length: {}", iv.len());
        return Err(format!(
            "Invalid IV length: expected 16 bytes, got {}",
            iv.len()
        ));
    }
    if !data.len().is_multiple_of(16) {
        warn!("Data length not multiple of 16: {}", data.len());
        return Err(format!(
            "Data length must be a multiple of 16 bytes, got {} bytes",
            data.len()
        ));
    }

    let mut buf = data.to_vec();
    let mut cipher = Aes128CbcDec::new(key.into(), iv.into());

    for chunk in buf.chunks_exact_mut(16) {
        let block = GenericArray::from_mut_slice(chunk);
        cipher.decrypt_block_mut(block);
    }

    Ok(buf)
}

/// Parse a hex string IV (with or without 0x prefix) into 16-byte array.
pub fn parse_iv(iv_str: &str) -> Result<[u8; 16], String> {
    let hex = iv_str.strip_prefix("0x").unwrap_or(iv_str).to_lowercase();
    let hex = if hex.len() < 32 {
        format!("{:0>32}", hex)
    } else {
        hex
    };

    let bytes = hex::decode(&hex).map_err(|e| format!("IV hex decode error: {}", e))?;
    if bytes.len() != 16 {
        return Err(format!("IV must be 16 bytes, got {}", bytes.len()));
    }

    let mut arr = [0u8; 16];
    arr.copy_from_slice(&bytes);
    Ok(arr)
}

/// Default IV from segment index (HLS spec: IV = segment_index as big-endian u128).
pub fn default_iv(segment_index: u32) -> [u8; 16] {
    let mut iv = [0u8; 16];
    iv[12..16].copy_from_slice(&segment_index.to_be_bytes());
    iv
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decrypt_aes128_cbc_known_vector() {
        // Test vector from NIST SP 800-38A
        let key: [u8; 16] = [
            0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6, 0xab, 0xf7, 0x15, 0x88, 0x09, 0xcf,
            0x4f, 0x3c,
        ];
        let iv: [u8; 16] = [
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d,
            0x0e, 0x0f,
        ];
        let ciphertext: [u8; 16] = [
            0x76, 0x49, 0xab, 0xac, 0x81, 0x19, 0xb2, 0x46, 0xce, 0xe9, 0x8e, 0x9b, 0x12, 0xe9,
            0x19, 0x7d,
        ];
        let expected: [u8; 16] = [
            0x6b, 0xc1, 0xbe, 0xe2, 0x2e, 0x40, 0x9f, 0x96, 0xe9, 0x3d, 0x7e, 0x11, 0x73, 0x93,
            0x17, 0x2a,
        ];

        let result = decrypt_aes128_cbc(&ciphertext, &key, &iv).unwrap();
        assert_eq!(result, expected.to_vec());
    }

    #[test]
    fn test_decrypt_wrong_key_length() {
        let data = vec![0u8; 16];
        let key = vec![0u8; 15];
        let iv = vec![0u8; 16];
        let result = decrypt_aes128_cbc(&data, &key, &iv);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("key length"));
    }

    #[test]
    fn test_parse_iv_with_0x_prefix() {
        let iv = parse_iv("0xABCDEF1234567890ABCDEF1234567890").unwrap();
        assert_eq!(iv[0], 0xAB);
        assert_eq!(iv[1], 0xCD);
        assert_eq!(iv[15], 0x90);
    }

    #[test]
    fn test_parse_iv_without_prefix() {
        let iv = parse_iv("00000000000000000000000000000001").unwrap();
        assert_eq!(iv[15], 0x01);
    }

    #[test]
    fn test_parse_iv_short_pads_with_zeros() {
        let iv = parse_iv("1").unwrap();
        assert_eq!(iv[15], 0x01);
        assert_eq!(iv[0], 0x00);
    }

    #[test]
    fn test_default_iv() {
        let iv = default_iv(42);
        assert_eq!(iv[12..16], [0x00, 0x00, 0x00, 0x2a]);
    }

    #[test]
    fn test_decrypt_data_not_multiple_of_16() {
        let key = vec![0u8; 16];
        let iv = vec![0u8; 16];
        let data = vec![0u8; 17]; // not a multiple of 16
        let result = decrypt_aes128_cbc(&data, &key, &iv);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("multiple of 16"));
    }

    #[test]
    fn test_decrypt_wrong_iv_length() {
        let key = vec![0u8; 16];
        let iv = vec![0u8; 15]; // should be 16
        let data = vec![0u8; 16];
        let result = decrypt_aes128_cbc(&data, &key, &iv);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("IV length"));
    }
}
