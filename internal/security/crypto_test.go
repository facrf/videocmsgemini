package security

import (
	"testing"
)

func TestEncryptDecrypt(t *testing.T) {
	secretKey := "super-secure-key-32-bytes-long!!"
	original := "CameraSecretPassword123@#$"

	ciphertext, err := Encrypt(original, secretKey)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	if ciphertext == original {
		t.Errorf("ciphertext should not match original plaintext")
	}

	decrypted, err := Decrypt(ciphertext, secretKey)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}

	if decrypted != original {
		t.Errorf("expected %q, got %q", original, decrypted)
	}
}

func TestEmptyPlaintext(t *testing.T) {
	secretKey := "super-secure-key-32-bytes-long!!"
	c, err := Encrypt("", secretKey)
	if err != nil || c != "" {
		t.Errorf("encrypt empty failed: %v, got %q", err, c)
	}

	d, err := Decrypt("", secretKey)
	if err != nil || d != "" {
		t.Errorf("decrypt empty failed: %v, got %q", err, d)
	}
}

func TestWrongKey(t *testing.T) {
	key1 := "secret-key-one-1234567890123456"
	key2 := "secret-key-two-1234567890123456"
	original := "secretData"

	ciphertext, err := Encrypt(original, key1)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	_, err = Decrypt(ciphertext, key2)
	if err == nil {
		t.Errorf("expected decryption failure with wrong key, but succeeded")
	}
}

func TestEmptyKeyError(t *testing.T) {
	_, err := Encrypt("test", "")
	if err != ErrEmptyKey {
		t.Errorf("expected ErrEmptyKey, got %v", err)
	}

	_, err = Decrypt("test", "")
	if err != ErrEmptyKey {
		t.Errorf("expected ErrEmptyKey, got %v", err)
	}
}
