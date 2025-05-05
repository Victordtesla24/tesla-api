# Tesla OAuth Authentication Flow Analysis

## 1. Documented Tesla OAuth Flow (Official Documentation)

```
User/Browser      Web App Frontend     Web App Backend      Tesla Auth Server    Tesla API
    |                    |                    |                    |                |
    |---(1) Init Auth--->|                    |                    |                |
    |                    |                    |                    |                |
    |                    |---(2) Gen State--->|                    |                |
    |                    |    & Code Verifier |                    |                |
    |                    |                    |                    |                |
    |<---(3) Redirect----|                    |                    |                |
    |   to Tesla Auth URL|                    |                    |                |
    |                    |                    |                    |                |
    |---(4) Auth Request----------------------------------->|      |                |
    |   client_id, scope,|                    |             |      |                |
    |   redirect_uri     |                    |             |      |                |
    |                    |                    |             |      |                |
    |<---(5) Login Page-------------------------------------|      |                |
    |                    |                    |             |      |                |
    |---(6) Credentials------------------------------------>|      |                |
    |                    |                    |             |      |                |
    |<---(7) Auth Code--------------------------------------|      |                |
    |   Redirect to      |                    |             |      |                |
    |   redirect_uri     |                    |             |      |                |
    |                    |                    |             |      |                |
    |---(8) Auth Code--->|                    |             |      |                |
    |                    |                    |             |      |                |
    |                    |---(9) Auth Code--->|             |      |                |
    |                    |                    |             |      |                |
    |                    |                    |---(10) Token Request->|             |
    |                    |                    | code, client_id,  |  |             |
    |                    |                    | client_secret     |  |             |
    |                    |                    |                   |  |             |
    |                    |                    |<--(11) Tokens-----|  |             |
    |                    |                    |  access_token,    |  |             |
    |                    |                    |  refresh_token    |  |             |
    |                    |                    |                   |  |             |
    |                    |<--(12) Success-----|                   |  |             |
    |                    |    Set Token Cookie|                   |  |             |
    |                    |                    |                   |  |             |
    |<---(13) Access-----|                    |                   |  |             |
    |    Protected Page  |                    |                   |  |             |
    |                    |                    |                   |  |             |
    |---(14) API Request-------------------------------->|        |  |             |
    |                    |                    |          |        |  |             |
    |                    |                    |          |---(15) API Request----->|
    |                    |                    |          | Auth: Bearer token      |
    |                    |                    |          |        |  |             |
    |                    |                    |          |<--(16) API Response-----|
    |                    |                    |          |        |  |             |
    |<---(17) Data---------------------------------------|        |  |             |
    |                    |                    |                   |  |             |
```

## 2. Implemented OAuth Flow (Codebase)

```
User/Browser      Web App Frontend     Web App Backend      Tesla Auth Server    Tesla API
    |                    |                    |                    |                |
    |---(1) Click Login->|                    |                    |                |
    |                    |                    |                    |                |
    |                    |-(2) Generate State-|                    |                |
    |                    |    Store in        |                    |                |
    |                    |    localStorage    |                    |                |
    |                    |                    |                    |                |
    |<-(3) Redirect to---|                    |                    |                |
    |    Tesla OAuth URL |                    |                    |                |
    |                    |                    |                    |                |
    |---(4) Request Auth----------------------------------->|      |                |
    |    Page            |                    |             |      |                |
    |                    |                    |             |      |                |
    |<--(5) Display------|-------------------- Consent Page-|      |                |
    |                    |                    |             |      |                |
    |---(6) Grant Consent---------------------------------->|      |                |
    |                    |                    |             |      |                |
    |<--(7) Redirect-----|--------------------Auth Code-----|      |                |
    |    to /api/auth/callback/tesla          |             |      |                |
    |                    |                    |             |      |                |
    |---(8) Forward Auth Code to callback----->|             |      |                |
    |                    |                    |             |      |                |
    |<--(9) Redirect to--|--------------------Login with code      |                |
    |                    |                    |             |      |                |
    |---(10) Send code to--------------------->|             |      |                |
    |     token-exchange |                    |             |      |                |
    |                    |                    |             |      |                |
    |                    |                    |---(11) Exchange Code--------------->|
    |                    |                    |                    |                |
    |                    |                    |<--(12) Access/Refresh Tokens-------|
    |                    |                    |                    |                |
    |                    |                    |---(13) Create JWT--|                |
    |                    |                    |     Session        |                |
    |                    |                    |                    |                |
    |<--(14) Set Cookies-|--------------------& Return Success     |                |
    |    (next-auth.session-token & tesla_session)                 |                |
    |                    |                    |                    |                |
    |---(15) Redirect to-|-------------------Dashboard             |                |
    |                    |                    |                    |                |
    |---(16) Request-----|-------------------Vehicle Data          |                |
    |     via useTeslaVehicle hook           |                    |                |
    |                    |                    |                    |                |
    |                    |                    |---(17) Call Tesla API------------->|
    |                    |                    |     with Token     |                |
    |                    |                    |                    |                |
    |                    |                    |<--(18) Return Vehicle Data---------|
    |                    |                    |                    |                |
    |<--(19) Display-----|-------------------Vehicle Data          |                |
    |                    |                    |                    |                |

```

## 3. Comparison of OAuth Flows

### Key Similarities

1. **OAuth 2.0 Authorization Code Grant Flow**: Both flows follow the standard OAuth 2.0 authorization code grant flow, which is recommended by Tesla Fleet API documentation.

2. **Security Measures**: Both flows implement important security measures:
   - State parameter for CSRF protection
   - Secure handling of tokens
   - Backend code exchange (not exposed to frontend)

3. **API Access Pattern**: Both flows use the obtained access token as a Bearer token in the Authorization header for subsequent API calls to Tesla.

### Key Differences

1. **Token Exchange Implementation**:
   - **Documentation**: Suggests a standard OAuth token exchange using Tesla's token endpoint
   - **Implementation**: Uses a custom `/api/auth/token-exchange` endpoint that handles token exchange and session creation

2. **Session Management**:
   - **Documentation**: Doesn't specify session handling details
   - **Implementation**: Creates two types of cookies:
     - `next-auth.session-token`: JWT-encoded secure cookie for NextAuth
     - `tesla_session`: Client-accessible cookie with non-sensitive token metadata

3. **Callback Handling**:
   - **Documentation**: Callback handled directly with token exchange
   - **Implementation**: Callback route (`/api/auth/callback/tesla`) redirects to login page with code, and login page handles token exchange

4. **State Parameter Storage**:
   - **Documentation**: Does not specify storage mechanism
   - **Implementation**: Uses localStorage to store and verify the state parameter

5. **Code Verification**:
   - **Documentation**: Mentions using PKCE with code_verifier and code_challenge
   - **Implementation**: Uses state verification but does not implement full PKCE flow

### Security Considerations

The implemented flow has both strengths and potential areas for improvement:

**Strengths**:
- Secure JWT session management
- Server-side token exchange
- Multiple levels of validation
- CSRF protection via state parameter

**Improvements Needed**:
- Full PKCE implementation for enhanced security
- More comprehensive error handling
- Potential server-side state verification instead of localStorage

### Functional Components

The implementation uses several files working together:
1. `login/page.js`: Handles login UI and initiates OAuth flow
2. `api/auth/callback/tesla/route.js`: Processes Tesla callback with auth code
3. `api/auth/token-exchange/route.js`: Exchanges code for tokens and creates session
4. `[...nextauth]/route.js`: Provides NextAuth integration
5. `useTeslaVehicle.js`: Hook to access Tesla API with token
6. `TelemetryContext.js`: Manages vehicle telemetry connections using tokens

## OAuth Flow Steps Table - Tesla Fleet API Documentation

```
 |------|----------------------------|------------------------------------------------------------------|-------------------------------------------------------------------|
 | Step | Actor                      | Action                                                           | Tesla Documentation Reference                                     |
 |------|----------------------------|------------------------------------------------------------------|-------------------------------------------------------------------|
 | 1    | User/Browser               | Initiates authentication request                                  | Authentication flow begins with user requesting access            |
 | 2    | Web App Frontend/Backend   | Generates OAuth state parameter and code verifier                 | Required for PKCE flow security                                  |
 | 3    | Web App Frontend           | Redirects to Tesla Auth URL with required parameters              | Authorization request must include client_id, scope, redirect_uri |
 | 4    | User/Browser               | Sends authorization request to Tesla                              | Begins OAuth 2.0 authorization code flow                         |
 | 5    | Tesla Auth Server          | Displays login/consent page                                       | User must authenticate with Tesla account                         |
 | 6    | User/Browser               | Submits Tesla credentials                                         | User grants permissions for requested scopes                      |
 | 7    | Tesla Auth Server          | Redirects with authorization code                                 | Successful auth results in redirect with code parameter          |
 | 8-9  | Web App                    | Handles the authorization code                                    | Code must be sent to backend for exchange                         |
 | 10   | Web App Backend            | Sends token request with code                                     | Backend makes secure token exchange request                       |
 | 11   | Tesla Auth Server          | Returns tokens                                                    | Access and refresh tokens provided upon successful exchange       |
 | 12-13| Web App Backend            | Creates session                                                   | Application creates secure session for user                       |
 | 14   | Web App Backend            | Returns success to frontend                                       | Session established with tokens stored securely                   |
 | 15-19| User & Application         | Access Tesla API resources                                        | Access token used to authorize API requests                       |
 |------|----------------------------|------------------------------------------------------------------|-------------------------------------------------------------------|
```

# Tesla Fleet API - OAuth User Authentication Flow (Authorization Code Grant)

**Tesla Fleet API Documentation:**
    1.  AUTHENTICATION OVERVIEW: `@https://developer.tesla.com/docs/fleet-api/authentication/overview`
    2.  PARTNER AUTHENTICATION: `@https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens`
    3.  THIRD PARTY TOKENS: `@https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens`
    4.  PARTNER API ENDPOINT CONFIGURATIONS: `@https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints`
    5.  USER API ENDPOINT CONFIGURATIONS: `@https://developer.tesla.com/docs/fleet-api/endpoints/user-endpoints`
    6.  FLEET TELEMETRY SERVER OVERVIEW: `@https://developer.tesla.com/docs/fleet-api/fleet-telemetry`
    7.  AVAILABLE TELEMETRY DATA: `@https://developer.tesla.com/docs/fleet-api/fleet-telemetry/available-data`
    8.  VIRTUAL KEY CONFIGURATIONS: `@https://developer.tesla.com/docs/fleet-api/virtual-keys/overview`
    9.  DEVELOPER GUIDE: `@https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide`
    10. VEHICLE ENDPOINTS: `@https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints`
    11. BEST PRACTICES: `@https://developer.tesla.com/docs/fleet-api/getting-started/best-practices`
    12. CONVENTIONS: `@https://developer.tesla.com/docs/fleet-api/getting-started/conventions`
    13. PAIRING PUBLIC KEY TO A VEHICLE: `@https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#adding-to-a-vehicle`
    14. OAuth SERVER METADATA: `@https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration`

## Tesla User OAuth User Authentication Flow (Authorization Code Grant) from Tesla Fleet API Documentation.

```ascii
+-----------------+        +--------------------------------+             +--------------------+
|      User       |        |      Web Application           |             | Tesla Auth Server  |
|   (Browser)     |        | (Frontend/Backend/Scripts)     |             | (auth.tesla.com)   |
+-----------------+        +--------------------------------+             +--------------------+
        |                                   |                                       |
        | 1. Clicks Login Button            |                                       |
        |---------------------------------->| 2. [App: Frontend] Constructs         |
        |                                   |    Authorization URL                  |
        |                                   |    (incl. client_id, redirect_uri,    |
        |                                   |     response_type=code, scope, state) |
        |                                   |                                       |
        |                                   | 3. [App: Frontend] Redirects User     |
        |                                   |    Browser to Tesla Auth URL          |
        |<----------------------------------|                                       |
        |                                   |                                       |
        | 4. Authenticates with Tesla       |                                       |
        |----------------------------------------------------------------->|        |
        |                                   |                              |        |
        | 5. Grants Required Permissions    |                              |        |
        |----------------------------------------------------------------->|        |
        |                                   |                              |        |
        |                                   |                              |        |
        | 6. Receives Redirect with         |                              |        |
        |    Authorization Code             |                              |        |
        |<-----------------------------------------------------------------|        |
        |                                   |                                       |
        | 7. Redirects to redirect_uri      |                                       |
        |    with code parameter            |                                       |
        |---------------------------------->| 8. [App: Backend] Receives Auth Code  |
        |                                   |                                       |
        |                                   | 9. [App: Backend] Exchanges Code      |
        |                                   |    for Access/Refresh Tokens          |
        |                                   |-------------------------------------->|
        |                                   |                                       |
        |                                   | 10. [App: Backend] Receives Tokens    |
        |                                   |<--------------------------------------|
        |                                   |                                       |
        |                                   | 11. [App: Backend] Creates Session    |
        |                                   |     with Token Information            |
        |                                   |                                       |
        |                                   | 12. [App: Backend] Redirects to       |
        |                                   |     Success Page                      |
        |<----------------------------------|     (e.g., /dashboard)                |
        |                                   |                                       |
        | 13. User sees Dashboard           |                                       |
        |---------------------------------->| 14. [App: Frontend/Backend] Makes     |
        |                                   |     API Calls to Tesla Fleet API      |
        |                                   |     using Access Token in             |
        |                                   |     `Authorization: Bearer <token>`   |
        |                                   |     header.                           |
        |                                   |-------------------------------------->| (Tesla Fleet API)
        |                                   |                                       |
```


## Implemented OAuth Flow in Codebase

```ascii
User/Browser    Web App Frontend        Web App Backend        Tesla Auth Server    Tesla API
     |                  |                       |                        |                |
     |                  |                       |                        |                |
     |---(1) Click Login|                       |                        |                |
     |                  |                       |                        |                |
     |                  |-(2) Generate State----|                        |                |
     |                  |    Store in localStorage                       |                |
     |                  |                       |                        |                |
     |<-(3) Redirect to Tesla OAuth URL---------|                        |                |
     |                  |                       |                        |                |
     |---(4) Request Auth Page------------------|----------------------->|                |
     |                  |                       |                        |                |
     |<--(5) Display Consent Page---------------|------------------------|                |
     |                  |                       |                        |                |
     |---(6) Grant Consent---------------------|------------------------>|                |
     |                  |                       |                        |                |
     |<--(7) Redirect with Auth Code------------|------------------------|                |
     |    to /api/auth/callback/tesla           |                        |                |
     |                  |                       |                        |                |
     |---(8) Forward Auth Code to callback----->|                        |                |
     |                  |                       |                        |                |
     |<--(9) Redirect to /login with code-------|                        |                |
     |                  |                       |                        |                |
     |---(10) Send code to token-exchange------>|                        |                |
     |                  |                       |                        |                |
     |                  |                       |--(11) Exchange Code for Token---------->|
     |                  |                       |                        |                |
     |                  |                       |<--(12) Access/Refresh Tokens------------|
     |                  |                       |                        |                |
     |                  |                       |--(13) Create JWT------|                |
     |                  |                       |     Session           |                |
     |                  |                       |                       |                |
     |<--(14) Set Cookies & Return Success------|                       |                |
     |    (next-auth.session-token & tesla_session)                     |                |
     |                  |                       |                        |                |
     |---(15) Redirect to Dashboard------------>|                        |                |
     |                  |                       |                        |                |
     |---(16) Request Vehicle Data-------------|                        |                |
     |     via useTeslaVehicle hook            |                        |                |
     |                  |                       |                        |                |
     |                  |                       |--(17) Call Tesla API with Token-------->|
     |                  |                       |                        |                |
     |                  |                       |<--(18) Return Vehicle Data-------------|
     |                  |                       |                        |                |
     |<--(19) Display Vehicle Data-------------|                        |                |
     |                  |                       |                        |                |
```

## OAuth Flow Steps Table - Tesla Fleet API Documentation

```ascii
 |------|----------------------------|------------------------------------------------------------------|-------------------------------------------------------------------|
 | Step | Actor                      | Action                                                           | Tesla Documentation Reference                                     |
 |------|----------------------------|------------------------------------------------------------------|-------------------------------------------------------------------|
 | 1    | User/Browser               | Initiates authentication                                         | User action starts the OAuth flow                                 |
 | 2    | Web App Frontend           | Constructs auth URL                                              | Authorization URL per Sec. 3.1 OAuth Authorization Code Grant     |
 | 3    | Web App Frontend           | Redirects to Tesla                                               | Authorization request requires state param for CSRF                |
 | 4    | User/Browser               | Authenticates                                                    | User signs in to Tesla account                                    |
 | 5    | User/Browser               | Grants permissions                                               | User consents to requested scopes                                 |
 | 6    | Tesla Auth Server          | Issues auth code                                                 | Auth server returns code with redirect                            |
 | 7    | User/Browser               | Redirects to app                                                 | Browser follows redirect to callback URL with code                |
 | 8    | Web App Backend            | Receives code                                                    | App backend endpoint handles callback                             |
 | 9    | Web App Backend            | Exchanges code                                                   | Backend requests token with client secret                         |
 | 10   | Tesla Auth Server          | Returns tokens                                                   | Auth server returns access & refresh tokens                       |
 | 11   | Web App Backend            | Creates session                                                  | App stores tokens securely                                        |
 | 12   | Web App Backend            | Redirects to success                                             | User directed to authenticated area                               |
 | 13   | Web App                    | Makes API calls                                                  | App uses Bearer token in Authorization header                     |
 |------|----------------------------|------------------------------------------------------------------|-------------------------------------------------------------------|