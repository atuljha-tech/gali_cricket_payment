# Gali Cricket — Monthly Fee Management System

A simple web app to manage monthly cricket fund collections. Admins manually verify payments and mark them as paid. Players can check their status without logging in.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + bcrypt
- **Deployment**: Vercel + MongoDB Atlas

---

## Setup

### 1. Clone & Install
```bash
npm install
```

### 2. Configure Environment Variables
Create `.env.local` in the project root:
```env
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/gali-cricket
JWT_SECRET=your_super_secret_jwt_key_here_at_least_32_chars
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 3. Seed the Database (first time only)
After the app is running, call:
```
POST https://your-app.com/api/seed
```
This creates 4 admin accounts and default settings.

Default admin accounts:
| Email | Password |
|-------|----------|
| admin1@cricket.com | Admin@1234 |
| admin2@cricket.com | Admin@1234 |
| admin3@cricket.com | Admin@1234 |
| admin4@cricket.com | Admin@1234 |

> **Change passwords after first login** (or update the seed file before running).

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Pages

| URL | Access | Description |
|-----|--------|-------------|
| `/` | Public | Player list — everyone can see all players' payment status |
| `/qr` | Public | QR code & payment instructions |
| `/receipt/[id]` | Public | Receipt with PDF download |
| `/login` | Public | Admin login |
| `/dashboard` | Admin | Stats overview |
| `/players` | Admin | Player table with Mark Paid / Undo |
| `/player/[id]` | Admin | Player detail + full history |
| `/history` | Admin | All payment history with filters |
| `/settings` | Admin | Fee amount, fine, due date, QR upload |

---

## How Payments Work

1. Player scans QR code → pays via Google Pay
2. Player clicks "I Have Paid" on the website → admin is notified
3. Admin verifies the payment (checks their phone / GPay)
4. Admin clicks **Mark Paid** on the Players page
5. Receipt is generated automatically

**The website never processes payments.** It only records admin confirmation.

---

## Fine Calculation

```
If today <= dueDate:   Fine = 0
Else:                  Fine = daysLate × dailyFine
```

Default: ₹2/day after the 10th of each month.

---

## Monthly Reset

On the 1st of every month, all players' current-month status resets to **Pending**. Previous history is preserved.

---

## Deployment to Vercel

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy
5. Hit `/api/seed` once to create admin accounts
