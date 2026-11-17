import * as SecureStore from 'expo-secure-store';
import forge from 'node-forge';

const PRIVATE_KEY_STORE = 'bio_device_private_key';
const PUBLIC_KEY_STORE = 'bio_device_public_key';

/**
 * Generates an RSA 2048 key pair, stores the private key securely,
 * and returns the PEM-encoded public key.
 */
export async function generateAndStoreKeyPair(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Yield to the event loop so the UI updates with loading state before keygen starts
    setTimeout(() => {
      forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 }, async (err: Error | null, keypair: forge.pki.rsa.KeyPair) => {
        if (err || !keypair) {
          return reject(err || new Error('Failed to generate keypair'));
        }
        
        const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
        const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
        
        try {
          await SecureStore.setItemAsync(PRIVATE_KEY_STORE, privateKeyPem);
          await SecureStore.setItemAsync(PUBLIC_KEY_STORE, publicKeyPem);
          resolve(publicKeyPem);
        } catch (e) {
          reject(e);
        }
      });
    }, 100);
  });
}

/**
 * Signs a challenge string using the stored private key.
 * Returns the base64-encoded signature.
 */
export async function signChallenge(challenge: string): Promise<string> {
  const privateKeyPem = await SecureStore.getItemAsync(PRIVATE_KEY_STORE);
  if (!privateKeyPem) {
    throw new Error('Device private key not found. Device might not be registered.');
  }

  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha256.create();
  md.update(challenge, 'utf8');
  
  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

/**
 * Retrieves the stored public key PEM.
 */
export async function getPublicKey(): Promise<string | null> {
  return await SecureStore.getItemAsync(PUBLIC_KEY_STORE);
}

export async function clearKeys(): Promise<void> {
  await SecureStore.deleteItemAsync(PRIVATE_KEY_STORE);
  await SecureStore.deleteItemAsync(PUBLIC_KEY_STORE);
}
