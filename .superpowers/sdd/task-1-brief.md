### Task 1: Supabase client & DB Schema Migration

**Files:**
- Create: `lib/supabase.ts`
- Create: `supabase/migrations/20260705_init_schema.sql`

**Interfaces:**
- Produces: `supabase` client for DB communication

- [ ] **Step 1: Install Supabase JS Client library**
  Run: `pnpm add @supabase/supabase-js`
  Expected: Installation finishes successfully and package.json is updated.

- [ ] **Step 2: Create Supabase connection file**
  Create file: `lib/supabase.ts`
  ```typescript
  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  ```

- [ ] **Step 3: Create SQL migration file**
  Create file: `supabase/migrations/20260705_init_schema.sql`
  ```sql
  -- Create employees table
  CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL, -- SHA-256 hash representation of 6-digit PIN
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create tables table
  CREATE TABLE IF NOT EXISTS tables (
    id INT PRIMARY KEY, -- Table number 1, 2, 3, 4
    status VARCHAR(20) NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'checking_out')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Insert seed data
  INSERT INTO employees (name, pin_hash, role) VALUES 
  ('Pee Pee (Owner)', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'owner'), -- Raw PIN representation for demo
  ('Best (Staff)', '8d969ee76d243c53b6b3061467aa3b8d30c441408eb39af7194b14091118366d', 'staff');

  INSERT INTO tables (id, status) VALUES 
  (1, 'vacant'),
  (2, 'vacant'),
  (3, 'vacant'),
  (4, 'vacant')
  ON CONFLICT (id) DO NOTHING;
  ```

- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git add lib/supabase.ts supabase/migrations/20260705_init_schema.sql
  git commit -m "feat: setup supabase client connection and DB migrations"
  ```
