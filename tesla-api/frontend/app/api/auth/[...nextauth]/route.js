import NextAuth from 'next-auth';
import { providers } from './providers';
import { callbacks } from './callbacks';

// Enhanced debugging for NextAuth initialization
console.log('Initializing NextAuth with the following configuration:');
console.log('- Providers count:', Object.keys(providers).length);
console.log('- Tesla provider configured:', !!providers.credentials);
console.log('- Using callback URL:', process.env.TESLA_REDIRECT_URI || 'Not set');

/**
 * Configure NextAuth with all providers and callbacks
 */
const handler = NextAuth({
  providers,
  callbacks,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  // Enhance debug output - be careful in production!
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error(`[NextAuth] [ERROR] ${code}:`, metadata);
    },
    warn(code) {
      console.warn(`[NextAuth] [WARN] ${code}`);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[NextAuth] [DEBUG] ${code}:`, metadata);
      }
    },
  },
  // Detect and log suspected infinite loops
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`[NextAuth] User signed in: ${user.email || 'unknown'}`);
    },
    async session({ session, token }) {
      // Track session activity to help identify loop patterns
      console.log(`[NextAuth] Session updated at ${new Date().toISOString()}`);
    },
    async error({ error }) {
      console.error(`[NextAuth] Error event:`, error);
      
      // Check for patterns that might indicate an infinite loop
      if (error && typeof error === 'object' && error.message) {
        if (
          error.message.includes('redirect') || 
          error.message.includes('callback') || 
          error.message.includes('CSRF') || 
          error.message.includes('OAuth')
        ) {
          console.error('[NextAuth] Potential OAuth flow issue detected:', error.message);
        }
      }
    }
  }
});

export { handler as GET, handler as POST }; 