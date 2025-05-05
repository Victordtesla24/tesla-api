"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getPublicKey;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Loads a PEM-encoded public key from disk.
 * @param filePath - Path relative to project root (e.g., 'public/.well-known/...pem')
 */
function getPublicKey(filePath) {
    const absolutePath = path_1.default.resolve(process.cwd(), filePath);
    console.log(`Attempting to load public key from: ${absolutePath}`);
    try {
        const key = fs_1.default.readFileSync(absolutePath, 'utf8').trim();
        if (!key.startsWith('-----BEGIN PUBLIC KEY-----') ||
            !key.endsWith('-----END PUBLIC KEY-----')) {
            console.error(`ERROR: Invalid PEM format at ${absolutePath}.`);
            return null;
        }
        console.log(`Successfully loaded public key from ${absolutePath}.`);
        return key;
    }
    catch (err) {
        console.error(`FATAL ERROR loading public key at ${absolutePath}:`, err.message);
        return null;
    }
}
