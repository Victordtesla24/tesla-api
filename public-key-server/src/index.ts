// src/index.ts  (FIXED)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import path from 'path';
import { getPublicKey } from './services/keyService';  // use named import

// Load environment variables from .env (if present)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Fallback defaults if env vars are missing
const PUBLIC_KEY_PATH =
  process.env.PUBLIC_KEY_PATH ??
  'public/.well-known/appspecific/com.tesla.3p.public-key.pem';
const WELL_KNOWN_PATH =
  process.env.WELL_KNOWN_PATH ??
  '/.well-known/appspecific/com.tesla.3p.public-key.pem';

// Load the PEM file (returns null on error, so fall back to empty string)
const publicKeyPem = getPublicKey(PUBLIC_KEY_PATH) ?? '';

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Serve the public key at the well-known endpoint
  if (req.method === 'GET' && req.url === WELL_KNOWN_PATH) {
    console.log(`Serving public key from ${PUBLIC_KEY_PATH}`);
    res.setHeader('Content-Type', 'application/x-pem-file');
    return res.status(200).send(publicKeyPem);
  }

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      publicKeyServer: {
        running: true,
        publicKeyLoaded: !!publicKeyPem
      }
    });
  }

  // All other routes: 404
  return res.status(404).send('Not Found');
}
