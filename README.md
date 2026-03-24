# 🛡️ Sentinel — Anonymous Internal Reporting Platform

A production-grade, self-hosted platform for confidential employee reporting. Zero external dependencies, fully encrypted, no email required.

---

## Key Security Properties

| Property | Implementation |
|---|---|
| **Identity** | Reporters get auto-generated `Anon-XXXX` IDs — never linked to real identity |
| **Encryption at rest** | All messages and files encrypted with AES-256-GCM before storage |
| **No email anywhere** | Authentication, notifications, and all comms are in-system only |
| **Audit trail** | Every admin action logged with HMAC-SHA256 hashed IPs |
| **Screenshot resistance** | Blur on visibility change, watermarking, print disabled, copy blocked |
| **No external calls** | Zero analytics, no CDN dependencies, no third-party scripts |
| **JWT auth** | Short-lived access tokens + refresh tokens, no sessions stored in DB |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 17 (standalone components, signals) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 via Prisma ORM |
| Auth | JWT (access + refresh), bcrypt password hashing |
| Encryption | AES-256-GCM (messages + files) |
| Real-time | WebSocket (ws) with JWT auth |
| Reverse proxy | Nginx |
| Container | Docker + Docker Compose |

---

## Quick Start (Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 16 (or Docker)

### 1. Clone and set up backend
```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL and generate secrets (see below)
npm install
npx prisma migrate dev --name init
npx ts-node src/utils/seed.ts
npm run dev
```

### 2. Set up frontend
```bash
cd frontend
npm install
npm start   # Proxies /api → localhost:3000
```

Open http://localhost:4200

### Generate secrets
```bash
# JWT secrets
openssl rand -hex 64   # use for JWT_SECRET
openssl rand -hex 64   # use for JWT_REFRESH_SECRET

# AES encryption key
openssl rand -hex 32   # use for ENCRYPTION_KEY
```

---

## Production Deployment (Docker)

### 1. Create environment file
```bash
cp .env.production .env
# Fill in all values — especially the secrets
```

### 2. Build and launch
```bash
docker compose up -d --build
```

### 3. First login
- URL: `http://your-server`
- Admin login tab → username: `superadmin` (or your `SUPER_ADMIN_USERNAME`)
- **Change the password immediately** after first login via the Team Management page

### 4. TLS (recommended)
Mount your certificates into `nginx/ssl/` and update `nginx/nginx.conf` to add an HTTPS server block.

---

## User Roles

| Role | Capabilities |
|---|---|
| `REPORTER` | Submit reports, send messages, view own cases, receive notifications |
| `HR_ADMIN` | View/manage all cases, reply to reporters, assign cases |
| `LEGAL_ADMIN` | Same as HR + access to audit logs |
| `IT_ADMIN` | View/manage IT Security channel cases |
| `SUPER_ADMIN` | Full access: all cases, audit logs, team management, admin creation |

---

## Report Channels

| Channel | Slug | For |
|---|---|---|
| General Reports | `general-reports` | Any incident |
| HR Concerns | `hr-concerns` | Workplace conduct, discrimination, harassment |
| Safety Incidents | `safety-incidents` | Physical safety, near-miss events |
| Policy Violations | `policy-violations` | Code of conduct, compliance breaches |
| IT Security | `it-security` | Cybersecurity, data misuse, breaches |
| Legal & Compliance | `legal-compliance` | Fraud, conflicts of interest |

---

## Case Lifecycle

```
OPEN → UNDER_REVIEW → ESCALATED → RESOLVED → CLOSED
         ↓                ↓
       CLOSED           CLOSED
```

Each status change:
1. Persisted in PostgreSQL
2. In-app notification sent to reporter (no email)
3. WebSocket broadcast to all connected clients
4. Audit log entry recorded

---

## Encryption Details

### Messages
Every message body is encrypted before insert:
```
AES-256-GCM(plaintext, key=ENCRYPTION_KEY, iv=random_12_bytes)
→ stored as { ciphertext, iv } in DB
→ decrypted in memory at read time, never returned raw
```

### File attachments
```
File bytes → AES-256-GCM encrypt → write .enc file to disk
DB stores: encryptedPath = "filepath::base64_iv::base64_tag"
Download: read .enc → decrypt → stream to client with correct Content-Type
```

### IPs in audit logs
```
HMAC-SHA256(ip_address, ENCRYPTION_KEY) → stored as hex
Never stored in plain text
```

---

## File Structure

```
sentinel/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Full DB schema
│   ├── src/
│   │   ├── config/                # Env + Prisma singleton
│   │   ├── controllers/           # Auth, messages, reports, notifications, attachments, audit
│   │   ├── middleware/            # Auth, error handler, audit logger
│   │   ├── routes/                # All Express routes
│   │   ├── services/              # WebSocket server
│   │   ├── utils/                 # Encryption, JWT, logger, seed, case numbers
│   │   └── index.ts               # App bootstrap
│   ├── Dockerfile
│   └── docker-entrypoint.sh
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/              # Services, interceptors, guards, models
│   │   │   └── features/
│   │   │       ├── auth/          # Login + signup
│   │   │       ├── reporter/      # Layout, channels, chat, my-reports
│   │   │       ├── admin/         # Layout, dashboard, cases, case-detail, audit, team
│   │   │       └── shared/        # Avatar, notification bell
│   │   ├── styles.scss            # Global theme + Material overrides
│   │   └── index.html
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── .env.production                # Production env template
```

---

## API Reference

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/reporter/signup` | — | Create anonymous reporter |
| POST | `/api/v1/auth/reporter/login` | — | Reporter login |
| POST | `/api/v1/auth/admin/login` | — | Admin login |
| POST | `/api/v1/auth/admin/signup` | SUPER_ADMIN | Create admin |
| POST | `/api/v1/auth/refresh` | — | Refresh tokens |
| GET  | `/api/v1/auth/me` | Any | Get current profile |

### Channels & Messages
| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/v1/channels` | Any | List active channels |
| POST | `/api/v1/channels/:id/messages` | Any | Send message (creates report) |
| GET  | `/api/v1/channels/:id/messages` | Any | Paginated messages |
| GET  | `/api/v1/reports/:id/messages` | Any | Report thread messages |

### Reports (Admin)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET   | `/api/v1/reports` | Admin | List reports (filterable) |
| GET   | `/api/v1/reports/dashboard` | Admin | Stats summary |
| GET   | `/api/v1/reports/:id` | Admin | Report + assignments |
| PATCH | `/api/v1/reports/:id/status` | Admin | Update case status |
| POST  | `/api/v1/reports/:id/assign` | HR/Legal/Super | Assign to admin |
| GET   | `/api/v1/reports/mine` | Reporter | Own reports |

---

## Security Checklist Before Production

- [ ] Change `SUPER_ADMIN_PASSWORD` immediately after first login
- [ ] Generate unique `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`
- [ ] Use a strong `POSTGRES_PASSWORD`
- [ ] Enable HTTPS (add TLS certs to `nginx/ssl/`)
- [ ] Set `CORS_ORIGIN` to your exact domain
- [ ] Configure firewall: only expose ports 80/443 publicly; 3000/5432 internal only
- [ ] Set up automated PostgreSQL backups
- [ ] Review and restrict `MAX_FILE_SIZE_MB` for your use case
- [ ] Disable Docker host network access where not needed

---

## License

Private — internal use only. Do not expose to public internet without thorough security review.
