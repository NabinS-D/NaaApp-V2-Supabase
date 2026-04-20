# Supabase Migration Guide for NaaApp

## Prerequisites

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your Project URL and API Keys

2. **Set up Database Schema**
   - Go to your Supabase dashboard → SQL Editor
   - Copy and paste the entire content from `database_schema.sql`
   - Run the SQL to create tables, policies, and triggers

3. **Update Environment Variables**
   - Replace the placeholder values in your `.env` file:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## Migration Steps

### Step 1: Update API Imports
Replace your existing API imports in components with the new Supabase versions:

**Before (Appwrite):**
```javascript
import { createUser, signIn, getCurrentUser } from '../lib/APIs/UserApi';
import { addExpenses, fetchAllExpenses } from '../lib/APIs/ExpenseApi';
import { fetchAllCategories, addaCategory } from '../lib/APIs/CategoryApi';
```

**After (Supabase):**
```javascript
import { createUser, signIn, getCurrentUser } from '../lib/APIs/UserApiSupabase';
import { addExpenses, fetchAllExpenses } from '../lib/APIs/ExpenseApiSupabase';
import { fetchAllCategories, addaCategory } from '../lib/APIs/CategoryApiSupabase';
```

### Step 2: Update Authentication Context
Update your `GlobalProvider.js` to use Supabase auth state:

```javascript
import { supabase } from '../lib/supabase';

// Listen to auth changes
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // User signed in
        setUser(session.user);
        setIsLogged(true);
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        setUser(null);
        setIsLogged(false);
      }
    }
  );

  return () => subscription?.unsubscribe();
}, []);
```

### Step 3: Key Differences to Note

#### Authentication
- **Appwrite**: `account.createEmailPasswordSession()`
- **Supabase**: `supabase.auth.signInWithPassword()`

#### Database Queries
- **Appwrite**: `databases.listDocuments()` with `Query.equal()`
- **Supabase**: `supabase.from('table').select().eq()`

#### File Storage
- **Appwrite**: `storage.createFile()` returns file ID
- **Supabase**: `storage.upload()` returns path, use `getPublicUrl()` for URL

#### User IDs
- **Appwrite**: Custom document IDs
- **Supabase**: Uses auth.users.id (UUID format)

### Step 4: Data Migration (Optional)
If you have existing data in Appwrite, you'll need to:
1. Export data from Appwrite
2. Transform the data format
3. Import into Supabase using the bulk import functions

### Step 5: Testing Checklist
- [ ] User registration works
- [ ] User login works
- [ ] Profile picture upload works
- [ ] Expense creation works
- [ ] Expense listing works
- [ ] Category management works
- [ ] CSV import works (if implemented)
- [ ] OneSignal notifications still work

## Rollback Plan
If you need to rollback to Appwrite:
1. Rename current API files back
2. Restore original `.env` variables
3. Update imports back to original API files

## Benefits of Supabase Migration
- **No resource limits** on free tier for your use case
- **Better performance** with PostgreSQL
- **Real-time subscriptions** built-in
- **Row Level Security** for better data protection
- **Larger file storage** limits
- **Better developer experience** with SQL

## Support
- Supabase Documentation: https://supabase.com/docs
- PostgreSQL Documentation: https://www.postgresql.org/docs/
