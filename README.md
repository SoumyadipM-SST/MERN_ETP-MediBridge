# MediBridge

MediBridge is a full-stack MERN (MongoDB, Express, React, Node.js) healthcare platform engineered to connect patients, doctors, and pharmacies. The application features multi-role authentication, specialist appointment booking, browser-based telehealth consultations via Jitsi Meet, digital and scanned prescription workflows, multi-batch pharmacy inventory with expiry safeguards, and Razorpay test-mode payment processing.

Demo Video - https://drive.google.com/drive/folders/1o4NAnWiAx5_VFwfowQMyq1CAp423WQTS?usp=drive_link

---

## Table of Contents

- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Installation and Setup](#installation-and-setup)
- [Database Seeding](#database-seeding)
- [Running the Application](#running-the-application)
- [Authentication and Role-Based Access](#authentication-and-role-based-access)
- [Pharmacy, Inventory Batches, and Expiry Safeguards](#pharmacy-inventory-batches-and-expiry-safeguards)
- [Razorpay Test-Mode Payment Workflow](#razorpay-test-mode-payment-workflow)
- [Telehealth Consultations and Jitsi Meet](#telehealth-consultations-and-jitsi-meet)
- [Available npm Scripts](#available-npm-scripts)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Security and Compliance Notes](#security-and-compliance-notes)

---

## Key Features

- **Multi-Role Portals**: Distinct experiences and access permissions for **Patients**, **Doctors**, and **Pharmacists** with strict backend authorization.
- **Doctor Directory & Scheduling**: Filter specialists by specialty, consult fees, and availability. Book scheduled date/time slots with transactional concurrency locks to prevent double-booking.
- **Browser-Based Telehealth (Jitsi Meet)**: End-to-end encrypted video consultation using the official Jitsi IFrame API (`meet.jit.si`) with live in-session chat, participant presence, and clinical memo recording.
- **Digital & Printable Prescriptions**: Doctors can author formal Latin $℞$ prescriptions with drug dosages, timings, and dietary advice. Includes an official printable clinic letterhead (`@media print` optimized) and patient scan upload capabilities.
- **Multi-Batch Pharmacy Inventory**: Pharmacists can manage medicines across multiple inventory batches with individual lot labels, stock quantities, and ISO calendar expiry dates (`YYYY-MM-DD`).
- **Automated Expiry Safeguards**:
  - Real-time stock evaluation under Indian Standard Time (`UTC+05:30`).
  - Strict FIFO (First-In, First-Out) stock allocation favoring nearest-expiry valid items.
  - Automatic blocking of expired or unrecorded stock from cart addition and order checkout.
  - Fulfillment lock ensuring pharmacists cannot pack or ship batches that have expired after order placement.
- **Medicine Image Uploads**: Product creation supports custom product image uploads (with live client-side canvas compression) and fallback category artwork.
- **Razorpay Test-Mode Payments**: Server-side checkout creation, cryptographic HMAC-SHA256 signature verification (`timingSafeEqual`), automatic test refunds for unfulfillable items, and idempotent payment reconciliation.
- **Medical History Dashboard**: Patients view past consultations organized in tripartite clinical cards (Clinical Notes, Medical Prescription, and Linked Medicine Orders).

---

## Technology Stack

### Backend

- **Runtime**: Node.js (`>=22.12.0 <25`)
- **Framework**: Express 5
- **Database**: MongoDB Atlas via Mongoose 8
- **Validation**: Zod 4
- **Security & Utilities**:
  - `bcryptjs` (password hashing with 12 salt rounds)
  - `cookie-parser` (HttpOnly session cookies)
  - `helmet` (HTTP security headers)
  - `cors` (credentialed origin allowlisting)
  - `express-rate-limit` (request throttling)
  - `multer` (multipart/form-data for medical file uploads)
  - Native `crypto` (HMAC-SHA256 signatures, random bytes, timing-safe equality)

### Frontend

- **Framework**: React 19
- **Build Tool**: Vite 7
- **Routing**: React Router 7
- **State & Server Cache**: TanStack Query 5
- **Form Handling**: React Hook Form 7 with `@hookform/resolvers/zod`
- **Icons**: Lucide React
- **Styling**: Tailwind CSS 4 with custom CSS design tokens (`Outfit` display font and `Plus Jakarta Sans` body typography)

### External Integrations

- **Video Conferencing**: Jitsi Meet External API (`https://meet.jit.si/external_api.js`)
- **Payment Gateway**: Razorpay Test Mode API (`https://api.razorpay.com/v1`)

---

## Project Architecture

MediBridge is structured as an npm workspaces monorepo:

```text
medibridge/
├── backend/
│   ├── config/              # Database (Mongoose) and HTTP server setup
│   ├── controllers/         # Request handlers (auth, appointments, catalog, orders, etc.)
│   ├── middleware/          # Authentication, role verification, and upload handlers
│   ├── models/              # Mongoose schemas (User, Doctor, Medicine, Appointment, etc.)
│   ├── routes/              # Express API route registrations
│   ├── services/            # Core business logic (stock, inventory, payments, video)
│   ├── utils/               # HTTP helpers, validation schemas, and error wrappers
│   ├── .env.example         # Environment template with safe placeholders
│   ├── app.js               # Express application initialization and middleware
│   ├── package.json         # Backend manifest and dependencies
│   ├── seed.js              # Database seed script for test accounts & catalog
│   └── server.js            # HTTP server entry point with video maintenance worker
├── frontend/
│   ├── public/              # Static assets, category SVG illustrations, and icons
│   ├── src/
│   │   ├── components/      # Shared UI primitives, doctor cards, product cards
│   │   ├── features/        # Feature modules:
│   │   │   ├── appointments/  # Doctor schedules, booking modal, appointment records
│   │   │   ├── commerce/      # Cart, checkout, order details, prescriptions
│   │   │   ├── consultation/  # Jitsi video stage, chat conversation, notes editor
│   │   │   └── pharmacy/      # Inventory table, batch editor, product create form
│   │   ├── hooks/           # Custom React hooks (useApp, useData, useNow)
│   │   ├── layouts/         # Site layout, navigation bar, and footer
│   │   ├── pages/           # Route views (Home, Doctors, Catalog, Consultations, History)
│   │   ├── services/        # Client API, Jitsi loader, Razorpay modal handler
│   │   ├── styles/          # Custom CSS stylesheets (tokens, components, records, layout)
│   │   ├── utils/           # Formatters and form validation schemas
│   │   ├── App.jsx          # Route definitions and application shell
│   │   └── main.jsx         # React application entry point
│   ├── package.json         # Frontend manifest and dependencies
│   └── vite.config.js       # Vite build and proxy configuration
├── .prettierrc.json         # Code style configuration
├── eslint.config.js         # ESLint configuration
├── package.json             # Root monorepo manifest and orchestration scripts
└── README.md                # Project documentation
```

---

## Prerequisites

Before setting up MediBridge, ensure your workstation meets the following requirements:

1. **Node.js**: Version `22.12.0` or newer (Node 22 LTS or Node 24).  
   Check your version with:
   ```bash
   node -v
   ```
2. **MongoDB Atlas Account**: A free MongoDB Atlas M0 cluster or a local MongoDB server (`>= 6.0`).
3. **Razorpay Account (Optional for Payments)**: A free Razorpay account in **Test Mode** to obtain test API keys (`rzp_test_...`).
4. **Git**: Installed and configured on your machine.

---

## Environment Configuration

Environment variables reside in `backend/.env`. A template is provided in `backend/.env.example`.

### Step 1: Copy the Template

On Windows (PowerShell):

```powershell
Copy-Item backend/.env.example backend/.env
```

On macOS / Linux (Bash):

```bash
cp backend/.env.example backend/.env
```

> [!CAUTION]
> Never commit your real `backend/.env` file to version control. The `.gitignore` file already excludes `.env`.

### Step 2: Configure Variables

Open `backend/.env` in your text editor and fill in the values:

| Variable              | Description                                                           | Example / Recommended Value                                            |
| :-------------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| `PORT`                | Local port for the Express backend server                             | `4000`                                                                 |
| `MONGODB_URI`         | MongoDB connection URI (Atlas SRV or local connection)                | `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxx.mongodb.net/medibridge` |
| `CLIENT_ORIGIN`       | Comma-separated list of allowed frontend origins for CORS and cookies | `http://127.0.0.1:5173,http://localhost:5173`                          |
| `NODE_ENV`            | Application runtime environment                                       | `development`                                                          |
| `TRUST_PROXY`         | Express trust proxy setting (`0` for local development)               | `0`                                                                    |
| `RAZORPAY_KEY_ID`     | Razorpay Test Mode Key ID (must start with `rzp_test_`)               | `rzp_test_YourTestKeyId`                                               |
| `RAZORPAY_KEY_SECRET` | Razorpay Test Mode Key Secret                                         | `YourRazorpaySecretKey`                                                |
| `SEED_PASSWORD`       | Password assigned to demonstration seed accounts (8–72 characters)    | `DemoPassword2026!`                                                    |

---

## Installation and Setup

From the repository root directory, install all dependencies for both workspaces:

```bash
npm install
```

_(Alternatively, use `npm ci` for clean, deterministic installs matching the lockfile)._

---

## Database Seeding

The repository includes a database seed script (`backend/seed.js`) that safely provisions initial demonstration accounts, doctor profiles, consultation time slots, and multi-batch pharmaceutical products.

### Running the Seed Script

Ensure your `MONGODB_URI` and `SEED_PASSWORD` are configured in `backend/.env`, then execute:

```bash
npm run seed
```

### Seeded Demonstration Accounts

The seed script creates three role-specific demo accounts using the `SEED_PASSWORD` configured in your `.env`:

| Role           | Email Address              | Password                 | Initial Profile                      |
| :------------- | :------------------------- | :----------------------- | :----------------------------------- |
| **Patient**    | `patient@medibridge.demo`  | _(Your `SEED_PASSWORD`)_ | Aarav Sharma                         |
| **Doctor**     | `doctor@medibridge.demo`   | _(Your `SEED_PASSWORD`)_ | Dr. Rajesh Verma (Internal Medicine) |
| **Pharmacist** | `pharmacy@medibridge.demo` | _(Your `SEED_PASSWORD`)_ | MediBridge Central Pharmacy          |

_Note: The seed script is idempotent. Running it multiple times updates existing accounts and slots without duplicating records or destroying order history._

---

## Running the Application

### Option A: Development Mode (Recommended)

Run the backend and frontend in two separate terminal windows for live reloading:

**Terminal 1 — Backend API Server:**

```bash
npm run dev:backend
```

_The Express server connects to MongoDB and begins listening on `http://127.0.0.1:4000`._

**Terminal 2 — Frontend Dev Server:**

```bash
npm run dev:frontend
```

_Vite starts the React frontend on `http://127.0.0.1:5173`._

Open your browser and navigate to: **`http://127.0.0.1:5173`**

---

### Option B: Production Build and Unified Server

To test the compiled production bundle served directly by Express:

1. Build both workspaces:
   ```bash
   npm run build
   ```
2. Start the unified server:
   ```bash
   npm start
   ```
3. Open your browser at **`http://127.0.0.1:4000`**. The Express server will serve the static files from `frontend/dist/` alongside the `/api` endpoints.

---

## Authentication and Role-Based Access

MediBridge implements strict role-based authorization:

### 1. Registration (`/signup`)

- Public registration creates **Patients only**.
- Any attempt to supply a custom role (such as `doctor`, `pharmacy`, or `admin`) via API injection is rejected by server-side Zod validation schemas.
- Staff accounts (Doctors and Pharmacists) cannot register publicly and must be seeded or provisioned by administrators.

### 2. Login (`/login`)

- The login dialog includes a role selector tabs: **Patient**, **Doctor**, and **Pharmacist**.
- Authentication requires both valid credentials and a role match. A patient's password submitted under the "Doctor" tab is rejected.

### 3. Session Security

- Sessions use a 32-byte cryptographically secure random token stored in an `HttpOnly`, `SameSite=Lax` cookie named `medibridge`.
- The backend stores only a SHA-256 hash of the token in MongoDB, expiring after 7 days.
- Role checks (`roles('patient')`, `roles('doctor')`, `roles('pharmacy')`) protect all sensitive API routes.

---

## Pharmacy, Inventory Batches, and Expiry Safeguards

MediBridge enforces strict pharmaceutical inventory integrity:

### Multi-Batch Tracking

- Medicines are tracked with discrete inventory batches rather than simple total stock numbers.
- Each batch contains:
  - `batchId`: A unique lot identifier.
  - `label`: Lot/Batch number (e.g., `LOT-AD-2027`).
  - `expiryDate`: ISO date string (`YYYY-MM-DD`).
  - `stock`: Available unit quantity.

### Expiry Date Rules & Timezone Handling

- Expiry is calculated under **Indian Standard Time (IST, UTC+05:30)**.
- A medicine remains valid through 23:59:59 IST on its printed expiry date and is marked **Expired** at midnight.
- Batches expiring within 30 days are automatically tagged with an **Expiring Soon** warning badge.

### Automated Safeguards

1. **Catalog & Cart Restrictions**: Undated or expired batches cannot be added to the shopping cart.
2. **FIFO Stock Allocation**: When a customer checks out, the backend automatically allocates inventory from the nearest valid expiry batch.
3. **Fulfillment Gate**: Pharmacists cannot fulfill or ship an order if a batch has expired between order placement and fulfillment.
4. **Optimistic Concurrency**: Stock adjustments and allocations increment a `stockVersion` counter within MongoDB transactions to prevent race conditions and overselling.

### Product Image Management

- Pharmacists can upload custom product photos when adding new medicines.
- The frontend features live image preview with automatic client-side canvas compression.
- If no custom image is provided, the platform automatically applies curated SVG category packaging artwork.

---

## Razorpay Test-Mode Payment Workflow

Medicine orders are processed using Razorpay in **Test Mode**:

1. **Cart Preparation**: The patient adds in-date OTC or approved prescription medicines to the cart and navigates to Checkout.
2. **Server Order Creation**: Clicking "Proceed to Payment" calls `POST /api/payments`, which validates cart stock availability and creates a Razorpay order in paise (`₹1.00 = 100 paise`).
3. **Razorpay Modal**: The frontend launches the official Razorpay Checkout modal using `RAZORPAY_KEY_ID`.
4. **Signature Verification**: Upon payment completion, Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`. The backend validates the HMAC-SHA256 signature using `crypto.timingSafeEqual()`:
   $$\text{HMAC-SHA256}(\text{order\_id} \mid \text{payment\_id}, \text{RAZORPAY\_KEY\_SECRET})$$
5. **Idempotent Reconciliation**: If the browser is closed before the callback finishes, the patient can click **Check payment status** on their order page to trigger server-to-server reconciliation with Razorpay.
6. **Automatic Test Refunds**: If a medicine becomes unavailable or expires during checkout, the backend initiates a test refund request and updates the payment status to `refund_pending`.

> [!NOTE]
> Test payments do not charge real money. Use standard Razorpay test cards or mock UPI IDs during checkout.

---

## Telehealth Consultations and Jitsi Meet

MediBridge integrates telehealth video consultations powered by the public Jitsi Meet infrastructure (`meet.jit.si`):

### How Consultations Work

1. **Booking**: The patient selects an available doctor, chooses a date/time slot, and submits an appointment request.
2. **Instant Consultation (Demo)**: Patients can also select the "Instant Consultation" slot option. The request queues until the assigned doctor accepts it.
3. **Consultation Workspace**: When the consultation window opens, both participants enter the consultation room.
4. **Jitsi Video Call**: Clicking **Join video call** initializes the Jitsi Meet IFrame API with an encrypted, cryptographically random room name (`mb-...`).
5. **Clinical Notes & Prescription Authoring**: During or after the call, the doctor records clinical consultation notes and writes digital prescriptions.

### Telehealth Session Duration & Limitations

- **Session Duration Limit**: For demonstration and resource efficiency, video calls have a **5-minute (300 seconds)** active duration limit enforced by the backend video lifecycle worker (`startVideoMaintenance()`).
- **Graceful Teardown**: When the session deadline is reached, the backend automatically transitions the appointment to `completed` and the frontend gracefully unmounts the Jitsi iframe.
- **Public Jitsi Service Constraints**:
  - MediBridge uses the public `meet.jit.si` service without requiring paid server infrastructure.
  - While MediBridge generates secure, unguessable room names and restricts room access in its own database, the public Jitsi service itself is externally hosted. Do not transmit real, sensitive personal health information during demonstrations.
  - First-time room creators on `meet.jit.si` may see Jitsi's standard host login prompt depending on region.
  - Camera and microphone access requires standard browser permissions.

---

## Available npm Scripts

All scripts can be run from the root directory:

| Command                | Action                                                                        |
| :--------------------- | :---------------------------------------------------------------------------- |
| `npm run dev:backend`  | Starts the Express backend in watch mode on port 4000                         |
| `npm run dev:frontend` | Starts the Vite frontend development server on port 5173                      |
| `npm run build`        | Builds both the backend syntax check and frontend production bundle           |
| `npm start`            | Launches the production Express server serving `/api` and `frontend/dist/`    |
| `npm run seed`         | Runs the database seed script to provision demo accounts and catalog items    |
| `npm run lint`         | Runs ESLint across all JavaScript and JSX source files                        |
| `npm run format`       | Automatically formats the entire codebase using Prettier                      |
| `npm run format:check` | Verifies code formatting without writing changes                              |
| `npm run check`        | Executes full verification: format check, lint, backend check, and Vite build |

---

## Troubleshooting Common Issues

### 1. MongoDB Connection Timeout or Bad Auth

- **Symptom**: `MongoServerSelectionError` or `MongoServerError: bad auth`.
- **Solution**:
  - Verify your Atlas connection string in `backend/.env`.
  - Ensure special characters in your database user password are URL-encoded (e.g., `@` becomes `%40`).
  - Check Atlas **Network Access** and ensure your current public IP address is allowed (or `0.0.0.0/0` for development).

### 2. CORS / Cookie Session Errors

- **Symptom**: `Please sign in to continue` immediately after logging in, or CORS blocked errors.
- **Solution**:
  - Ensure you access the frontend via `http://127.0.0.1:5173` or `http://localhost:5173`.
  - Check that `CLIENT_ORIGIN` in `backend/.env` matches the exact URL and port in your browser address bar.

### 3. Razorpay Orders Not Loading

- **Symptom**: `Razorpay test mode is not configured` (HTTP 503).
- **Solution**:
  - Check that `RAZORPAY_KEY_ID` in `backend/.env` starts with `rzp_test_`.
  - Ensure both Key ID and Key Secret belong to the same active Test Mode key pair in your Razorpay dashboard.

### 4. Video Camera / Microphone Not Connecting

- **Symptom**: `gum.timeout` or black video screen in Jitsi.
- **Solution**:
  - Grant camera and microphone permissions to `127.0.0.1` in your browser settings.
  - Ensure other applications (Zoom, Teams, etc.) are not locking your hardware camera.
  - Test joining with separate browser profiles (or an Incognito window) when simulating both the Doctor and Patient simultaneously.

---

## Security and Compliance Notes

- **Educational & Demonstration Notice**: MediBridge is developed as an academic and demonstration MERN stack application. It is not a licensed healthcare provider, medical device, or licensed pharmacy.
- **Synthetic Data**: All doctor profiles, medical qualifications, medicine catalogs, and prescriptions in this project are synthetic demonstration data.
- **Test Mode Only**: All financial transactions use Razorpay Test Mode; no real money is ever processed, collected, or refunded.
- **Credential Protection**: Real database credentials, API keys, and session secrets must remain strictly confined to local `.env` files and never published to public repositories.
