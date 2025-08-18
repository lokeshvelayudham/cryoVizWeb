# Vercel Deployment Guide - CryoViz Web

## Critical Environment Variables for Vercel

### 1. NextAuth Configuration
```bash
NEXTAUTH_SECRET=your-secret-here-32-chars-min
NEXTAUTH_URL=https://your-domain.vercel.app
```

**Important:** 
- `NEXTAUTH_SECRET` must be at least 32 characters long
- `NEXTAUTH_URL` must match your exact Vercel deployment URL

### 2. MongoDB Connection
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

### 3. Email Configuration (for OTP)
```bash
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

## Vercel Deployment Steps

1. **Set Environment Variables in Vercel Dashboard:**
   - Go to your project in Vercel Dashboard
   - Navigate to Settings > Environment Variables
   - Add all the above variables
   - Make sure to set them for Production, Preview, and Development environments

2. **Generate NEXTAUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

3. **Configure MongoDB:**
   - Ensure your MongoDB cluster allows connections from `0.0.0.0/0` (all IPs)
   - Or add Vercel's IP ranges to your allowlist

4. **Email Setup (Gmail example):**
   - Enable 2FA on your Gmail account
   - Generate an App Password
   - Use the App Password as `EMAIL_SERVER_PASSWORD`

## Common Issues Fixed

### ✅ Session Timeout Issues
- Changed session `maxAge` from 30 minutes to 7 days
- Added proper cookie configuration for production

### ✅ Cookie Security
- Implemented `__Secure-` prefix for production cookies
- Added proper `sameSite` and `secure` flags

### ✅ Redirect Loops
- Added proper callback configuration
- Implemented secure redirect handling
- Fixed session provider setup

### ✅ Type Safety
- Added proper TypeScript declarations for NextAuth
- Extended session and user types with `accessLevel`

## Testing the Deployment

1. **After deployment, test:**
   - Navigate to your Vercel URL
   - Try the login flow
   - Verify OTP email delivery
   - Check session persistence

2. **Debug if issues persist:**
   - Check Vercel Function logs
   - Verify all environment variables are set
   - Test MongoDB connection
   - Confirm email configuration

## Additional Vercel Configuration

Add to your `next.config.ts` if not already present:

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
  },
  images: {
    domains: ['your-domain.com'],
  },
};

export default nextConfig;
```

## Security Notes

- Never commit `.env.local` to git
- Use Vercel's environment variables for all sensitive data
- Regularly rotate your `NEXTAUTH_SECRET`
- Monitor authentication logs for suspicious activity
