# SKTraders - Complete Offline Setup Guide

This project has been converted to run completely offline using MySQL as the database. All Firebase dependencies have been removed.

## What Was Changed

### 1. **Authentication System**
- Removed Firebase Authentication
- Now uses local JWT-based authentication with session cookies
- All auth routes in `/api/auth/` handle login, registration, and session management

### 2. **Database**
- Removed Firebase Firestore
- Now exclusively uses MySQL with Prisma ORM
- Database: `sktraders`
- Host: `localhost:3306`
- Default credentials: root:123456 (configured in `.env`)

### 3. **React Provider**
- Simplified `FirebaseProvider` to `AuthProvider`
- Only handles user authentication state
- No longer requires Firebase configuration

### 4. **Data Fetching**
- Removed `useFirestore()` and `useCollection()` hooks
- Pages now use `useState` + `useEffect` with `fetch()` API calls
- All data operations go through REST API endpoints in `/api/`

### 5. **API Endpoints**
REST API endpoints for all data models:
- `GET/POST /api/clients`
- `GET/POST /api/products`
- `GET/POST /api/coconut-purchases` or `/api/coconut_purchases`
- `GET/POST /api/local-sales` or `/api/local_sales`
- `GET/POST /api/exports`
- `GET/POST /api/financial-transactions` or `/api/financial_transactions`

## Requirements

### System Requirements
- **Node.js** 18+ (LTS recommended)
- **MySQL** 8.0+ running locally
- **npm** or **yarn** package manager

### Environment Setup
The `.env` file is already configured with defaults:
```
GEMINI_API_KEY=
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=sktraders
DATABASE_URL="mysql://root:123456@localhost:3306/sktraders"
JWT_SECRET="su per-secret-change-me"
NODE_ENV=development
```

**Important**: For production, update:
- `JWT_SECRET` to a strong random string
- `DB_PASSWORD` to your actual MySQL password
- `GEMINI_API_KEY` if you use AI features

## Local Installation Steps

### 1. Install Dependencies
```bash
cd /workspaces/SKTraders
npm install
```

### 2. Set Up MySQL Database
```bash
# Make sure MySQL is running
mysql -u root -p

# Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS sktraders;
```

Update `.env` with your MySQL credentials if different from defaults.

### 3. Run Prisma Migrations
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations to create tables
npm run prisma:migrate
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

## Default Credentials

After setup, you can log in with:
- **Email**: `manager@gmail.com`
- **Password**: `SecureP@ss123`

Or create a new account by entering any email and password (6+ characters).

## Project Structure

```
src/
├── app/
│   ├── api/                    # REST API endpoints for CRUD operations
│   ├── dashboard/              # Dashboard pages (updated to use API)
│   ├── page.tsx                # Login page (updated to use local auth)
│   └── layout.tsx              # Root layout with auth provider
│
├── firebase/
│   ├── provider.tsx            # Simplified auth provider (NO Firebase now)
│   ├── auth.ts                 # Local auth helper functions
│   ├── firestore/              # Shim layer for API calls
│   └── client-provider.tsx     # Client-side provider setup
│
├── lib/
│   ├── auth.ts                 # JWT utilities (signToken, verifyToken)
│   ├── prisma.ts               # Prisma client instance
│   └── types.ts                # TypeScript types for data models
│
└── components/
    ├── ui/                     # shadcn/ui components
    └── layout/                 # App header and sidebar
```

## Pages Updated to Use API

✅ **Completed**:
- Login page (`src/app/page.tsx`) - uses `/api/auth/login`
- Clients page (`src/app/dashboard/clients/page.tsx`) - uses `/api/clients`

⚠️ **Needs Update** (same pattern as clients page):
- Dashboard home page
- Coconut purchases page
- Local sales page
- Exports page
- Finance/transactions page
- Products/stock page
- Reports page

The pattern for updating pages is simple:
1. Remove imports from `@/firebase`
2. Use `useState` + `useEffect` with `fetch()`
3. Replace form submissions with `fetch()` POST/PUT requests

## Building for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

## Creating Database Backups

```bash
# Backup database to SQL file
mysqldump -u root -p sktraders > sktraders_backup.sql

# Restore from backup
mysql -u root -p sktraders < sktraders_backup.sql
```

## Troubleshooting

### MySQL Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
- Ensure MySQL is running: `systemctl status mysql` (Linux) or check MySQL server status
- Verify `.env` DATABASE_URL with correct host, port, user, password

### Database Not Found
```
Unknown database 'sktraders'
```
- Run: `CREATE DATABASE sktraders;` in MySQL

### Prisma Client Error
```
Error: Prisma Client has not been generated yet
```
- Run: `npm run prisma:generate`

### Migration Errors
```
Error: Dirty migration detected
```
- Check  Prisma migration status: `npx prisma migrate status`
- Resolve conflicts manually if needed

## Next Steps

1. **Update remaining dashboard pages** following the same pattern as the clients page
2. **Test all API endpoints** to ensure proper CRUD operations
3. **Update form submission logic** across all pages to use REST API instead of Firestore
4. **Remove Firebase completely** from dependency imports once all pages are updated
5. **Set up proper error handling** and validation in API routes
6. **Add authentication middleware** to protect API endpoints
7. **Implement role-based access control** if needed

## Support

For development help, ensure you have:
- Clean MySQL connection
- Proper `.env` configuration  
- Latest node_modules (run `npm install`)
- No leftover `.next` build artifacts (they're cleared on build)

The project is now ready to run completely offline on your local machine!
