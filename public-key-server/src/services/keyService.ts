import fs from 'fs';
import path from 'path';

/**
 * Loads a PEM-encoded public key from disk.
 * @param filePath - Path relative to project root (e.g., 'public/.well-known/...pem')
 */
export function getPublicKey(filePath: string): string | null {
  const absolutePath = path.resolve(process.cwd(), filePath);
  console.log(`Attempting to load public key from: ${absolutePath}`);
  try {
    const key = fs.readFileSync(absolutePath, 'utf8').trim();
    if (
      !key.startsWith('-----BEGIN PUBLIC KEY-----') ||
      !key.endsWith('-----END PUBLIC KEY-----')
    ) {
      console.error(`ERROR: Invalid PEM format at ${absolutePath}.`);
      return null;
    }
    console.log(`Successfully loaded public key from ${absolutePath}.`);
    return key;
  } catch (err: any) {
    console.error(`FATAL ERROR loading public key at ${absolutePath}:`, err.message);
    return null;
  }
}
