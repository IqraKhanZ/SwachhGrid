# 🌿 SwachhGrid

> **AI-Powered Ward Sanitation, Environmental Grievance & Municipal Eco Governance Platform**

SwachhGrid is a modern 3-tier municipal environmental governance platform designed to connect **Citizens**, **Ward Sanitation Officers**, and **Super Administrators**. It features real geographic coordinate mapping via **OpenStreetMap**, **CPCB Air Quality monitoring**, **AI Vision Before/After verification**, and real-time SLA tracking for municipal remediation.

---

## ✨ Key Features

### 👥 3-Tier Multi-Role Architecture
1. **🌱 Eco Citizen (`/`)**
   - Interactive Eco Map showing real-world environmental issues (waste dumps, water pipe bursts, open burning, air smog).
   - Report issues with GPS coordinates, auto-detection via AI vision, and upvote/support community grievances.
   - Join community action drives (river cleanups, tree plantation drives).
   
2. **🏛️ Ward Officer Portal (`/authority-portal`)**
   - Jurisdiction-scoped dashboard displaying assigned ward grievances with SLA urgency tags.
   - **Remediate & Upload Proof**: Officers upload after-photos directly to Cloudinary.
   - **AI Before/After Verification**: Automated vision check evaluates post-remediation proof against original issue photos.
   - Real-time ward rating calculation based on SLA resolution speed.

3. **🛡️ Super Admin Console (`/admin`)**
   - High-level municipal KPIs: Total Wards, Resolution Rates, Overdue Grievances.
   - **Full Authority CRUD**: Add, edit, assign, or delete ward authorities with system administrator privileges.
   - City-wide issue management and official complaint dispatch logs.

### 🗺️ Real Government & Open Data Integration
- **OpenStreetMap Nominatim**: Real geographic coordinates for Lucknow municipal wards (Gomti Nagar, Hazratganj, Kalyanpur, Alambagh, Aliganj, Chinhat, Indira Nagar, Daliganj, Chowk, Charbagh, Telibagh, Mahanagar).
- **CPCB Air Quality Stations**: Integrated real-time monitoring stations (Lalbagh, Talkatora, Gomti Nagar) alerting citizens to elevated PM2.5 levels.

---

## 🔑 Pre-Seeded 1-Click Demo Accounts

| Role | Email | Password | Primary Portal |
| --- | --- | --- | --- |
| **🛡️ Super Admin** | `admin@communityhero.green` | `admin123` | `/admin` |
| **🏛️ Ward Officer (Kalyanpur)** | `kalyanpur.ward@lmc.gov.in` | `authority123` | `/authority-portal` |
| **🏛️ Ward Officer (Daliganj)** | `daliganj.ward@lmc.gov.in` | `authority123` | `/authority-portal` |
| **🌱 Eco Citizen** | `citizen@gmail.com` | `citizen123` | `/` (Eco Map & Feed) |

*Note: Google One-Tap authentication is also enabled.*

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Leaflet Maps (`react-leaflet`), Lucide Icons, Axios, Recharts
- **Backend**: FastAPI (Python 3.14 compatible), PyMongo, Direct Bcrypt, Jose JWT
- **Database**: MongoDB (Local or MongoDB Atlas)
- **AI Services**: Google Gemini 2.5/3.6 Flash Vision (Automated before/after repair verification)
- **Media CDN**: Cloudinary (Image upload & optimization)

---

## 🚀 Local Quickstart

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB instance running locally on `mongodb://localhost:27017` or a MongoDB Atlas URI.

### 1. Clone & Setup Backend
```bash
git clone https://github.com/IqraKhanZ/SwachhGrid.git
cd SwachhGrid/backend

# Create virtual environment (optional)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pymongo python-jose bcrypt requests python-dotenv

# Run database seed script (Seeds OpenStreetMap data & demo accounts)
python seed_data.py

# Start Backend API
python -m uvicorn main:app --port 8001 --reload
```

### 2. Setup Frontend
```bash
cd ../frontend

# Install dependencies
npm install

# Start Frontend Dev Server
npm run dev
```
Open [http://localhost:5174](http://localhost:5174) in your browser.

---

## 📦 Deployment Guide

### 1. Database Setup (MongoDB Atlas)
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and allow access from all IPs (`0.0.0.0/0`).
3. Copy your connection string: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/swachhgrid`.

### 2. Backend Deployment (Render / Railway)
1. Push your codebase to GitHub.
2. Create a **New Web Service** on Render / Railway pointing to the `/backend` folder.
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables**:
   - `MONGO_URI`: `mongodb+srv://...`
   - `JWT_SECRET`: `your_secure_jwt_secret_key`
   - `GEMINI_API_KEY`: `your_google_gemini_api_key`
   - `CLOUDINARY_CLOUD_NAME`: `your_cloudinary_name`
   - `CLOUDINARY_UPLOAD_PRESET`: `your_unsigned_preset`

### 3. Frontend Deployment (Vercel / Netlify)
1. Import the repository in Vercel / Netlify.
2. Set Root Directory to `frontend`.
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Environment Variables**:
   - `VITE_API_URL`: `https://your-backend-app.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID`: `your_google_oauth_client_id`

---

## 📜 License
Licensed under the [MIT License](LICENSE).
