# Work Desk - Arham IT Solutions

A full-stack multi-tenant web application combining React frontend with Express.js backend for workforce management and face recognition capabilities.

## Project Overview

Work Desk is a comprehensive application designed for managing workspace operations with integrated face recognition technology. The platform leverages modern technologies to provide a seamless user experience for employee management, attendance tracking, and HR operations.

## Language Composition

This project is built primarily with:
- **JavaScript** - 80.5%
- **CSS** - 19.5%

## Tech Stack

### Frontend & Super Admin
- **React 18.2** - UI library
- **Vite** - Fast build tool and dev server
- **Axios** - HTTP client
- **React Router** - Client-side routing
- **Face-API.js** - Face detection and recognition
- **html2canvas** - Screenshot capability
- **jsPDF** - PDF generation
- **XLSX** - Excel file handling
- **React Icons** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL2** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **TensorFlow.js** - Machine learning
- **Face-API.js** - Face recognition
- **Multer** - File uploads
- **PDFKit** - PDF generation
- **Node Cron** - Scheduled tasks

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **MySQL** (v8 or higher)
- **Git**

## Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/aniruddha-aits/work-desk.git
cd work-desk
```

### 2. Database Setup

Start MySQL and create the database:
```sql
CREATE DATABASE aits;
```

### 3. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=aits
DB_PORT=3306
JWT_SECRET=your_jwt_secret
NODE_ENV=development
PORT=5000
```

Start the backend server:
```bash
npm run dev
```

The backend will run on **http://localhost:5000**

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:
```env
# For local development, comment this out or set to localhost:
# VITE_API_BASE_URL=http://localhost:5000

# For production (when deploying to server):
VITE_API_BASE_URL=https://api.work-desk.tech
```

> **Note:** If `VITE_API_BASE_URL` is not set, the app automatically falls back to `http://localhost:5000`.

Start the development server:
```bash
npm run dev
```

The frontend will run on **http://localhost:5173**

### 5. Super Admin Setup

```bash
cd super-admin
npm install
```

Create a `.env` file in the `super-admin/` directory:
```env
# For local development, comment this out or set to localhost:
# VITE_API_BASE_URL=http://localhost:5000

# For production (when deploying to server):
VITE_API_BASE_URL=https://api.work-desk.tech
```

> **Note:** Same fallback logic as frontend — defaults to `http://localhost:5000` if not set.

Start the development server:
```bash
npm run dev
```

The super admin panel will run on **http://localhost:5174**

## Environment Variables Summary

| App | File | Variable | Local Value | Production Value |
|-----|------|----------|-------------|------------------|
| Backend | `backend/.env` | `PORT` | `5000` | `5000` |
| Backend | `backend/.env` | `DB_HOST` | `localhost` | your DB host |
| Backend | `backend/.env` | `DB_USER` | `root` | your DB user |
| Backend | `backend/.env` | `DB_PASSWORD` | your password | your DB password |
| Backend | `backend/.env` | `DB_NAME` | `aits` | `aits` |
| Backend | `backend/.env` | `DB_PORT` | `3306` | `3306` |
| Backend | `backend/.env` | `JWT_SECRET` | any string | a strong secret |
| Frontend | `frontend/.env` | `VITE_API_BASE_URL` | _(comment out)_ | `https://api.work-desk.tech` |
| Super Admin | `super-admin/.env` | `VITE_API_BASE_URL` | _(comment out)_ | `https://api.work-desk.tech` |

## Production Domains

| Service | Domain |
|---------|--------|
| Backend API | `https://api.work-desk.tech` |
| Frontend | `https://work-desk.tech` |
| Super Admin | `https://admin.work-desk.tech` |

## Project Structure

```
work-desk/
├── frontend/
│   ├── src/              # React components and pages
│   ├── public/           # Static assets
│   ├── .env              # Frontend environment variables
│   ├── package.json      # Frontend dependencies
│   ├── vite.config.js    # Vite configuration
│   └── index.html        # Main HTML file
├── backend/
│   ├── config/           # Database configuration
│   ├── controllers/      # Route controllers
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── cron/             # Scheduled tasks
│   ├── .env              # Backend environment variables
│   ├── server.js         # Entry point
│   └── package.json      # Backend dependencies
├── super-admin/
│   ├── src/              # Super admin React app
│   ├── .env              # Super admin environment variables
│   ├── package.json      # Super admin dependencies
│   └── vite.config.js    # Vite configuration
└── README.md             # This file
```

## Available Scripts

### Frontend / Super Admin
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend
- `npm run dev` - Start with nodemon (auto-reload)
- `npm start` - Start production server
- `npm run build` - Build for production

## Running the Application

1. Start MySQL database

2. **Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

3. **Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

4. **Terminal 3 - Super Admin (optional):**
```bash
cd super-admin
npm run dev
```

5. Access the applications:
   - **Frontend:** http://localhost:5173
   - **Super Admin:** http://localhost:5174
   - **Backend API:** http://localhost:5000/api/health

## Default Credentials

### Tenant Admin (Development)
- **Email:** admin@arhamitsolutions.com
- **Password:** Admin123!

### Super Admin
- **Email:** superadmin@workdesk.com
- **Password:** superadmin123

> ⚠️ **Important:** Change these credentials in production!

## Features

- ✅ Multi-tenant architecture
- ✅ User authentication with JWT
- ✅ Face recognition and detection
- ✅ Document export (PDF, Excel)
- ✅ Company branding configuration
- ✅ HR document generation (Offer letters, Experience letters, Increment letters, Resignation letters, Salary slips)
- ✅ Employee attendance management
- ✅ Leave management
- ✅ Project and task management
- ✅ Dashboard analytics
- ✅ Scheduled cron jobs
- ✅ Responsive UI with React
- ✅ RESTful API architecture
- ✅ Super Admin panel for tenant management

## Troubleshooting

### Port Already in Use

If port 5000 or 5173 is already in use:
- **Backend:** Change `PORT` in `backend/.env`
- **Frontend:** Run with custom port: `npm run dev -- --port 3001`
- **Super Admin:** Change port in `super-admin/vite.config.js`

### MySQL Connection Error

- Verify MySQL is running
- Check `backend/.env` database credentials match exactly: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- Ensure the `aits` database exists

### API Not Connecting

- Make sure the backend is running on port **5000**
- For local dev, comment out or remove `VITE_API_BASE_URL` from `.env` so it falls back to `http://localhost:5000`
- For production, ensure `VITE_API_BASE_URL=https://api.work-desk.tech` is set before building

### Module Not Found

Clear `node_modules` and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Contributing

Contributions are welcome! Please follow the project structure and coding standards established in the repository.

## License

This project is proprietary and maintained by Arham IT Solutions.
