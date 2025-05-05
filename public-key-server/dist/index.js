"use strict";
// src/index.ts  (FIXED)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const keyService_1 = __importDefault(require("./services/keyService")); // default import to match export default
// Load environment variables, if a .env file is present
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const PUBLIC_KEY_PATH = (_a = process.env.PUBLIC_KEY_PATH) !== null && _a !== void 0 ? _a : 'public/.well-known/appspecific/com.tesla.3p.public-key.pem';
const WELL_KNOWN_PATH = (_b = process.env.WELL_KNOWN_PATH) !== null && _b !== void 0 ? _b : '/.well-known/appspecific/com.tesla.3p.public-key.pem';
// Attempt to load the PEM; fallback to empty string on failure
const publicKeyPem = (_c = (0, keyService_1.default)(PUBLIC_KEY_PATH)) !== null && _c !== void 0 ? _c : '';
function handler(req, res) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'GET' && req.url === WELL_KNOWN_PATH) {
        console.log(`Serving public key from ${PUBLIC_KEY_PATH}`);
        res.setHeader('Content-Type', 'application/x-pem-file');
        return res.status(200).send(publicKeyPem);
    }
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
    return res.status(404).send('Not Found');
}
