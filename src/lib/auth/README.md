# Authentication Architecture

This application uses **custom JWT-based authentication**, not Convex Auth.

## Authentication System

### Core Components

1. **`jwt-secret.ts`** - Centralized JWT secret management
2. **`session-manager.ts`** - Session token creation and cookie management
3. **`password-utils.ts`** - Password hashing and validation
4. **`convex-client.ts`** - Singleton Convex HTTP client
5. **`google-oauth.ts`** - Google OAuth flow implementation

### Authentication Methods

1. **Email/Password** - Traditional login with bcrypt password hashing
2. **Google OAuth** - Social authentication via Google
3. **Password Reset** - Secure token-based password reset flow

### Session Management

- **Cookie Name**: `session_token`
- **Storage**: HTTP-only, secure cookies
- **Duration**: 30 days
- **Domain**: `.stepperslife.com` (production) or undefined (localhost)
- **Token Format**: JWT with HS256 algorithm

### JWT Token Structure

```typescript
{
  userId: string,
  email: string,
  name: string,
  role: string, // "user", "organizer", "staff", "admin"
  iat: number,  // issued at
  exp: number   // expiration (30 days)
}
```

## API Routes

### Auth Endpoints

- `POST /api/auth/login` - Email/password login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/callback/google` - OAuth callback handler
- `GET /api/auth/google` - OAuth flow initiator
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/convex-token` - Exchange session for Convex token
- `GET /api/auth/me` - Get current user info

## Security Features

### Password Security
- **Algorithm**: bcrypt with 10 salt rounds
- **Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number

### Token Security
- **Storage**: Database with SHA-256 hashing
- **Expiration**: 1 hour (password reset)
- **CSRF Protection**: State parameter in OAuth flow
- **User Enumeration Prevention**: Consistent responses for invalid emails

### Cookie Security
- **HttpOnly**: true (prevents XSS access)
- **Secure**: true in production (HTTPS only)
- **SameSite**: "lax" (CSRF protection)
- **Domain**: Wildcard subdomain support (`.stepperslife.com`)

## Migration Notes

### Recent Consolidation (2025-01)

The auth system was recently refactored to eliminate code duplication:

**Before:**
- Cookie setting logic duplicated in 3+ files
- JWT creation duplicated in 3+ files
- Password hashing duplicated in 2+ files
- Domain hardcoded in 10+ files

**After:**
- Single source of truth in utility modules
- Consistent cookie/token handling across all routes
- Centralized domain configuration
- ~500-800 lines of duplicate code eliminated

### Why NOT Convex Auth?

This application uses custom JWT authentication instead of `@convex-dev/auth` because:

1. **Custom Requirements**: Need for multiple auth methods (OAuth, password)
2. **Fine-grained Control**: Custom token structure and session management
3. **Integration**: Seamless integration with existing Next.js API routes
4. **Flexibility**: Easy to extend for future auth methods

If you see references to Convex Auth in documentation, they are outdated and should be ignored.

## Usage Examples

### Creating a Session (Login/OAuth)

```typescript
import { createAndSetSession } from "@/lib/auth/session-manager";

const response = NextResponse.json({ success: true });
await createAndSetSession(
  response,
  {
    userId: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
  },
  request
);
return response;
```

### Clearing a Session (Logout)

```typescript
import { clearSessionCookies } from "@/lib/auth/session-manager";

const response = NextResponse.json({ success: true });
clearSessionCookies(response, request);
return response;
```

### Password Operations

```typescript
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength
} from "@/lib/auth/password-utils";

// Registration
const validation = validatePasswordStrength(password);
if (!validation.valid) {
  return NextResponse.json({ error: validation.error }, { status: 400 });
}
const hashedPassword = await hashPassword(password);

// Login
const isValid = await verifyPassword(password, user.passwordHash);
```

### Domain/URL Configuration

```typescript
import { getBaseUrl, APP_CONFIG } from "@/lib/constants/app-config";

// Get full base URL (respects forwarded headers)
const baseUrl = getBaseUrl(request);
const resetUrl = `${baseUrl}/reset-password?token=${token}`;

// Access domain directly
const domain = APP_CONFIG.DOMAIN; // "events.stepperslife.com"
```

## Environment Variables

Required environment variables:

```bash
# JWT Secret (REQUIRED)
JWT_SECRET=your-secret-here
# OR
AUTH_SECRET=your-secret-here
# OR
NEXTAUTH_SECRET=your-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Email (Postal - self-hosted at postal.toolboxhosting.com)
POSTAL_API_KEY=your-postal-api-key
POSTAL_API_URL=https://postal.toolboxhosting.com

# Application Domain (optional, defaults shown)
NEXT_PUBLIC_APP_DOMAIN=events.stepperslife.com
NEXT_PUBLIC_COOKIE_DOMAIN=.stepperslife.com
```

## Troubleshooting

### "Invalid session" errors
- Check that `JWT_SECRET` is set consistently across all environments
- Verify cookies are being set with correct domain
- Ensure token hasn't expired (30 days max)

### OAuth callback fails
- Verify Google OAuth credentials are correct
- Check that callback URL is whitelisted in Google Console
- Ensure `oauth_state` cookie is being set and matches

### Password reset not working
- Verify `POSTAL_API_KEY` is set
- Check that reset token hasn't expired (1 hour)
- Ensure database has `passwordResetToken` and `passwordResetExpiry` fields

## Related Files

- `/app/api/auth/*` - Auth API routes
- `/convex/auth/mutations.ts` - Auth-related Convex mutations
- `/convex/users/queries.ts` - User lookup queries
- `/middleware.ts` - Route protection middleware
