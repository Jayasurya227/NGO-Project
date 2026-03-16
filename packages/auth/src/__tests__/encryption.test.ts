import { describe, it, expect } from "vitest";
import { encrypt, decrypt, hashForLookup } from "../encryption";

process.env.NODE_ENV = "development";
process.env.ENCRYPTION_KEY_HEX = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("Encryption", () => {
  it("encrypts and decrypts correctly", async () => {
    const original = "Ramesh Kumar";
    const encrypted = await encrypt(original);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext for same input (IV randomness)", async () => {
    const text = "test@example.com";
    const enc1 = await encrypt(text);
    const enc2 = await encrypt(text);
    expect(enc1.toString("hex")).not.toBe(enc2.toString("hex"));
  });

  it("decrypts both encryptions to same plaintext", async () => {
    const text = "test@example.com";
    const enc1 = await encrypt(text);
    const enc2 = await encrypt(text);
    expect(await decrypt(enc1)).toBe(text);
    expect(await decrypt(enc2)).toBe(text);
  });

  it("produces consistent hash for lookup", () => {
    const hash1 = hashForLookup("test@example.com");
    const hash2 = hashForLookup("TEST@EXAMPLE.COM");
    expect(hash1).toBe(hash2);
  });
});