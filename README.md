# MediBridge — Full-Stack Healthcare Platform

MediBridge is a modern healthcare web platform designed to bring **Patients**, **Doctors**, and **Pharmacies** together into one seamless digital care journey.

Instead of juggling different tools, patients can easily find doctors, book appointments, join private in-browser video calls, receive digital prescriptions, and order their prescribed medicines online. Doctors get a dedicated clinical dashboard to conduct consultations and issue official printable prescriptions, while pharmacies manage multi-batch medicine stocks with built-in safeguards that automatically block expired medicines from ever reaching patients.

**Live Demo Video:** [Watch Demonstration on Google Drive](https://drive.google.com/drive/folders/1o4NAnWiAx5_VFwfowQMyq1CAp423WQTS?usp=drive_link)

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Technology Stack](#technology-stack)
- [Environment Configuration](#environment-configuration)
- [Project Architecture](#project-architecture)
- [Core Features & How They Work](#core-features--how-they-work)
  - [1. Multi-Role Portals & Smart Authentication](#1-multi-role-portals--smart-authentication)
  - [2. Doctor Directory & Appointment Booking](#2-doctor-directory--appointment-booking)
  - [3. In-Browser Telehealth Video Consultations](#3-in-browser-telehealth-video-consultations)
  - [4. Digital Prescriptions & Printable Clinic Letterhead](#4-digital-prescriptions--printable-clinic-letterhead)
  - [5. Multi-Batch Pharmacy Inventory & Expiry Safeguards](#5-multi-batch-pharmacy-inventory--expiry-safeguards)
  - [6. Medicine Catalog & Smart Image Uploads](#6-medicine-catalog--smart-image-uploads)
  - [7. Shopping Cart & Razorpay Test Payments](#7-shopping-cart--razorpay-test-payments)
  - [8. Tripartite Medical History & Consultation Records](#8-tripartite-medical-history--consultation-records)
- [Installation and Setup](#installation-and-setup)
- [Database Seeding & Demo Accounts](#database-seeding--demo-accounts)
- [Running the Application](#running-the-application)
- [Available npm Scripts](#available-npm-scripts)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Security & Academic Notice](#security--academic-notice)

---

## Prerequisites

Before running MediBridge locally, make sure you have the following installed and ready:

1. **Node.js**: Version `22.12.0` or newer (Node 22 LTS or Node 24).  
   Check your installed version:
   ```bash
   node -v
   ```
2. **MongoDB**: A free cloud database cluster from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (M0 cluster) or a local MongoDB server (`>= 6.0`).
3. **Razorpay Account (Optional for Payments)**: A free [Razorpay](https://razorpay.com/) account in **Test Mode** to obtain simulated payment keys (`rzp_test_...`).
4. **Git**: Installed on your system to clone and manage the repository.

---

## Technology Stack

MediBridge is built with the **MERN** stack (MongoDB, Express, React, Node.js) organized in an npm workspaces monorepo:

### Frontend (Client-Side)

- **React 19**: Modern UI library using functional components and hooks.
- **Vite 7**: Blazing fast development server and production bundler.
- **React Router 7**: Declarative client-side routing with role-based route guards.
- **TanStack Query 5 (React Query)**: Smart server cache management, background data refetching, and zero-stutter screen transitions.
- **React Hook Form 7 & Zod 4**: Smooth, reactive form handling with instant validation.
- **Lucide React**: Clean, modern iconography across all portals.
- **Tailwind CSS 4 & Custom Design Tokens**: Contemporary design system featuring glassmorphism, responsive cards, and clean typography (`Outfit` and `Plus Jakarta Sans`).

### Backend (Server-Side)

- **Node.js (`>=22.12.0`) & Express 5**: Fast and robust REST API server.
- **MongoDB Atlas & Mongoose 8**: Scalable NoSQL document database with strict schema models and transaction support.
- **Bcrypt.js**: Cryptographic password hashing (12 salt rounds) for user credentials.
- **Cookie-Parser**: Secure session token handling via `HttpOnly` cookies.
- **Helmet & CORS**: Comprehensive HTTP security headers and cross-origin protection.
- **Express-Rate-Limit**: Request throttling to prevent brute-force attacks.
- **Multer**: Multipart form-data handling for patient prescription scans.
- **Native Node Crypto**: HMAC-SHA256 signature verification and cryptographically random session tokens.

### External Services

- **Jitsi Meet**: In-browser video conferencing powered by the Jitsi IFrame API (`meet.jit.si`).
- **Razorpay (Test Mode)**: Secure online payment gateway simulation for medicine orders.

---

## Environment Configuration

All backend environment settings are configured in `backend/.env`. A template is provided in `backend/.env.example`.

### Step 1: Create the Environment File

From the root of the project:

- **Windows (PowerShell):**
  ```powershell
  Copy-Item backend/.env.example backend/.env
  ```
- **macOS / Linux (Bash):**
  ```bash
  cp backend/.env.example backend/.env
  ```

### Step 2: Configure Environment Variables

Open `backend/.env` in your code editor and enter your values:

| Variable              | What It Does                                                      | Recommended / Example Value                                            |
| :-------------------- | :---------------------------------------------------------------- | :--------------------------------------------------------------------- |
| `PORT`                | Local port for the Express backend                                | `4000`                                                                 |
| `MONGODB_URI`         | MongoDB Atlas SRV connection string or local MongoDB URI          | `mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/medibridge` |
| `CLIENT_ORIGIN`       | Allowed frontend URL(s) for CORS and credentials                  | `http://127.0.0.1:5173,http://localhost:5173`                          |
| `NODE_ENV`            | Application environment (`development` or `production`)           | `development`                                                          |
| `TRUST_PROXY`         | Express reverse proxy trust (`0` for local, `1` for Render/cloud) | `0`                                                                    |
| `RAZORPAY_KEY_ID`     | Razorpay Test Key ID (starts with `rzp_test_`)                    | `rzp_test_YourTestKeyId`                                               |
| `RAZORPAY_KEY_SECRET` | Razorpay Test Key Secret                                          | `YourRazorpaySecretKey`                                                |
| `SEED_PASSWORD`       | Default password for seeded demo accounts                         | `DemoPassword2026!`                                                    |

> [!CAUTION]
> Never commit your real `.env` file to GitHub or share your database password. The `.gitignore` file automatically excludes `backend/.env`.

---

## Project Architecture

MediBridge uses an **npm workspaces monorepo** where the frontend and backend live in the same repository for seamless management, shared linting, and synchronized builds.

Here is the exact repository directory structure:

```text
medibridge/
├── backend/
│   ├── config/              # Server configuration
│   │   ├── database.js      # MongoDB Mongoose connection handler
│   │   └── http.js          # Express app middleware (Helmet, CORS, rate limits)
│   ├── controllers/         # Request handling logic
│   │   ├── account.controller.js        # User profile and account updates
│   │   ├── appointments.controller.js   # Slot booking and scheduling
│   │   ├── auth.controller.js           # Signup, login, logout, and session check
│   │   ├── cart.controller.js           # Shopping cart management
│   │   ├── catalog.controller.js        # Public medicine catalog & search
│   │   ├── consultation.controller.js   # Telehealth video room & doctor notes
│   │   ├── doctor.controller.js         # Doctor profiles & availability
│   │   ├── inventory.controller.js      # Pharmacist inventory & batch management
│   │   ├── orders.controller.js         # Order placement & fulfillment
│   │   └── prescriptions.controller.js  # Digital prescriptions & scans
│   ├── middleware/          # Express route middleware
│   │   ├── auth.js          # Cookie-based authentication & role verification
│   │   └── uploads.js       # Multer configuration for file uploads
│   ├── models/              # Mongoose data schemas
│   │   ├── index.js         # User, Doctor, Medicine, Order, Prescription schemas
│   │   └── video.js         # Telehealth video session tracking schema
│   ├── routes/              # Express API endpoints
│   │   ├── auth.routes.js         # /api/auth routes
│   │   ├── catalog.routes.js      # /api/catalog routes
│   │   ├── clinical.routes.js     # /api/appointments, /consultations, /prescriptions
│   │   ├── commerce.routes.js     # /api/cart, /orders, /payments
│   │   └── operations.routes.js   # /api/inventory, /doctor operations
│   ├── services/            # Core business logic
│   │   ├── appointments.service.js          # Appointment validation & locking
│   │   ├── commerce.service.js              # Checkout calculation & cart sync
│   │   ├── consultation-lifecycle.service.js# Video call lifecycle worker
│   │   ├── instant-consultation.service.js  # Queue logic for on-demand calls
│   │   ├── inventory.service.js             # Batch stock management
│   │   ├── payments.service.js              # Razorpay order & signature checks
│   │   ├── prescriptions.service.js         # Prescription generation
│   │   ├── stock.service.js                 # FIFO stock allocation & expiry check
│   │   └── video.service.js                 # Jitsi room token creation
│   ├── utils/               # Helper utilities
│   │   ├── http.js          # Response dispatchers (send, sendError)
│   │   ├── lib.js           # AppError class, ensure assertion helper
│   │   └── validation.js    # Shared Zod validation schemas
│   ├── .env.example         # Template for environment variables
│   ├── app.js               # Express application setup
│   ├── package.json         # Backend dependencies & scripts
│   ├── seed.js              # Database seed script for test accounts & catalog
│   └── server.js            # Server entry point & video cleanup worker
├── frontend/
│   ├── public/              # Static assets & category packaging artwork
│   │   ├── assets/          # SVG category illustrations (bottles, packs, tubes)
│   │   ├── mark.svg         # MediBridge platform logo mark
│   │   └── _redirects       # Netlify SPA routing rules
│   ├── src/
│   │   ├── components/      # Shared reusable UI elements
│   │   │   ├── DoctorCard.jsx   # Doctor profile card with booking trigger
│   │   │   ├── Expiry.jsx       # Visual expiry date badges & indicators
│   │   │   ├── products.jsx     # Medicine catalog cards & details
│   │   │   └── ui.jsx           # Buttons, inputs, modals, alerts, badges
│   │   ├── features/        # Major feature workspaces
│   │   │   ├── appointments/    # Doctor schedules & appointment booking modal
│   │   │   ├── commerce/        # Cart drawer, checkout modal, order views
│   │   │   ├── consultation/    # Jitsi video call window, chat, & clinical notes
│   │   │   └── pharmacy/        # Pharmacy inventory table & batch management
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useApp.js        # Global app context (auth state, active role)
│   │   │   ├── useData.js       # TanStack Query data fetching wrapper
│   │   │   └── useNow.js        # Reactive live clock for session timing
│   │   ├── layouts/
│   │   │   └── SiteLayout.jsx   # Global navbar, navigation links, and footer
│   │   ├── pages/           # Application views
│   │   │   ├── Auth.jsx         # Login and registration dialogs
│   │   │   ├── Catalog.jsx      # Medicine store with search & category filters
│   │   │   ├── Consultation.jsx # Active video consultation room
│   │   │   ├── Consultations.jsx# Doctor/patient appointments list
│   │   │   ├── Doctors.jsx      # Doctor directory & specialist filters
│   │   │   ├── History.jsx      # Patient medical history & consultation cards
│   │   │   ├── Home.jsx         # Landing page with hero, stats, and features
│   │   │   └── Profile.jsx      # User profile details
│   │   ├── services/        # Client-side API & integration connectors
│   │   │   ├── api.js           # Fetch API client with credentials & error handling
│   │   │   ├── jitsi.js         # Jitsi Meet external script loader
│   │   │   └── razorpay.js      # Razorpay checkout script & modal launcher
│   │   ├── styles/          # Modular CSS stylesheets
│   │   │   ├── tokens.css       # Design variables (colors, radii, shadows)
│   │   │   ├── base.css         # Typography, resets, and layout basics
│   │   │   ├── layout.css       # App navigation, headers, and container grids
│   │   │   ├── components.css   # Buttons, cards, modals, and badge styles
│   │   │   ├── dashboard.css    # Staff and patient dashboard grids
│   │   │   ├── doctors.css      # Specialist directory styles
│   │   │   ├── commerce.css     # Pharmacy catalog, cart, and checkout styles
│   │   │   ├── consultation.css # Video call stage and chat styling
│   │   │   ├── records.css      # Clinical cards, prescriptions, & print styles
│   │   │   ├── account.css      # Profile and authentication form styles
│   │   │   ├── refinement.css   # Visual polish and micro-animations
│   │   │   └── index.css        # Main stylesheet entry point
│   │   ├── utils/           # Frontend formatting & form helpers
│   │   │   ├── format.js        # Currency, date, and Indian Standard Time formatters
│   │   │   └── forms.js         # Zod form resolver helper
│   │   ├── App.jsx          # Route definitions & authenticated views
│   │   └── main.jsx         # React application entry point
│   ├── index.html           # Main HTML document template
│   ├── package.json         # Frontend dependencies & scripts
│   └── vite.config.js       # Vite configuration with local API proxy
├── .prettierrc.json         # Prettier code formatting rules
├── eslint.config.js         # ESLint JavaScript/React linting configuration
├── package.json             # Root monorepo orchestration scripts
└── README.md                # Project documentation
```

---

## Core Features & How They Work

### 1. Multi-Role Portals & Smart Authentication

- **What It Does**: MediBridge caters to three distinct user types—**Patients**, **Doctors**, and **Pharmacists**. Patients can sign up freely, while staff log into specialized workspaces tailored to their duties.
- **The Tech Behind It**:
  - Instead of vulnerable client-side tokens stored in local storage, login issues a secure 32-byte cryptographically random session token stored in an `HttpOnly` cookie.
  - In cross-site production deployments (such as Netlify frontend talking to Render backend), cookies automatically adapt to `SameSite=None; Secure`.
  - The database only saves a SHA-256 hash of the session token.
  - API routes are strictly protected by role-checking middleware (`roles("doctor")`, `roles("pharmacy")`), ensuring unauthorized users cannot access staff data even if they try to tamper with frontend requests.

### 2. Doctor Directory & Appointment Booking

- **What It Does**: Patients can search specialists by department (e.g., Cardiology, Dermatology, Pediatrics, General Medicine), view consultation fees, and pick an available date and time slot. They can also request an **Instant Consultation** for immediate care.
- **The Tech Behind It**:
  - Doctor schedules are stored with discrete slot availability states in MongoDB.
  - To prevent two patients from booking the same doctor slot at the same second, slot reservations use database-level transactional concurrency locks.
  - As soon as a slot is booked, it instantly updates across the platform.

### 3. In-Browser Telehealth Video Consultations

- **What It Does**: Doctors and patients can conduct real-time video consultations directly inside the web browser. No apps to download, no plugins to install, and no meeting links to copy-paste.
- **The Tech Behind It**:
  - Integrates the official Jitsi Meet External IFrame API dynamically inside a React component modal.
  - The backend generates cryptographically secure, unguessable room identifiers (e.g., `mb-xxxx-xxxx`) so only the matched doctor and patient can enter.
  - A background server worker (`consultation-lifecycle.service.js`) monitors active video sessions and automatically marks the consultation completed after the session concludes.

### 4. Digital Prescriptions & Printable Clinic Letterhead

- **What It Does**: During or after a consultation, the doctor can write an official medical prescription detailing medicine names, dosages, timings (e.g., morning/night, before/after meals), and lifestyle instructions. Patients can view this anytime, upload outside prescriptions, or print an official clinic letterhead.
- **The Tech Behind It**:
  - The prescription modal formats the document according to official medical standards with the traditional Latin $℞$ symbol and doctor credentials.
  - The frontend includes custom `@media print` CSS rules. When the patient clicks **Print Prescription**, the browser automatically hides the navigation bar, buttons, and app chrome, rendering a clean, professional paper letterhead ready for home printing or PDF export.

### 5. Multi-Batch Pharmacy Inventory & Expiry Safeguards

- **What It Does**: Medicines aren't just tracked as a simple stock number. The pharmacy organizes medicine stock into distinct **batches**, each with its own Lot Number, Stock Count, and Expiry Date. Expired medicines are automatically identified and blocked from being sold.
- **The Tech Behind It**:
  - **IST Expiry Calculation**: Expiry dates are calculated using Indian Standard Time (`UTC+05:30`), remaining valid until 23:59:59 IST on the listed date.
  - **FIFO (First-In, First-Out) Allocation**: When a patient checks out, the backend automatically reserves stock from the batch with the nearest valid expiry date.
  - **Automated Expiry Safeguards**:
    1. Expired batches are automatically blocked from the catalog and cannot be added to the shopping cart.
    2. Batches within 30 days of expiry display a prominent warning badge.
    3. A **Fulfillment Lock** prevents pharmacists from packing or dispensing an order if a batch has expired between the time the patient placed the order and when the pharmacy processes it.

### 6. Medicine Catalog & Smart Image Uploads

- **What It Does**: Pharmacists can add new medicines to the platform and upload actual product photos. If a photo isn't uploaded, the platform automatically applies matching category artwork (like syrup bottles, ointment tubes, blister packs, or first-aid kits) so every medicine looks great.
- **The Tech Behind It**:
  - When uploading a product image, the frontend uses an HTML5 Canvas compression helper to resize and compress the image client-side before sending it to the backend. This saves bandwidth and makes uploads instant.
  - If no custom image is chosen, the UI gracefully falls back to vector SVG packaging illustrations located in `frontend/public/assets/`.

### 7. Shopping Cart & Razorpay Test Payments

- **What It Does**: Patients can review their medicine cart, view price breakdowns (including tax and delivery charges), and pay online using Razorpay Test Mode with test UPI, credit/debit cards, or net banking.
- **The Tech Behind It**:
  - The backend creates Razorpay orders via server-to-server API calls in paise (₹1 = 100 paise).
  - When payment finishes, Razorpay returns a cryptographic signature. The backend validates this using HMAC-SHA256 (`crypto.timingSafeEqual`) to prevent payment tampering:
    $$\text{Signature} = \text{HMAC-SHA256}(\text{order\_id} + "|" + \text{payment\_id}, \text{SECRET})$$
  - Features **idempotent reconciliation**: if a customer accidentally closes their browser before the payment confirmation finishes, clicking "Check payment status" on their order page triggers a direct server-to-server status check with Razorpay.

### 8. Tripartite Medical History & Consultation Records

- **What It Does**: Patients have a comprehensive history log where every past consultation is organized into three connected sections:
  1. **Doctor's Clinical Notes**: Chief complaints, diagnosis, and advice.
  2. **Official Prescription**: Medicines, dosage instructions, and print button.
  3. **Linked Medicine Order**: Immediate view of medicines purchased for that consultation and their delivery status.
- **The Tech Behind It**:
  - MongoDB models link Appointments, Prescriptions, and Commerce Orders using relational ObjectId references.
  - Clean, dedicated React card components present all three aspects without cluttering the screen.

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/SoumyadipM-SST/MERN_ETP-MediBridge.git
cd MERN_ETP-MediBridge
```

### 2. Install Dependencies

Install all dependencies for both the root, backend, and frontend with a single command:

```bash
npm install
```

### 3. Configure the Environment

Create `backend/.env` from the provided example:

```bash
# Windows
Copy-Item backend/.env.example backend/.env

# macOS / Linux
cp backend/.env.example backend/.env
```

Open `backend/.env` and enter your MongoDB connection string and Razorpay test credentials.

---

## Database Seeding & Demo Accounts

MediBridge includes an automated database seed script (`backend/seed.js`) that provisions ready-to-test specialist doctor profiles, consultation appointment slots, and multi-batch pharmacy inventory.

### Run the Seeder

```bash
npm run seed
```

### Seeded Demonstration Accounts

The script provisions three accounts using the `SEED_PASSWORD` set in your `backend/.env` (default: `DemoPassword2026!`):

| Role           | Email Address              | Password                 | Profile Name            | Description                                                       |
| :------------- | :------------------------- | :----------------------- | :---------------------- | :---------------------------------------------------------------- |
| **Patient**    | `patient@medibridge.demo`  | _(Your `SEED_PASSWORD`)_ | **Aarav Sharma**        | Can book doctors, join video calls, and order medicines           |
| **Doctor**     | `doctor@medibridge.demo`   | _(Your `SEED_PASSWORD`)_ | **Dr. Rajesh Verma**    | Specialist in Internal Medicine with clinical consultation portal |
| **Pharmacist** | `pharmacy@medibridge.demo` | _(Your `SEED_PASSWORD`)_ | **MediBridge Pharmacy** | Manages batches, adds products, and fulfills customer orders      |

> [!NOTE]
> The seed script is completely safe to run multiple times. It updates existing demo accounts and slots without duplicating records or wiping your order history.

---

## Running the Application

### Option A: Development Mode (Recommended for Testing)

Run the backend and frontend in two separate terminal windows for live code reloading:

**Terminal 1 — Backend Server:**

```bash
npm run dev:backend
```

_The Express server connects to MongoDB and begins listening on `http://127.0.0.1:4000`._

**Terminal 2 — Frontend Dev Server:**

```bash
npm run dev:frontend
```

_Vite starts the React frontend on `http://127.0.0.1:5173`._

Open your web browser and visit: **`http://127.0.0.1:5173`**

---

### Option B: Production Build and Unified Server

To test the compiled production application served directly by Express:

1. Build both the backend and frontend bundle:
   ```bash
   npm run build
   ```
2. Start the unified production server:
   ```bash
   npm start
   ```
3. Open your browser at **`http://127.0.0.1:4000`**. The Express server will serve the optimized production files from `frontend/dist/` alongside the `/api` backend endpoints.

---

## Available npm Scripts

All scripts can be executed directly from the project root directory:

| Command                | Action                                                                               |
| :--------------------- | :----------------------------------------------------------------------------------- |
| `npm run dev:backend`  | Starts the Express backend server with auto-reload (`node --watch`) on port 4000     |
| `npm run dev:frontend` | Starts the Vite React frontend development server on port 5173                       |
| `npm run seed`         | Seeds MongoDB with demo users, doctors, and multi-batch pharmacy stock               |
| `npm run build`        | Checks backend syntax and builds the frontend production bundle into `frontend/dist` |
| `npm start`            | Runs the production backend server serving both API routes and static frontend files |
| `npm run lint`         | Runs ESLint across all backend and frontend JavaScript/JSX source files              |
| `npm run format`       | Automatically formats all files according to Prettier rules                          |
| `npm run format:check` | Verifies code formatting compliance without modifying files                          |
| `npm run check`        | Comprehensive pre-flight check: runs format check, linter, and full production build |

---

## Troubleshooting Common Issues

### 1. MongoDB Connection Error (`bad auth` or `MongoServerSelectionError`)

- **Fix**: Check your `MONGODB_URI` in `backend/.env`.
- Ensure special characters in your database password are URL-encoded (for example, `@` becomes `%40`).
- In your MongoDB Atlas dashboard, go to **Network Access** and ensure your IP address is whitelisted (or set to `0.0.0.0/0` for development).

### 2. Login Fails or Session Immediately Clears

- **Fix**: Check `CLIENT_ORIGIN` in `backend/.env`. It must match the exact URL and port showing in your browser (e.g., `http://127.0.0.1:5173`).
- If running on a cloud deployment (like Netlify + Render), make sure your backend has `NODE_ENV=production` set so the session cookie uses `SameSite=None; Secure`.

### 3. Razorpay Checkout Does Not Open

- **Fix**: Check that `RAZORPAY_KEY_ID` in `backend/.env` starts with `rzp_test_`.
- Verify that both Key ID and Key Secret come from the same active Test Mode key pair in your Razorpay Dashboard.

### 4. Video Call / Camera Access Blocked

- **Fix**: Ensure you have given your browser permission to access your webcam and microphone.
- Make sure no other software (like Zoom, Google Meet, or Teams) is currently locking your hardware camera.
- When simulating both the doctor and patient on the same machine, open one role in a normal window and the other in an **Incognito / Private window**.

---

## Security & Academic Notice

- **Academic Project**: MediBridge is built as an educational, full-stack demonstration project. It is not an officially licensed medical device, clinical diagnostic tool, or commercial pharmacy.
- **Synthetic Data**: All doctor names, credentials, medical notes, and medicine catalog items provided in the seed data are fictional.
- **Payment Safety**: All financial transactions run through Razorpay **Test Mode**; no real money or bank accounts are ever charged.
- **Credential Protection**: Real secrets, API keys, and database passwords should never be committed to public repositories. Always keep them confined to local `.env` files.
