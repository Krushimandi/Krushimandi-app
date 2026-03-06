/**
 * Truecaller Authentication Service
 * Firebase Cloud Function for handling Truecaller login and Firebase Custom Token generation
 * 
 * Flow:
 * 1. Accepts Truecaller OAuth PKCE credentials from frontend (authorizationCode + codeVerifier)
 * 2. Exchanges authorization code for access token via Truecaller OAuth endpoint
 * 3. Uses access token to fetch and verify user profile
 * 4. Checks if user exists in Firestore profiles by phoneNumber
 * 5. Creates new Firebase Auth user if not exists (or uses existing UID)
 * 6. Generates Firebase Custom Auth Token
 * 7. Returns token for client-side signInWithCustomToken
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const https = require('https');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Truecaller OAuth configuration
 * IMPORTANT: Set your actual Client ID from Truecaller Developer Portal
 */
const TRUECALLER_CONFIG = {
  // OAuth token exchange endpoint
  tokenEndpoint: 'https://oauth-account-noneu.truecaller.com/v1/token',
  // User profile endpoint
  profileEndpoint: 'https://oauth-account-noneu.truecaller.com/v1/userinfo',
  // Your Truecaller Client ID - must be set via Firebase Functions environment config
  clientId: process.env.TRUECALLER_CLIENT_ID || (() => {
    console.error('TRUECALLER_CLIENT_ID environment variable is not set');
    return '';
  })(),
};

/**
 * @typedef {Object} TruecallerAuthRequest
 * @property {string} phoneNumber - User's phone number with country code (e.g., +919876543210)
 * @property {string} firstName - User's first name from Truecaller
 * @property {string} lastName - User's last name from Truecaller
 * @property {string} [email] - User's email (optional)
 * @property {string} authorizationCode - OAuth authorization code from Truecaller SDK
 * @property {string} codeVerifier - PKCE code verifier from Truecaller SDK
 */

/**
 * @typedef {Object} TruecallerAuthResponse
 * @property {boolean} success - Whether authentication was successful
 * @property {string} [firebaseCustomToken] - Firebase custom token for signInWithCustomToken
 * @property {string} [uid] - Firebase user UID
 * @property {boolean} [isNewUser] - Whether this is a newly created user
 * @property {string} [error] - Error message if failed
 * @property {string} [errorCode] - Error code for frontend handling
 */

/**
 * Validate phone number format
 * @param {string} phoneNumber 
 * @returns {boolean}
 */
function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') return false;
  // Must start with + and contain only digits after
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
}

/**
 * Normalize phone number to consistent format
 * @param {string} phone 
 * @returns {string}
 */
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  // Remove spaces and ensure + prefix
  let normalized = phone.replace(/\s/g, '');
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  return normalized;
}

/**
 * Exchange OAuth authorization code for access token using PKCE flow
 * 
 * @param {string} authorizationCode - OAuth authorization code from Truecaller SDK
 * @param {string} codeVerifier - PKCE code verifier from Truecaller SDK
 * @returns {Promise<{success: boolean, accessToken?: string, error?: string}>}
 */
async function exchangeCodeForToken(authorizationCode, codeVerifier) {
  return new Promise((resolve) => {
    if (!authorizationCode || !codeVerifier) {
      resolve({ success: false, error: 'Missing authorization code or code verifier' });
      return;
    }

    // Prepare OAuth token request body
    const postData = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: TRUECALLER_CONFIG.clientId,
      code: authorizationCode,
      code_verifier: codeVerifier,
    }).toString();

    const options = {
      hostname: 'oauth-account-noneu.truecaller.com',
      path: '/v1/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 15000,
    };

    console.log('🔐 Exchanging authorization code for access token...');

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200 && response.access_token) {
            console.log('✅ Access token received successfully');
            resolve({ success: true, accessToken: response.access_token });
          } else {
            console.error('❌ Token exchange failed:', res.statusCode, response);
            resolve({ 
              success: false, 
              error: response.error_description || response.error || 'Token exchange failed'
            });
          }
        } catch (parseError) {
          console.error('❌ Failed to parse token response:', parseError, data);
          resolve({ success: false, error: 'Failed to parse token response' });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Token exchange request error:', error);
      resolve({ success: false, error: `Network error: ${error.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Token exchange timeout' });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Fetch user profile using access token
 * The phone number from this API is TRUSTED - it comes directly from Truecaller
 * 
 * @param {string} accessToken - Truecaller OAuth access token
 * @returns {Promise<{success: boolean, profile?: object, phoneNumber?: string, error?: string}>}
 */
async function fetchTruecallerProfile(accessToken) {
  return new Promise((resolve) => {
    if (!accessToken) {
      resolve({ success: false, error: 'Missing access token' });
      return;
    }

    const options = {
      hostname: 'oauth-account-noneu.truecaller.com',
      path: '/v1/userinfo',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    };

    console.log('📱 Fetching Truecaller profile...');

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const profile = JSON.parse(data);
            console.log('📱 Truecaller profile received:', JSON.stringify(profile, null, 2));
            
            // Get phone number from profile (Truecaller may use different field names)
            const phoneNumber = normalizePhoneNumber(
              profile.phone_number || profile.phoneNumber || profile.phone || ''
            );
            
            if (!phoneNumber) {
              console.error('❌ No phone number in Truecaller profile');
              resolve({ success: false, error: 'No phone number in Truecaller profile' });
              return;
            }
            
            console.log('✅ Phone number from Truecaller:', phoneNumber);
            resolve({ 
              success: true, 
              profile, 
              phoneNumber,
              firstName: profile.given_name || profile.firstName || '',
              lastName: profile.family_name || profile.lastName || '',
              email: profile.email || null,
            });
          } else if (res.statusCode === 401 || res.statusCode === 403) {
            console.error('❌ Invalid or expired access token');
            resolve({ success: false, error: 'Invalid or expired access token' });
          } else {
            console.error('❌ Truecaller API error:', res.statusCode, data);
            resolve({ success: false, error: `Truecaller API failed: ${res.statusCode}` });
          }
        } catch (parseError) {
          console.error('❌ Failed to parse Truecaller response:', parseError);
          resolve({ success: false, error: 'Failed to parse Truecaller response' });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Truecaller API request error:', error);
      resolve({ success: false, error: `Network error: ${error.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Truecaller API timeout' });
    });

    req.end();
  });
}

/**
 * Find existing user in Firestore profiles collection by phone number
 * 
 * @param {string} phoneNumber - Phone number to search for
 * @returns {Promise<{exists: boolean, uid?: string, profile?: object}>}
 */
async function findUserByPhoneNumber(phoneNumber) {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    const profilesSnapshot = await db
      .collection('profiles')
      .where('phoneNumber', '==', normalizedPhone)
      .limit(1)
      .get();

    if (!profilesSnapshot.empty) {
      const doc = profilesSnapshot.docs[0];
      return {
        exists: true,
        uid: doc.id,
        profile: doc.data(),
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error finding user by phone number:', error);
    throw new HttpsError('internal', 'Failed to check user existence');
  }
}

/**
 * Create a new Firebase Auth user
 * 
 * @param {string} phoneNumber - User's phone number
 * @param {string} [displayName] - User's display name
 * @returns {Promise<string>} - New user's UID
 */
async function createFirebaseAuthUser(phoneNumber, displayName) {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // Check if Firebase Auth user already exists with this phone
    try {
      const existingUser = await admin.auth().getUserByPhoneNumber(normalizedPhone);
      console.log('Firebase Auth user already exists:', existingUser.uid);
      return existingUser.uid;
    } catch (error) {
      // User doesn't exist in Firebase Auth, create new one
      if (error.code !== 'auth/user-not-found') {
        console.error('Error checking existing Firebase Auth user:', error);
        throw error;
      }
    }

    // Create new user - let Firebase generate UID automatically
    const userRecord = await admin.auth().createUser({
      phoneNumber: normalizedPhone,
      displayName: displayName || undefined,
      disabled: false,
    });

    console.log('Created new Firebase Auth user:', userRecord.uid);
    return userRecord.uid;
  } catch (error) {
    console.error('Error creating Firebase Auth user:', error);
    if (error.code === 'auth/phone-number-already-exists') {
      // Try to get existing user
      const existingUser = await admin.auth().getUserByPhoneNumber(normalizePhoneNumber(phoneNumber));
      return existingUser.uid;
    }
    throw new HttpsError('internal', 'Failed to create Firebase user');
  }
}

/**
 * Main Truecaller Authentication Cloud Function
 * 
 * SECURE FLOW - Phone number comes from Truecaller API, NOT from frontend:
 * 1. Frontend sends ONLY authorizationCode + codeVerifier (OAuth PKCE)
 * 2. Server exchanges code for access token
 * 3. Server fetches profile from Truecaller API (gets TRUSTED phone number)
 * 4. Finds or creates Firebase user using the TRUSTED phone number
 * 5. Generates Firebase Custom Auth Token
 * 
 * @function verifyTruecallerLogin
 */
exports.verifyTruecallerLogin = onCall(
  { 
    region: 'asia-south1',
    // Set memory and timeout for production
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const startTime = Date.now();
    console.log('🔐 Truecaller auth request received');

    try {
      const data = request.data || {};

      // 1. Validate required OAuth credentials ONLY
      // We do NOT accept phone number from frontend - it must come from Truecaller API
      const { authorizationCode, codeVerifier } = data;

      if (!authorizationCode || typeof authorizationCode !== 'string' || authorizationCode.trim().length === 0) {
        throw new HttpsError('invalid-argument', 'Authorization code is required');
      }

      if (!codeVerifier || typeof codeVerifier !== 'string' || codeVerifier.trim().length === 0) {
        throw new HttpsError('invalid-argument', 'Code verifier is required');
      }

      console.log('🔐 Step 1: Exchanging authorization code for access token...');
      
      // 2. Exchange authorization code for access token (OAuth 2.0 PKCE)
      const tokenResult = await exchangeCodeForToken(authorizationCode, codeVerifier);
      
      if (!tokenResult.success || !tokenResult.accessToken) {
        console.error('❌ Token exchange failed:', tokenResult.error);
        throw new HttpsError(
          'unauthenticated', 
          tokenResult.error || 'Failed to verify Truecaller credentials',
          { errorCode: 'TOKEN_EXCHANGE_FAILED' }
        );
      }

      console.log('🔐 Step 2: Fetching user profile from Truecaller API...');
      
      // 3. Fetch user profile from Truecaller API - this gives us TRUSTED data
      const profileResult = await fetchTruecallerProfile(tokenResult.accessToken);
      
      if (!profileResult.success || !profileResult.phoneNumber) {
        console.error('❌ Profile fetch failed:', profileResult.error);
        throw new HttpsError(
          'unauthenticated', 
          profileResult.error || 'Failed to get profile from Truecaller',
          { errorCode: 'PROFILE_FETCH_FAILED' }
        );
      }

      // TRUSTED phone number from Truecaller API (not from frontend!)
      const normalizedPhone = profileResult.phoneNumber;
      const firstName = profileResult.firstName || '';
      const lastName = profileResult.lastName || '';
      const email = profileResult.email;
      
      console.log('✅ Truecaller identity verified. Phone:', normalizedPhone);

      // 4. Check if user exists in Firestore
      const existingUser = await findUserByPhoneNumber(normalizedPhone);
      let uid;
      let isNewUser = false;

      if (existingUser.exists) {
        // User exists - use existing UID
        uid = existingUser.uid;
        console.log('👤 Existing user found:', uid);

        // Update last login timestamp
        await db.collection('profiles').doc(uid).update({
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch((err) => {
          console.warn('Failed to update lastLoginAt:', err.message);
        });

      } else {
        // New user - create Firebase Auth user
        isNewUser = true;
        const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
        uid = await createFirebaseAuthUser(normalizedPhone, displayName);
        console.log('🆕 New Firebase Auth user created:', uid);

        // Note: We do NOT create the Firestore profile here
        // The frontend will navigate to RoleSelection screen
        // and the onboarding flow will create the profile
        // This matches the existing OTP verification flow
      }

      // 5. Generate Firebase Custom Auth Token
      const customToken = await admin.auth().createCustomToken(uid, {
        phoneNumber: normalizedPhone,
        provider: 'truecaller',
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Truecaller auth completed in ${duration}ms. UID: ${uid}, isNewUser: ${isNewUser}`);

      // 6. Return success response
      return {
        success: true,
        firebaseCustomToken: customToken,
        uid: uid,
        isNewUser: isNewUser,
        phoneNumber: normalizedPhone,
        // Include Truecaller profile data for frontend to use during onboarding
        truecallerProfile: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email || null,
        },
      };

    } catch (error) {
      console.error('❌ Truecaller auth error:', error);

      // Re-throw HttpsError as-is
      if (error instanceof HttpsError) {
        throw error;
      }

      // Handle specific error cases
      if (error.code === 'auth/phone-number-already-exists') {
        throw new HttpsError(
          'already-exists',
          'A user with this phone number already exists',
          { errorCode: 'PHONE_NUMBER_EXISTS' }
        );
      }

      if (error.code === 'auth/invalid-phone-number') {
        throw new HttpsError(
          'invalid-argument',
          'Invalid phone number',
          { errorCode: 'INVALID_PHONE' }
        );
      }

      // Generic error
      throw new HttpsError(
        'internal',
        'Authentication failed. Please try again.',
        { errorCode: 'INTERNAL_ERROR' }
      );
    }
  }
);

/**
 * Helper function to get user UID by phone number
 * Can be used by other functions if needed
 * 
 * @function getUserByPhone
 */
exports.getUserByPhone = onCall(
  { region: 'asia-south1' },
  async (request) => {
    // Require authentication to prevent user enumeration
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { phoneNumber } = request.data || {};

    if (!phoneNumber) {
      throw new HttpsError('invalid-argument', 'Phone number is required');
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const result = await findUserByPhoneNumber(normalizedPhone);

    return {
      exists: result.exists,
      uid: result.uid || null,
      hasProfile: result.exists && result.profile?.isProfileComplete === true,
      userRole: result.profile?.userRole || null,
    };
  }
);
