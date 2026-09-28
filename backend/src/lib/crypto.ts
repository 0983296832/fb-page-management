import crypto from "crypto";

const KEY = process.env.TOKEN_ENCRYPTION_KEY || "";
if (!KEY) {
  console.warn("TOKEN_ENCRYPTION_KEY not set; tokens will NOT be encrypted");
}

export function encrypt(text: string) {
  if (!KEY) return text;
  const key = Buffer.from(KEY.padEnd(32).slice(0, 32));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decrypt(payload: string) {
  if (!KEY) return payload;
  try {
    const key = Buffer.from(KEY.padEnd(32).slice(0, 32));
    const [ivB, tagB, dataB] = payload.split(".");
    const iv = Buffer.from(ivB, "base64");
    const tag = Buffer.from(tagB, "base64");
    const encrypted = Buffer.from(dataB, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("decrypt error", err);
    return "";
  }
}
