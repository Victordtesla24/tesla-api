# Tesla API End to End Testing of User Authentication, Vehicle Pairing, and Telemetry Guide

## Overview 
This guide explains how to authenticate with Tesla’s **Fleet API**, pair a vehicle’s **virtual key** to your application, and stream **real-time telemetry**. We’ll use cURL for each step, with **mock credentials** that you should replace with your real values. All API requests must include a bearer token in the HTTP header (e.g. `Authorization: Bearer <token>`) ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/overview#:~:text=API%20endpoints%20require%20an%20authentication,be%20included%20as%20a%20header)). The process involves: 

1. **Partner Authentication** – Obtaining a **Partner API token** using your application’s Client ID/Secret.  
2. **Application Registration** – Hosting and registering a public key (virtual key) for your app’s domain.  
3. **User Authorization (OAuth)** – Having the Tesla user log in and grant access to your app (yielding a Third-Party token).  
4. **Vehicle Virtual Key Pairing** – Pairing your app’s public key with the user’s vehicle via the Tesla mobile app.  
5. **Telemetry Configuration** – Instructing the vehicle to stream telemetry data to your server.  
6. **Token Refresh & Revoke** – Using refresh tokens to maintain access and understanding how to revoke access.

Throughout the guide, **placeholders** like `$CLIENT_ID`, `$CLIENT_SECRET`, etc., are used for credentials and IDs – replace them with your actual values. For example: 

- `$CLIENT_ID` – Your Tesla developer app’s Client ID (from the Developer Portal).  
- `$CLIENT_SECRET` – Your app’s Client Secret.  
- `$REDIRECT_URI` – The OAuth callback URL you registered.  
- `$PARTNER_TOKEN` – The Partner token obtained in Step 1.  
- `$ACCESS_TOKEN` – The User’s Access token from Step 3.  
- `$REFRESH_TOKEN` – The Refresh token paired with the access token.  
- `$DOMAIN` – Your application’s domain (root domain for the public key URL).  
- `$VIN` – The Vehicle Identification Number of the Tesla to pair (17 characters).  

Make sure to use the correct **regional API base URL** for your account. In this guide we use the North America base (`fleet-api.prd.na.vn.cloud.tesla.com`), which also covers Asia-Pacific (excl. China) ([Partner Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens#:~:text=client_secret%20Yes%20secret,a%20Fleet%20API%20base%20URL)). European accounts use `fleet-api.prd.eu.vn.cloud.tesla.com`, etc. You can confirm a user’s region via the `/users/region` endpoint ([User Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/user-endpoints#:~:text=region)) if needed. 

Now, let’s walk through each step in detail.

## Step 1: Partner Authentication (OAuth Client Credentials)
**Goal:** Get a **Partner Token** using your Tesla API credentials. The partner token is used by your backend/server to manage your application and vehicles (e.g. registering keys, configuring vehicles) ([Partner Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens#:~:text=Generates%20a%20token%20to%20be,Authentication%20endpoints%20are%20not%20billed)). It uses the OAuth2 **client_credentials** grant type ([Partner Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens#:~:text=Name%20Required%20Example%20Description%20grant_type,a%20Fleet%20API%20base%20URL)).

**What you need:** The **Client ID** and **Client Secret** of your Tesla developer application, and the appropriate **audience** (the Fleet API base URL for your region).

**cURL Request:** Use a POST to Tesla’s OAuth token endpoint with form data:

```bash
# Set your Tesla API app credentials and desired audience (API base URL)
export CLIENT_ID="YOUR-CLIENT-ID"  
export CLIENT_SECRET="YOUR-CLIENT-SECRET"  
export AUDIENCE="https://fleet-api.prd.na.vn.cloud.tesla.com"  # NA/APAC base URL

# Request a Partner API token using client_credentials grant
curl --request POST \
     --header "Content-Type: application/x-www-form-urlencoded" \
     --data-urlencode "grant_type=client_credentials" \
     --data-urlencode "client_id=$CLIENT_ID" \
     --data-urlencode "client_secret=$CLIENT_SECRET" \
     --data-urlencode "audience=$AUDIENCE" \
     --data-urlencode "scope=openid vehicle_device_data vehicle_cmds vehicle_charging_cmds" \
     "https://auth.tesla.com/oauth2/v3/token"
```

In this request:
- `grant_type=client_credentials` and your `client_id` & `client_secret` authenticate your app ([Partner Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens#:~:text=Name%20Required%20Example%20Description%20grant_type,a%20Fleet%20API%20base%20URL)).
- `audience` is the Fleet API base URL ([Partner Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens#:~:text=client_secret%20Yes%20secret,a%20Fleet%20API%20base%20URL)) (North America in this example). 
- `scope` is optional for client_credentials; here we request some typical scopes (`vehicle_device_data`, `vehicle_cmds`, etc.) just in case. (The Partner token doesn’t represent a user, but can still carry scopes if needed ([Partner Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens#:~:text=scope%20No%20openid%20user_data%20vehicle_device_data,delimited%20list%20of%20scopes)).) 

**Response:** If successful, you’ll receive a JSON with an `access_token` (JWT string) and `expires_in` duration, etc. For example: 

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ...<snip>",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

Save this token (we’ll refer to it as `$PARTNER_TOKEN`). It is your **server-to-Tesla credential** for further partner-level API calls. (Note: **Authentication endpoints are not billed** by Tesla ([Partner Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens#:~:text=Generates%20a%20token%20to%20be,Authentication%20endpoints%20are%20not%20billed)).)

## Step 2: Registering Your Application’s Domain and Public Key 
**Goal:** **Register your app** with Tesla’s system by associating a **public key** (the virtual key) and your domain. This is required *once* per application. After this, Tesla will trust commands and telemetry requests signed with your private key and coming from your domain ([Partner Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#:~:text=Registers%20an%20existing%20account%20before,com%20must%20complete%20this%20step)).

**1. Generate a Key Pair:** Create an EC key pair (secp256r1 curve) for your app’s virtual key. The private key will be used to sign commands/requests, and the public key will be installed on vehicles. For example, using OpenSSL ([Developer Guide | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#:~:text=Creating%20a%20Key%20Pair)):

```bash
openssl ecparam -name prime256v1 -genkey -noout -out private-key.pem 
openssl ec -in private-key.pem -pubout -out public-key.pem
```

This yields `private-key.pem` and `public-key.pem`. **Keep the private key secure** (do not expose it publicly) ([Developer Guide | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#:~:text=%3E%20Note%3A%20private,be%20hosted%20on%20a%20domain)). 

**2. Host the Public Key:** Host `public-key.pem` at the well-known URL on your domain:
```
https://<YOUR-DOMAIN>/.well-known/appspecific/com.tesla.3p.public-key.pem
``` 
Your domain must match one of the allowed origins you set in the Tesla Developer Portal. For example, if your app’s allowed origin is **www.example.com**, you could host the key at **https://example.com/.well-known/appspecific/com.tesla.3p.public-key.pem** (the root domain is used) ([Partner Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#:~:text=,that%20are%20generated%20by%20the)) ([Partner Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#:~:text=%2A%20A%20PEM,that%20are%20generated%20by%20the)). In our guide, we’ll assume the domain is `$DOMAIN` (e.g. `public-key-server-tesla.vercel.app`), and we have hosted the key there.

Tesla expects a PEM-encoded EC public key (prime256v1) at that URL ([Partner Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#:~:text=%2A%20A%20PEM,that%20are%20generated%20by%20the)), accessible via HTTPS. This proves domain ownership and will later allow vehicles to verify your commands.

**3. Register via Partner API:** Now use your `$PARTNER_TOKEN` from Step 1 to call the **register** endpoint. This step tells Tesla “I have a public key hosted here, please register my application.” 

```bash
# Use Partner token to register your app's domain and public key with Tesla
export PARTNER_TOKEN="<PASTE_PARTNER_TOKEN_HERE>"

curl --request POST \
     --header "Content-Type: application/json" \
     --header "Authorization: Bearer $PARTNER_TOKEN" \
     --data '{"domain": "'"$DOMAIN"'"}' \
     "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts"
```

In the JSON, we send the root domain of our app. Tesla’s server will attempt to fetch the PEM key from `https://<domain>/.well-known/appspecific/com.tesla.3p.public-key.pem` and register it. The bearer token must be the partner token ([Partner Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#:~:text=,that%20are%20generated%20by%20the)).

**Response:** A successful registration returns some info (e.g. perhaps your domain or a success message). There is also a GET endpoint to verify: 

```bash
curl -H "Authorization: Bearer $PARTNER_TOKEN" \
     "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts/public_key?domain=$DOMAIN"
```

This **public_key** query returns the public key Tesla has on file for the domain (so you can verify it matches what you uploaded) ([Partner Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#:~:text=This%20endpoint%20requires%20a%20partner,authentication%20token)). At this point, your application is **registered** ([Partner Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#:~:text=Registers%20an%20existing%20account%20before,com%20must%20complete%20this%20step)). Each new Tesla app **must complete this registration step** before it can use other API features ([Partner Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#:~:text=Registers%20an%20existing%20account%20before,com%20must%20complete%20this%20step)).

Your app is now set up on Tesla’s side with a virtual key. Next, we’ll obtain a user token via OAuth and then pair this key with a vehicle.

## Step 3: User Authorization (OAuth 2.0 Authorization Code Flow)
**Goal:** Obtain an **Access Token** (and Refresh Token) on behalf of a Tesla user, allowing your app to act on their behalf. This uses the standard OAuth **authorization code** flow ([Third-Party Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens#:~:text=Use%20the%20,Authentication%20endpoints%20are%20not%20billed)) for third-party tokens.

**What you need:** The user’s authorization (they log in with Tesla credentials and consent to your app scopes). Also, your app’s Client ID, Redirect URI, and desired scopes. Ensure your Redirect URI is configured in the Developer Portal.

There are three sub-steps: 
1. **Authorize URL** – Direct the user to Tesla’s login/authorize page.  
2. **Callback** – Tesla redirects back with an authorization code.  
3. **Token Exchange** – Your server exchanges the code for an Access Token (and Refresh Token).

### 3.1 User Authorization Request 
Construct the Tesla OAuth authorization URL and have the user visit it (e.g. via redirect or by clicking a link). The endpoint is:

```
https://auth.tesla.com/oauth2/v3/authorize
```

**Query parameters** (GET): 

- `response_type=code` – We request an auth **code**. ([Third-Party Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens#:~:text=Name%20Required%20Example%20Description%20response_type,Random%20value%20used%20for%20validation))  
- `client_id=$CLIENT_ID` – Your app’s Client ID.  
- `redirect_uri=$REDIRECT_URI` – Your callback URI (must exactly match what’s registered).  
- `scope=openid offline_access user_data vehicle_device_data vehicle_cmds ...` – Space-delimited scopes to request ([Third-Party Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens#:~:text=url%2C%20spec%3A%20rfc6749,user%20will%20be%20prompted%20to)). Include `openid` (for authentication) and `offline_access` (to get a refresh token) ([Third-Party Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens#:~:text=scope%20Yes%20openid%20offline_access%20user_data,Random%20value%20used%20for%20validation)). Add any others your app needs (e.g. `vehicle_device_data` for vehicle info, `vehicle_cmds` for sending commands, `vehicle_charging_cmds` for charging control, etc.). Only request what you need – Tesla requires apps to request only necessary scopes ([Announcements | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/announcements#:~:text=Request%20Only%20Necessary%20Scopes%3A%20In,for%20the%20application%20to%20function)).  
- `state=XYZ` – A random CSRF token your app generates to maintain state (optional but recommended).  
- `prompt=login` – (Optional) forces re-login. By default, Tesla might reuse a session if one exists.  

**Example Authorization URL:**

```text
https://auth.tesla.com/oauth2/v3/authorize
  ?client_id=YOUR-CLIENT-ID
  &redirect_uri=https://yourapp.com/tesla/callback
  &response_type=code
  &scope=openid%20offline_access%20user_data%20vehicle_device_data%20vehicle_cmds%20vehicle_charging_cmds
  &state=abc123
```

You would redirect the user’s browser to a URL like the above (with proper URL encoding). The user will see a **“Sign in with Tesla”** login page, then a consent screen listing the scopes your app is requesting (e.g. permission to view vehicle data, etc.). They must log in with their Tesla account email/MFA and **Allow** access.

### 3.2 Handling the OAuth Callback 
After the user approves, Tesla will redirect the browser to your specified `$REDIRECT_URI` with a code. For example: 

```
https://yourapp.com/tesla/callback?code=ABCDEFG&state=abc123
```

Your web app should capture the `code` parameter (and verify the `state` matches what you sent). This code is short-lived (typically valid for 1–5 minutes).

### 3.3 Exchanging Code for Tokens 
Now your backend server will exchange the authorization code for an **Access Token**. Do a POST to the OAuth token endpoint:

```bash
export AUTH_CODE="ABCDEFG"  # code received in callback

curl --request POST "https://auth.tesla.com/oauth2/v3/token" \
     --header "Content-Type: application/x-www-form-urlencoded" \
     --data-urlencode "grant_type=authorization_code" \
     --data-urlencode "client_id=$CLIENT_ID" \
     --data-urlencode "client_secret=$CLIENT_SECRET" \
     --data-urlencode "code=$AUTH_CODE" \
     --data-urlencode "redirect_uri=$REDIRECT_URI" \
     --data-urlencode "audience=$AUDIENCE"
```

Key points:
- `grant_type=authorization_code` (standard for exchanging a code) ([Third-Party Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens#:~:text=match%20at%20L85%20grant_type%20Yes,Must%20be%20a%20Fleet)).
- Include the same `client_id` and `client_secret`. Tesla requires the client secret here to authenticate the token request.
- Provide the `code` you got, and **the same** `redirect_uri` as before (it must match exactly or you’ll get an error like “invalid_redirect_url” ([Conventions | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/getting-started/conventions#:~:text=%E2%80%A2%20invalid_auth_code%20,has%20been%20granted%20for%20the))).
- Include the `audience=$AUDIENCE` (the Fleet API base URL) to ensure the token is valid for calling Fleet API endpoints ([Third-Party Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens#:~:text=grant_type%20Yes%20authorization_code%20Grant%20type,Must%20be%20a%20Fleet)). If omitted, the token might default to Tesla user profile audience; specifying `audience` is important so the token can call car APIs.

**Response:** A successful response will contain `access_token`, `refresh_token`, `id_token`, etc. For example: 

```json
{
  "access_token": "eyJh...<jwt>...",
  "refresh_token": "eyJh...<jwt>...",
  "id_token": "eyJh...<jwt>...",
  "token_type": "Bearer",
  "expires_in": 300
}
```

- The `access_token` (Bearer) is what you use in API calls on behalf of the user. It typically expires in 5 minutes (300 seconds) for Tesla’s OAuth.  
- The `refresh_token` is a long-lived token that allows you to get new access tokens without requiring the user to log in again ([Third-Party Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens#:~:text=If%20using%20the%20,and%20expires%20after%203%20months)). **Store the refresh token securely** (e.g. in your database) – it is single-use and expires if not used for 3 months ([Third-Party Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens#:~:text=If%20using%20the%20,and%20expires%20after%203%20months)). 
- The `id_token` is a JWT containing user identity info (OpenID Connect), not usually needed for API calls unless you need to verify user identity locally.

At this point, your app is authorized to access this user’s data. We have a valid `$ACCESS_TOKEN` to call Tesla APIs for this user (within the scope of permissions granted).

**Example – Get User’s Vehicles:** To test, you can call a simple endpoint like listing the user’s vehicles. For instance:

```bash
# Use the user access token to list vehicles
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles"
```

If the token is valid, the response will include a list of the user’s vehicles and their `id` and `vin` (and some state) in JSON. For example, `"response": [ { "id":12345678901234567, "vehicle_id":1234567890, "vin":"5YJXXXXXXXXXXXXXX", ... } ]`. We will need the `vin` or `id` of the vehicle to pair and configure telemetry.

Before proceeding, let’s cover how to handle tokens long-term:

**Refreshing Tokens:** Because the user access token is short-lived, your backend should proactively refresh it using the `refresh_token` before it expires. For example, when nearing expiration (or on a 401 response), call the token endpoint with `grant_type=refresh_token`. For example:

```bash
curl --request POST "https://auth.tesla.com/oauth2/v3/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     --data-urlencode "grant_type=refresh_token" \
     --data-urlencode "client_id=$CLIENT_ID" \
     --data-urlencode "client_secret=$CLIENT_SECRET" \
     --data-urlencode "refresh_token=$REFRESH_TOKEN"
```

This returns a new `access_token` (and usually a new refresh token). **Note:** Tesla’s refresh tokens are single-use – using one invalidates the previous access, and the new response will include a fresh refresh token to use next time ([Third-Party Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens#:~:text=If%20using%20the%20,and%20expires%20after%203%20months)). Update your stored refresh token each time. Include `offline_access` scope in the original auth if you want a refresh token at all ([Third-Party Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens#:~:text=scope%20Yes%20openid%20offline_access%20user_data,Random%20value%20used%20for%20validation)).

**Revoking Access:** If the user ever revokes your app’s access, your API calls will start failing (e.g. refresh token may be invalid). Users can revoke access in two ways: 
- **In-Car:** Removing the app’s virtual key from the vehicle’s Locks menu (more on this in pairing step). This immediately stops telemetry and commands ([Understanding Virtual Keys | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/overview#:~:text=The%20user%20is%20always%20in,and%20stream%20realtime%20vehicle%20data)). 
- **Online:** Via Tesla Account settings (Account Security page) where they can manage third-party app permissions ([Understanding Virtual Keys | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/overview#:~:text=To%20revoke%20these%20without%20physical,via%20the%20Account%20Security%20page)). 

If you need to proactively revoke a token (e.g. user logged out of your app), Tesla’s system doesn’t provide a direct API endpoint for the third-party to revoke tokens. In practice, you can simply discard the tokens on your side and/or instruct the user how to revoke via Tesla account. Also note, changing the user’s Tesla account password will invalidate all old tokens.

Now that we have both a Partner token (for administrative actions) **and** a User access token (for user-specific actions), and our app’s public key is registered, we can pair the key with the user’s vehicle.

## Step 4: Pairing the Virtual Key with the Tesla Vehicle
**Goal:** Establish the **trust** between the vehicle and your application by installing your app’s **public key** (virtual key) on the vehicle. This is required for streaming telemetry and for any “secure” commands (like unlocking, starting car, etc.) ([Understanding Virtual Keys | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/overview#:~:text=Even%20after%20authorizing%20a%20third,the%20application%20the%20ability%20to)) ([Understanding Virtual Keys | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/overview#:~:text=application%27s%20virtual%20key%20to%20a,the%20application%20the%20ability%20to)). Until the virtual key is paired, certain functionality remains inaccessible even if the user authorized your app ([Understanding Virtual Keys | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/overview#:~:text=Even%20after%20authorizing%20a%20third,the%20application%20the%20ability%20to)).

**Background:** The virtual key adds an extra security layer beyond OAuth. Even after a user authorizes via OAuth, Tesla requires a user-in-the-loop step to pair the key. **Adding a virtual key grants the app ability to receive real-time data and send secure commands** to that vehicle ([Understanding Virtual Keys | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/overview#:~:text=application%27s%20virtual%20key%20to%20a,the%20application%20the%20ability%20to)), and ensures only your signed requests are accepted. The user must physically confirm this pairing for security.

**How to pair:** Tesla provides a deep link that the user opens in their Tesla mobile app. This will prompt them to add your “virtual key” to a specific vehicle. The link format is:

```
https://tesla.com/_ak/<YOUR-DEVELOPER-DOMAIN>
```

Replace `<YOUR-DEVELOPER-DOMAIN>` with the domain you registered in Step 2 (we stored this in `$DOMAIN`). Tesla’s app will verify that your app is registered and then guide the user to approve adding the key. Optionally, if the user has multiple Teslas, you can specify a `vin` parameter to target a specific car ([Developer Guide | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#adding-to-a-vehicle#:~:text=paring%20link%2C%20or%20an%20optional,parameter%20can%20be%20added)). For example:

- **General link:** `https://tesla.com/_ak/public-key-server-tesla.vercel.app`  
- **Specific vehicle:** `https://tesla.com/_ak/public-key-server-tesla.vercel.app?vin=5YJ3E1EB5XXXXXXXX` (replace VIN with actual).

You can present this link as a QR code or clickable URL to the user on a mobile device. For instance, if the user is viewing your web app on their phone, clicking the link should open the Tesla app (if installed) and navigate to the pairing flow. Alternatively, show a QR code that they can scan with the Tesla mobile app’s camera. The Tesla Developer docs note that the third-party app typically provides a link or QR to initiate pairing ([Understanding Virtual Keys | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/overview#:~:text=How%20is%20a%20virtual%20key,added%20to%20a%20vehicle)).

When the user opens that link, the Tesla app will ask which vehicle to add the key to (if VIN not specified and they have multiple) and then confirm adding the **“<Your App Name>” key** to the vehicle. The domain (or app name) will be displayed to the user during this process ([Partner Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#:~:text=registered%20on%20devices%20and%20used,pairing%20process)) so they know which application they are pairing.

**User confirmation:** The user approves, and the vehicle stores your public key as an **additional driver key** (like a virtual smartphone key). Tesla allows up to 19 or 20 keys normally; if the car has 20 keys already, pairing will fail (user would have to remove a key). Once paired, your app’s key is now trusted by the car. 🎉

**Verification:** After the pairing, you can verify on the backend that the key is indeed paired. One way is to call the **fleet_status** endpoint, which checks key pairing status:

```bash
# Check if the vehicle has our key paired
curl --request POST \
     -H "Authorization: Bearer $PARTNER_TOKEN" \
     -H "Content-Type: application/json" \
     --data '{"vins": ["'"$VIN"'"]}' \
     "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/fleet_status"
```

This endpoint (no user context needed, uses partner token) returns which VINs are paired or not for your app’s ke ([412 status when calling fleet_telemetry_config create · Issue #284 · teslamotors/fleet-telemetry · GitHub](https://github.com/teslamotors/fleet-telemetry/issues/284#:~:text=%7B%20,true))】. For example, a successful response might include `"key_paired_vins": ["<VIN>"]` indicating your key is installed on that vehicl ([412 status when calling fleet_telemetry_config create · Issue #284 · teslamotors/fleet-telemetry · GitHub](https://github.com/teslamotors/fleet-telemetry/issues/284#:~:text=%7B%20,true))】. If the VIN shows up under `unpaired_vins` instead, then the pairing hasn’t completed.

Another check: If you have physical access, the Tesla mobile app’s **Locks** section will list your application key as a vehicle key after pairing. The user can also remove it from there if neede ([Understanding Virtual Keys | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/overview#:~:text=The%20user%20is%20always%20in,and%20stream%20realtime%20vehicle%20data))】.

**Troubleshooting pairing:** If the user encounters an error when opening the link: 
- “User has not granted this third-party app access” – This means the Tesla account logged in on the phone is different from the one that authorized in Step 3. They should use the same Tesla account for both OAuth and pairin ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=Troubleshooting%3A))】. 
- “Application has not registered with Tesla” – This means the register endpoint (Step 2) wasn’t called or the public key URL isn’t reachable. Ensure Step 2 was done and the PEM is accessibl ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=when%20authorizing%20the%20third,the%20domain%20used%20for%20application))】.

Now we have: the user’s OAuth token (so Tesla’s backend knows this user allowed data access) **and** the vehicle has our app’s public key (so the vehicle will trust incoming commands/config from us). This two-factor setup is by design – **OAuth** grants permission, and the **virtual key** pairing grants capabilit ([Understanding Virtual Keys | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/overview#:~:text=What%20is%20the%20relationship%20between,the%20access%20granted%20during%20authorization))】.

We can now proceed to set up **telemetry streaming** from the vehicle to our server.

## Step 5: Configuring Vehicle Telemetry Streaming
**Goal:** Send a configuration to the vehicle telling it to start **streaming telemetry data** to your server. Tesla’s Fleet Telemetry feature allows the car to push data in real-time, which is far more efficient than polling the REST API repeatedl ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=Fleet%20Telemetry%20is%20the%20most,not%20fully%20equivalent%20to%20the))】. With telemetry, vehicles stream data directly to your server over a secure channel, typically updating every 0.5 second ([Available Data | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry/available-data#:~:text=Vehicle%20data%20is%20sent%20every,is%20described%20in%20System%20Behavior))】.

**Pre-requisites:** 
- The vehicle must support telemetry (any Tesla except pre-2021 Model S/X) and have recent firmware (2024.26+ for command proxy method ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=For%20a%20vehicle%20to%20be,few%20conditions%20must%20be%20met))】.
- Your virtual key must be paired with the vehicle (completed in Step 4 ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=,paired%20with%20the%20vehicle))】.
- Your telemetry server must be running and reachable on the internet (with a valid TLS certificate).

Tesla provides an endpoint to configure telemetry: `POST /api/1/vehicles/fleet_telemetry_config`. However, **Tesla strongly recommends using the Vehicle Command Proxy to call this endpoint* ([Vehicle Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints#:~:text=Configures%20vehicles%20to%20connect%20to,to%20create%20or%20update%20configurations))】. The Command Proxy is a tool that will automatically sign the request with your private key and forward it. In our example, we’ll illustrate the call and assume you handle signing (or use the proxy). 

**Telemetry Server Setup:** For this guide, assume we have a telemetry endpoint running at **`tesla-telemetry-server.fly.dev`** (the provided example server). This is the server URL the car will connect to and stream data. You should have a TLS certificate for it. The server could be Tesla’s reference implementation or your own server that accepts the telemetry data (often using MQTT or Kafka under the hood). The details of standing up the server are outside this guide, but you can use Tesla’s open-source fleet-telemetry server as a starting poin ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=Server%20Setup))】 (which listens on port 443 by default).

**Craft the Telemetry Config:** We need to tell the car what data to send and where. The config is a JSON containing:
- The target vehicles (list of VINs).
- The telemetry **“config”** which includes your server’s host (and port, if not 443), the server’s CA certificate (optional but recommended for trust), and the list of data fields and their update intervals.

You likely have the vehicle’s VIN from the earlier step (we’ll use `$VIN`). Construct a JSON like:

```json
{
  "vins": [ "<VIN_GOES_HERE>" ],
  "config": {
    "hostname": "tesla-telemetry-server.fly.dev",
    "port": 443,
    "fields": {
       "VehicleSpeed":        { "interval_seconds": 5 },
       "Soc":                 { "interval_seconds": 60 },
       "Location":            { "interval_seconds": 10 }
    }
  }
}
```

This example asks the vehicle to stream the `VehicleSpeed` every 5 seconds, State of Charge (`Soc` – battery level) every 60 seconds, and GPS `Location` every 10 seconds. You can include many other fields – see Tesla’s documentation for available telemetry field ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=A%20full%20list%20of%20fields,available%20fields%20are%20coming%20soon))】 (the list covers everything from climate settings to odometer, etc.). Each field will be sent only if its value changes and the specified interval has elapse ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=Fleet%20Telemetry%20consists%20of%20two,event%20loops))】. Data is batched into ~500ms frames for efficienc ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=System%20Behavior))】. (Note: For any location-based fields like `Location`, the user must have granted the `vehicle_location` scope in auth, otherwise those fields will be empty or unavailabl ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=Note%3A%20vehicle_location%20scope%20is%20required,DestinationLocation%2C%20DestinationName%2C%20RouteLine%2C%20GpsState%2C%20GpsHeading))】.)

You should also include the TLS **CA certificate** that your server’s certificate was signed by, especially if using Let’s Encrypt or a private CA. Tesla vehicles need to trust the server’s certificate. The config supports a `"ca"` field where you put the full PEM (chain) of your server’s CA. For brevity, we omit it here, but in production you’d include it (as a single string with `\n` line breaks). Tesla provides a helper script to test certificate compatibilit ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=,endpoint%20may%20have%20some%20lag))】.

**Send the Configuration:** Now, send this JSON to Tesla’s API. It must be signed with your private key as a JSON Web Signature (JWS) if you call directly. If you use the Vehicle Command Proxy, that proxy will handle the signing. Assuming you have the proxy set up or have generated a JWS, you would do:

```bash
curl --request POST \
     -H "Authorization: Bearer $PARTNER_TOKEN" \
     -H "Content-Type: application/json" \
     --data @telemetry_config.json \
     "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/fleet_telemetry_config"
```

Where `telemetry_config.json` contains the JSON we crafted. (If calling via the command proxy, you’d instead call your proxy’s URL, or use its CLI; it will forward to the above endpoint with the proper signature.)

When Tesla’s backend receives this, it verifies the signature with the public key you registered (ensuring it’s really your request and not tampered). Then it forwards the config to the vehicle. The vehicle, if awake, should apply the config immediately.

**Response:** On success, you’ll get some JSON confirmation. If there are issues, the response may list any `skipped_vehicles` and reasons. Common reasons:
- `missing_key` – The car doesn’t have your public key (pairing didn’t happen ([Vehicle Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints#:~:text=,%60unsupported_firmware))】.
- `unsupported_hardware/firmware` – The car is an older model or outdated firmware that can’t do telemetr ([Vehicle Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints#:~:text=,%60unsupported_firmware))】.
- `max_configs` – The car already has 5 telemetry configs (Tesla allows up to 5 apps streaming per vehicle ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=cannot%20be%20edited%20by%20Tesla,party%20applications%20at%20a%20time))】.

A status code 412 (Precondition Failed) may indicate an unsigned request or other issues if you attempted direct call without the proxy in a scenario that requires i ([412 status when calling fleet_telemetry_config create · Issue #284 · teslamotors/fleet-telemetry · GitHub](https://github.com/teslamotors/fleet-telemetry/issues/284#:~:text=The%20process%20changed%20since%20Patrick%27s,command%20through%20the%20Command%20Proxy))】.

If the vehicle is asleep when you send this, the config will queue and apply when it wakes next. You can call the `GET /api/1/vehicles/{id}/fleet_telemetry_config` endpoint to check status; it returns the config and a `synced` flag (true if the car has applied it ([Vehicle Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints#:~:text=fleet_telemetry_config%20get))】. Also, the `fleet_status` endpoint can report the telemetry client version on the vehicle and whether it requires command proxy (if `vehicle_command_protocol_required` is true, you must use signed proxy commands, which we did ([412 status when calling fleet_telemetry_config create · Issue #284 · teslamotors/fleet-telemetry · GitHub](https://github.com/teslamotors/fleet-telemetry/issues/284#:~:text=,true))】.

**Vehicle Streaming Behavior:** Once configured, the vehicle will start sending data to your telemetry server. The data stream will include the fields you requested at the intervals specified, but only when values change or at least at the interval boundar ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=Fleet%20Telemetry%20consists%20of%20two,event%20loops))】. Data comes roughly every 500 ms in bulk updates of any changed field ([Available Data | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry/available-data#:~:text=Vehicle%20data%20is%20sent%20every,is%20described%20in%20System%20Behavior)) ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=1,the%20field%27s%20value%20has%20changed))】. For example, if VehicleSpeed hasn’t changed, it won’t be sent again until it does (with some rules as described in Tesla’s docs about the event collector ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=Time%20Event%20Action%200ms%20Process,since%20interval_seconds%20has%20not%20elapsed)) ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=interval_seconds%20has%20not%20elapsed,to%20the%20event%20collector%20since))】.

Each message from the car is cryptographically verified (the car uses its own TLS client cert to authenticate to your server). The telemetry server you run will accept these messages and typically forward them to a processing system (like a Kafka topic, database, or simply log them). In Tesla’s reference implementation, by default the data might just be logged or output to console (depending on config). For instance, you’d see JSON payloads containing the field values and timestamps.

**Example Telemetry Data:** A sample message (for illustration) might look like:
```json
{
  "vin": "5YJ3E1EB5XXXXXXXX",
  "timestamp": 1697045300000,
  "VehicleSpeed": 65.0,
  "Soc": 80.5,
  "Location": {"latitude": 37.4219, "longitude": -122.0840}
}
```
This would be sent to your server at the defined intervals. The **Available Data** documentation lists all possible fields and their meanings (for example, `Soc` is State of Charge in %% ([Available Data | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry/available-data#:~:text=Battery%20Heater%20On%20Charging%20boolean,pressure%20measured%20in%20the%20ESP))】.

Now you have real-time vehicle telemetry flowing to your application’s server without constantly polling Tesla’s cloud. This approach reduces load and avoids waking the car unnecessaril ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=Fleet%20Telemetry%20is%20the%20most,not%20fully%20equivalent%20to%20the))】, preserving battery.

## Step 6: Utilizing Telemetry Data and Next Steps 
With telemetry configured, your custom web app can now utilize the live data. Some final points and best practices:

- **Data Handling:** Ensure your server can handle the incoming data stream. Tesla’s open-source telemetry server writes data to Kafka topics by default. You might parse the data and store it, or use it to trigger events (e.g., alert when battery is low, or update a live map). 

- **Security:** The data is coming over TLS. Only your server (with the matching private key for the TLS cert) can decrypt it. Also, messages are authenticated by the car’s client certificate (Tesla’s server ensures only the intended vehicle can send data). Keep your telemetry server’s private key safe just like your app’s Tesla API keys.

- **Monitoring:** You can use the **fleet_telemetry_errors** endpoint to check if the vehicle reported any errors in streaming to your server (e.g. connectivity issues). For example, `GET /api/1/vehicles/{id}/fleet_telemetry_errors` with the user token will list recent errors if any. There are also partner-level endpoints to get telemetry errors across your fleet (e.g. `GET /api/1/partner_accounts/fleet_telemetry_errors` with partner token ([Partner Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#:~:text=fleet_telemetry_errors))】.

- **Refreshing Tokens:** As mentioned, keep an eye on the `$ACCESS_TOKEN` expiration. It’s best to refresh proactively. You might implement a routine to refresh using the `$REFRESH_TOKEN` every, say, 4.5 minutes (since access token is ~5 min). The `offline_access` scope we used ensures we have a refresh toke ([Third-Party Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens#:~:text=scope%20Yes%20openid%20offline_access%20user_data,Random%20value%20used%20for%20validation))】. A sample refresh response will include a new `access_token` and often a new `refresh_token`. Update your stored values accordingly. If the refresh token is expired (90+ days or used incorrectly), you’ll get an error and need the user to re-authenticate (go through Step 3 again).

- **Revoking Access:** If the user removes your app’s access (via Tesla account or removing the key), be prepared to stop data collection and invalidate any stored tokens for that user. The vehicle will automatically stop streaming if the required scope is revoked – Tesla will remove your telemetry config in that cas ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=Once%20all%20pre,party%20applications%20at%20a%20time))】 (for instance, if the user revokes `vehicle_device_data` permission). If the user deletes the virtual key from the car, your streaming and commands will immediately fail as wel ([Understanding Virtual Keys | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/virtual-keys/overview#:~:text=The%20user%20is%20always%20in,and%20stream%20realtime%20vehicle%20data))】. Your app should handle such cases gracefully (inform the user or re-initiate pairing flow if appropriate).

- **Additional Vehicle Commands:** While not the focus of this guide, with the setup completed (OAuth + paired key), you can also send **commands** to the vehicle (e.g. unlock doors, honk horn, etc.) via the Fleet API vehicle command endpoints. These commands must be signed by your private key (just like the telemetry config was). Tesla’s Vehicle Command Proxy can be used for those as well, or you sign the payloads yourself. Always check that the virtual key is present on the vehicle before attempting a command, or it will be rejecte ([Best Practices | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/getting-started/best-practices#:~:text=Ensure%20virtual%20key%20presence%20prior,to%20sending%20signed%20commands))】. The `fleet_status` endpoint helps here (it indicates if the key is paired and if the car is online ([Best Practices | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/getting-started/best-practices#:~:text=If%20the%20public%20key%20,before%20sending%20a%20signed%20command))】.

- **Avoid Polling:** Now that telemetry is set up, you should avoid calling the traditional `vehicle_data` REST endpoint in a loop. Telemetry provides a continuous stream and is **much more cost-effective and efficient* ([Best Practices | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/getting-started/best-practices#:~:text=Avoid%20polling%20device%20data))】. Polling the REST API frequently can drain the car’s battery by waking it; telemetry avoids this by pushing data without wake cycle ([Overview | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/fleet-telemetry#:~:text=Fleet%20Telemetry%20is%20the%20most,not%20fully%20equivalent%20to%20the))】.

Finally, let’s compile the key cURL commands from this guide into a summary table for easy reference.

## Summary: Key cURL Commands and Workflow

Below is a summary of each step with the representative cURL commands. **Replace the placeholders** (shown in ALL_CAPS or variables) with your actual credentials, URLs, VIN, etc., before running.

```text
+--------------------------------------------------------------------------------------------------------------+
| Step & Purpose                       | Example cURL Command (with placeholders)                               |
|--------------------------------------+------------------------------------------------------------------------|
| **1. Partner OAuth Token** – exchange| ```bash                                                                |
| client credentials for a token       | curl -X POST "https://auth.tesla.com/oauth2/v3/token" \                |
| (server-to-server auth)             |      -H "Content-Type: application/x-www-form-urlencoded" \            |
|                                      |      --data-urlencode "grant_type=client_credentials" \               |
|                                      |      --data-urlencode "client_id=$CLIENT_ID" \                        |
|                                      |      --data-urlencode "client_secret=$CLIENT_SECRET" \                |
|                                      |      --data-urlencode "audience=$AUDIENCE" \                          |
|                                      |      --data-urlencode "scope=openid vehicle_device_data vehicle_cmds vehicle_charging_cmds"``` |
|                                      | **Output:** `access_token` (use as $PARTNER_TOKEN for next calls).    |
|--------------------------------------+------------------------------------------------------------------------|
| **2. Register Application** – link   | ```bash                                                                |
| your domain & public key with Tesla  | curl -X POST "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts" \ |
| (requires Partner token)            |      -H "Content-Type: application/json" \                             |
|                                      |      -H "Authorization: Bearer $PARTNER_TOKEN" \                      |
|                                      |      --data '{"domain": "<YOUR_DOMAIN>"}'```                          |
|                                      | Registers your app’s domain and fetches your public key (hosted at    |
|                                      | https://<YOUR_DOMAIN>/.well-known/appspecific/com.tesla.3p.public-key.pem). |
|                                      | **Output:** Confirms registration (no JSON body on success, or e.g.    |
|                                      | echo of domain).                                                      |
|--------------------------------------+------------------------------------------------------------------------|
| **3. OAuth Authorize (User Login)**  | **URL (GET):** `https://auth.tesla.com/oauth2/v3/authorize?client_id=CLIENT&redirect_uri=URI&response_type=code&scope=openid offline_access ...&state=STATE` |
| – user logs in and approves scopes   | *(User is redirected to Tesla, logs in, and is redirected back with ?code=...)* |
|--------------------------------------+------------------------------------------------------------------------|
| **4. OAuth Token Exchange** – trade  | ```bash                                                                |
| auth code for user Access/Refresh    | curl -X POST "https://auth.tesla.com/oauth2/v3/token" \                |
| token (requires Client secret)      |      -H "Content-Type: application/x-www-form-urlencoded" \            |
|                                      |      --data-urlencode "grant_type=authorization_code" \               |
|                                      |      --data-urlencode "client_id=$CLIENT_ID" \                        |
|                                      |      --data-urlencode "client_secret=$CLIENT_SECRET" \                |
|                                      |      --data-urlencode "code=$AUTH_CODE" \                             |
|                                      |      --data-urlencode "redirect_uri=$REDIRECT_URI" \                  |
|                                      |      --data-urlencode "audience=$AUDIENCE"```                         |
|                                      | **Output:** `access_token` (use as $ACCESS_TOKEN for user API calls),  |
|                                      | `refresh_token` ($REFRESH_TOKEN for future refresh).                  |
|--------------------------------------+------------------------------------------------------------------------|
| **5. List Vehicles** (optional test) | ```bash                                                                |
| – get user's vehicles with Access Token | curl -H "Authorization: Bearer $ACCESS_TOKEN" \                     |
|                                      |      "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles"```   |
|                                      | **Output:** JSON list of vehicles (get the `"vin"` from here for the   |
|                                      | next steps).                                                          |
|--------------------------------------+------------------------------------------------------------------------|
| **6. Pair Virtual Key** – user action| **URL/QR for user:** `https://tesla.com/_ak/<YOUR_DOMAIN>?vin=<VIN>`    |
| to add key to vehicle via Tesla app  | (Open this link on a device with the Tesla app; user approves adding key.) |
|                                      | **Output:** On success, the vehicle now has your public key (virtual key) paired. |
|--------------------------------------+------------------------------------------------------------------------|
| **7. Verify Key Pairing** (optional) | ```bash                                                                |
| – check if vehicle has key           | curl -X POST "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/fleet_status" \ |
|                                      |      -H "Authorization: Bearer $PARTNER_TOKEN" \                      |
|                                      |      -H "Content-Type: application/json" \                            |
|                                      |      --data '{"vins": ["<VIN>"]}'```                                  |
|                                      | **Output:** e.g. `{"response": {"key_paired_vins": ["<VIN>"], "unpaired_vins": [] ... }}` (VIN under key_paired_vins indicates success). |
|--------------------------------------+------------------------------------------------------------------------|
| **8. Configure Telemetry** – instruct| ```bash                                                                |
| car to stream data to your server    | curl -X POST "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/fleet_telemetry_config" \ |
| (signed request via proxy or manual) |      -H "Authorization: Bearer $PARTNER_TOKEN" \                      |
|                                      |      -H "Content-Type: application/json" \                            |
|                                      |      --data '{                                                      |
|                                      |         "vins": ["<VIN>"],                                          |
|                                      |         "config": {                                                 |
|                                      |            "hostname": "tesla-telemetry-server.fly.dev",             |
|                                      |            "port": 443,                                             |
|                                      |            "fields": { "VehicleSpeed": {"interval_seconds": 5}, ... }|
|                                      |         }                                                           |
|                                      |      }'```                                                           |
|                                      | (Include a "ca" field with your server's CA cert if needed for trust.) |
|                                      | **Output:** Confirmation of config. If errors: e.g. `missing_key` (key not paired), etc. |
|--------------------------------------+------------------------------------------------------------------------|
| **9. Vehicle Streams Data**          | *(Vehicle now connects to your telemetry server and streams JSON data continuously.)* |
| **(No further cURL; data comes to**  | Monitor your server logs or data pipeline to utilize the telemetry.   |
| **your server)**                     |                                                                        |
|--------------------------------------+------------------------------------------------------------------------|
| **10. Refresh Token** – get new      | ```bash                                                                |
| access token after expiry            | curl -X POST "https://auth.tesla.com/oauth2/v3/token" \                |
|                                      |      -H "Content-Type: application/x-www-form-urlencoded" \           |
|                                      |      --data-urlencode "grant_type=refresh_token" \                    |
|                                      |      --data-urlencode "client_id=$CLIENT_ID" \                        |
|                                      |      --data-urlencode "client_secret=$CLIENT_SECRET" \                |
|                                      |      --data-urlencode "refresh_token=$REFRESH_TOKEN"```               |
|                                      | **Output:** New `access_token` (and possibly new `refresh_token`).    |
|--------------------------------------+------------------------------------------------------------------------|
| **11. Revoke Access** – (User action)| *(If user revokes app access:* remove virtual key via car UI **or**    |
| user can remove app’s key or perms   | revoke permission on Tesla account page; your tokens will become invalid.) |
|                                      | **Output:** Vehicle stops streaming, Tesla API calls return 401/expired. |
+--------------------------------------------------------------------------------------------------------------+
```

In the above table, each command corresponds to the steps we discussed. Use it as a quick reference to implement the integration in a real system. Remember to handle errors and responses at each step (for instance, handling multi-factor auth in user login if needed, HTTP errors, etc.). 

By following this guide, you have: 
- Acquired a **partner token** for server authentication, 
- Registered your application’s domain and public key with Tesla’s servers, 
- Performed an OAuth flow to get a user’s **third-party token** (access + refresh token),
- **Paired** your application’s virtual key with the user’s Tesla vehicle (establishing trust),
- Configured the vehicle to **stream telemetry** to your custom server, and 
- Prepared to manage token lifecycle (refreshing tokens and understanding revocation).

This end-to-end setup enables a fully functioning backend integration with Tesla’s API. Your web app can now securely receive live vehicle data and even send commands, all with the user’s consent and without polling. Always adhere to Tesla’s best practices (minimal necessary scopes, efficient data usage, respecting user control) to ensure a safe and optimized integration. Happy coding!

