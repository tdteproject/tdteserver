# Supabase & Prisma Management Guide

This project uses **Supabase** as the database and storage provider, with **Prisma** as the Object-Relational Mapper (ORM). This guide explains how to manage your database, update schemas, and interact with the data.

## 1. Core Architecture
- **Prisma Client**: Used in the Node.js code to read/write data.
- **Supabase Postgres**: The actual database hosted in the cloud.
- **Prisma Migrations**: Tracks every change to your database schema in `prisma/migrations`.

---

## 2. Essential Commands

Run these commands inside the `PDT_backend` directory.

### Updating the Schema
When you want to add a new column, table, or relation:
1. Modify `prisma/schema.prisma`.
2. Run:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```
   *This generates a new migration file and applies it to your development database.*

### Deploying to Production
If you have new migrations that need to be applied to the cloud database without resetting it:
```bash
npm run db:deploy
# or
npx prisma migrate deploy
```

### Exploring Data (Prisma Studio)
To view and edit your data in a browser-based UI:
```bash
npm run db:studio
# or
npx prisma studio
```
*Opens a GUI at http://localhost:5555*

### Regenerating Prisma Client
If you change the schema but don't see the new fields in your JS code:
```bash
npm run db:generate
```

---

## 3. Database Maintenance

### Connection Verification
Check if your backend can actually talk to Supabase:
```bash
npm run db:verify
```

### Preflight Config Check
Verify that all required environment variables are set correctly:
```bash
npm run supabase:preflight
```

---

## 4. Supabase Dashboard Tips

You can also manage your database directly via the [Supabase Dashboard](https://supabase.com/dashboard):

- **SQL Editor**: Best for running one-off queries or checking database performance.
- **Table Editor**: Good for quick visual inspection of rows (similar to Prisma Studio).
- **Storage**: Manage your `health-records` and `profile-pictures` buckets. You can manually delete or inspect files here.
- **Settings -> API**: Where you find your `DATABASE_URL`, `SUPABASE_URL`, and keys.

---

## 5. Important Environment Variables

In your `.env` file:
- `DATABASE_URL`: The **Pooler** connection string (Port 6543). Use this for app traffic to handle many concurrent users.
- `DIRECT_URL`: The **Direct** connection string (Port 5432). Use this for migrations (`prisma migrate`).
- `STORAGE_PROVIDER`: Must be set to `supabase` to use cloud storage.

---

## 6. Future-Proofing & Scaling
- **Migrations are History**: Never delete the `prisma/migrations` folder. It is the only way to replicate your database state reliably.
- **Backups**: Supabase performs daily backups automatically.
- **Indexes**: If your app gets slow, you can add `@@index` or `@unique` in `schema.prisma` and run a migration.
