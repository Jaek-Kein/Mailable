# Database Migration Required

The authentication issue is caused by a mismatch between the NextAuth configuration and the database schema. I've fixed the configuration, but you need to run a database migration to update the User model.

## Steps to Fix:

1. **Generate and run the migration:**
   ```bash
   npx prisma migrate dev --name update-user-model-for-nextauth
   ```

2. **Generate the Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

## What was changed:

1. **Auth Configuration**: Changed from JWT to database session strategy (required when using Prisma adapter)
2. **User Model**: Updated to include NextAuth required fields:
   - `emailVerified` field for email verification
   - `image` field for profile pictures
   - `updatedAt` field for tracking changes
   - Made `name` optional (some OAuth providers don't provide names)
   - Changed ID generation from `uuid()` to `cuid()` for consistency

3. **Error Handling**: Added better error messages and loading states to the login page

4. **Login Page**: Enhanced with proper error display and better styling

After running these commands, the "Try signing in with a different account" error should be resolved.