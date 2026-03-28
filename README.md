# SKTraders - Coconut Trading Management System

A complete offline coconut husk processing and export management system. Built with Next.js, MySQL, and React - **no Firebase required**.

## 🎯 Features

✅ **Complete Offline** - Runs entirely on your local machine  
✅ **MySQL Database** - All data stored locally  
✅ **User Authentication** - JWT-based login system  
✅ **Client Management** - Track clients and their purchase history  
✅ **Inventory Management** - Monitor coconut husk stocks  
✅ **Sales Tracking** - Record local and export sales  
✅ **Financial Reports** - Track income, expenses, and profit  
✅ **Responsive UI** - Works on desktop and mobile  

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **MySQL** 8.0+ (install from https://dev.mysql.com/downloads/)
- **npm** or **yarn** package manager

### Installation (5 minutes)

#### 1️⃣ Clone and Install
```bash
cd SKTraders
npm install
```

#### 2️⃣ Set Up MySQL Database
```bash
# Start MySQL
mysql -u root -p

# Create database
CREATE DATABASE sktraders;
EXIT;
```

#### 3️⃣ Configure Environment
`.env` is already configured with defaults:
```
DATABASE_URL="mysql://root:123456@localhost:3306/sktraders"
JWT_SECRET="super-secret-change-me"
NODE_ENV=development
```

**Change if your MySQL password differs:**
```
DB_PASSWORD=your_password
DATABASE_URL="mysql://root:your_password@localhost:3306/sktraders"
```

#### 4️⃣ Set Up Database Schema
```bash
npm run prisma:generate
npm run prisma:migrate
```

#### 5️⃣ Start the Application
```bash
npm run dev
```

**Open browser:** http://localhost:3000

#### 6ï¸âƒ£ Load Dummy Test Data (Optional)
```bash
npm run seed:dummy
```

This clears the current business data and loads sample records for testing.

### 🔑 Default Login Credentials
```
Email: manager@gmail.com
Password: SecureP@ss123
```

Or create a new account with any email and password (6+ characters).

---

## 📁 Project Structure

```
SKTraders/
├── src/
│   ├── app/
│   │   ├── api/                      # REST API endpoints
│   │   │   ├── auth/                 # Login, register, logout
│   │   │   ├── clients/              # Client management
│   │   │   ├── products/             # Stock management
│   │   │   ├── coconut-purchases/    # Purchase tracking
│   │   │   ├── local-sales/          # Local sales
│   │   │   ├── exports/              # Export tracking
│   │   │   └── financial-transactions/ # Finance tracking
│   │   ├── dashboard/                # Main application pages
│   │   ├── page.tsx                  # Login page
│   │   └── layout.tsx                # Root layout
│   ├── firebase/
│   │   ├── provider.tsx              # Auth context provider
│   │   ├── auth.ts                   # Auth utilities
│   │   └── firestore/                # API shim layer
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   └── layout/                   # Header, sidebar
│   └── lib/
│       ├── auth.ts                   # JWT utilities
│       ├── prisma.ts                 # Database client
│       └── types.ts                  # TypeScript types
├── prisma/
│   └── schema.prisma                 # Database schema
├── .env                              # Environment variables
├── package.json
└── README.md
```

---

## 🛠️ Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Load dummy test data
npm run seed:dummy

# Open database viewer
npx prisma studio

# Run TypeScript type check
npm run typecheck

# Run linter
npm run lint
```

---

## 📊 API Endpoints

All endpoints use REST with JSON. Authentication via HTTP-only cookies.

### Authentication
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user |

### Clients
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Create client |
| PATCH | `/api/clients/{id}` | Update client |
| DELETE | `/api/clients/{id}` | Delete client |

### Products
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product |
| PATCH | `/api/products/{id}` | Update product |

### Sales & Purchases
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/coconut-purchases` | List purchases |
| POST | `/api/coconut-purchases` | Create purchase |
| GET | `/api/local-sales` | List sales |
| POST | `/api/local-sales` | Create sale |
| GET | `/api/exports` | List exports |
| POST | `/api/exports` | Create export |

### Finance
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/financial-transactions` | List transactions |
| POST | `/api/financial-transactions` | Create transaction |

---

## 🔧 Database Management

### View Database in Browser
```bash
npx prisma studio
```
Opens at http://localhost:5555

### Access MySQL Directly
```bash
mysql -u root -p sktraders

# View users
SELECT * FROM User;

# View clients
SELECT * FROM Client;

# View sales
SELECT * FROM LocalSale;
```

### Backup Database
```bash
mysqldump -u root -p sktraders > backup.sql
```

### Restore Database
```bash
mysql -u root -p sktraders < backup.sql
```

---

## 🐛 Troubleshooting

### Issue: `Error: connect ECONNREFUSED 127.0.0.1:3306`
**Solution:** MySQL is not running
```bash
# Linux/Mac
brew services start mysql

# Windows
# Start MySQL from Services or use: mysql --console
```

### Issue: `Unknown database 'sktraders'`
**Solution:** Create the database
```bash
mysql -u root -p
CREATE DATABASE sktraders;
EXIT;
```

### Issue: `Prisma Client not generated`
**Solution:** Generate it
```bash
npm run prisma:generate
```

### Issue: `Access denied for user 'root'@'localhost'`
**Solution:** Check MySQL password in `.env` matches your MySQL setup

### Issue: `Port 3000 is already in use`
**Solution:** Use a different port
```bash
npm run dev -- -p 3001
```

---

## 📝 Configuration

### Change MySQL Password
Edit `.env`:
```
DB_PASSWORD=your_new_password
DATABASE_URL="mysql://root:your_new_password@localhost:3306/sktraders"
```

### Change JWT Secret
Edit `.env` (DO THIS FOR PRODUCTION):
```
JWT_SECRET="your-super-secret-key-min-32-chars"
```

### Enable AI Features (Optional)
Get free API key from: https://ai.google.dev
```
GEMINI_API_KEY=your_key_here
```

---

## 🚢 Production Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment for Production
```env
NODE_ENV=production
JWT_SECRET=your-very-secure-random-string-here
DATABASE_URL=mysql://user:password@prod-db-host:3306/sktraders
```

---

## 📚 Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Database**: MySQL 8.0, Prisma ORM
- **Authentication**: JWT + HTTP-only Cookies
- **Styling**: Tailwind CSS, shadcn/ui
- **Charts**: Recharts
- **State Management**: React Hooks (useState, useContext)

---

## 📄 Documentation Files

- **[OFFLINE_SETUP.md](./OFFLINE_SETUP.md)** - Detailed offline setup guide
- **[MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md)** - Firebase to offline migration details
- **[docs/blueprint.md](./docs/blueprint.md)** - System architecture
- **[docs/backend.json](./docs/backend.json)** - API documentation

---

## 🤝 Contributing

This is a self-contained project. Feel free to modify:
- Add new API endpoints in `src/app/api/`
- Create new dashboard pages in `src/app/dashboard/`
- Update database schema in `prisma/schema.prisma`

All changes are tracked in git.

---

## ✨ Next Steps

1. **Login** to the application
2. **Add clients** from the Clients page
3. **Record purchases** from Coconut Purchases
4. **Track sales** from Local Sales or Exports
5. **Monitor finances** from the Finance dashboard
6. **Export reports** as PDF

---

## 📧 Support

For issues or questions:
1. Check [OFFLINE_SETUP.md](./OFFLINE_SETUP.md) for detailed guide
2. Review [MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md) for architecture changes
3. Check error logs in console (development mode)
4. Verify MySQL is running and database exists

---

**Ready to run?** Type `npm run dev` and visit http://localhost:3000! 🎉
