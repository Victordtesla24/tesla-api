const config = require('./config');

/**
 * Verifies the dashboard client WebSocket connection token.
 * This implementation uses a static shared secret configured via DASHBOARD_TOKEN.
 * For production, consider using OAuth tokens obtained via Tesla login flow.
 * @param {string | null} token The token provided by the client (e.g., in query string).
 * @returns {boolean} True if the token is valid, false otherwise.
 */
function verifyDashboardToken(token) {
    // config.dashboardToken is guaranteed to exist due to fail-fast check in config.js
    if (!token) {
        console.warn('Dashboard connection attempt rejected: No token provided.');
        return false;
    }
    const isValid = token === config.dashboardToken;
    if (!isValid) {
        console.warn('Dashboard connection attempt rejected: Invalid token provided.');
    }
    return isValid;
}

module.exports = { verifyDashboardToken }; 