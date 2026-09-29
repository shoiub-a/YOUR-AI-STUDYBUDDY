# AI StudyBuddy API

An AI-powered educational backend built with **Node.js, Express, MongoDB, and Gemini 2.5 Flash**.

## Features
- JWT auth stored in **HTTP-only cookies** (access + refresh tokens)
- Role-Based Access Control (student / admin)
- Upload study materials (.txt, .md, .pdf)
- AI-powered: summarize, flashcards, quiz, study plan via Gemini 2.5 Flash

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create `.env` file
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ai-studybuddy
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
# Optional: set a different model enabled for your API key to fail over on 503.
# GEMINI_FALLBACK_MODEL=your_available_fallback_model
NODE_ENV=development
```

Gemini requests retry temporary 503 errors twice. If `GEMINI_FALLBACK_MODEL` is
configured, requests use it when the primary model returns 429 or still returns
503 after retries. The fallback can also be limited by its own quota.

### 3. Run the server
```bash
node index.js
```

---

## Project Structure
```
ai-studybuddy/
├── index.js                     # Entry point
├── uploads/                     # Temp file storage
└── src/
    ├── controllers/
    │   ├── authController.js    # register, login, refresh, logout
    │   ├── materialController.js# upload + all AI features
    │   └── adminController.js   # admin-only routes
    ├── middleware/
    │   ├── auth.js              # protect + adminOnly
    │   └── upload.js            # multer config
    ├── models/
    │   ├── User.js
    │   └── Material.js
    ├── routes/
    │   ├── auth.js
    │   ├── materials.js
    │   └── admin.js
    └── utils/
        ├── db.js                # MongoDB connection
        ├── gemini.js            # Gemini AI helper
        └── tokens.js            # JWT + cookie helpers
```

---

## API Reference

### Auth Routes — `/api/auth`

| Method | Endpoint    | Body                          | Description          |
|--------|-------------|-------------------------------|----------------------|
| POST   | /register   | `name, email, password`       | Register a student   |
| POST   | /login      | `email, password`             | Login                |
| POST   | /refresh    | —                             | Refresh tokens       |
| POST   | /logout     | —                             | Sign out             |

> Public registration always creates a `student` account. Admin accounts must be created directly in the database or through a restricted server-side process.
> Auth uses the `Authorization: Bearer <token>` header. Tokens are returned in the JSON response and are not stored in cookies.

---

### Material Routes — `/api/materials` *(requires login)*

| Method | Endpoint              | Body / Notes                          | Description              |
|--------|-----------------------|---------------------------------------|--------------------------|
| POST   | /upload               | Form-data: `file` + optional `title`  | Upload study material    |
| GET    | /                     | —                                     | List your materials      |
| GET    | /:id                  | —                                     | Get one material         |
| DELETE | /:id                  | —                                     | Delete material          |
| POST   | /:id/summarize        | —                                     | AI summarize             |
| POST   | /:id/flashcards       | `{ count: 5 }`                        | Generate flashcards      |
| POST   | /:id/quiz             | `{ count: 5 }`                        | Generate MCQ quiz        |
| POST   | /:id/study-plan       | `{ goal, hoursPerDay, days }`         | Personalized study plan  |

---

### Admin Routes — `/api/admin` *(admin role only)*

| Method | Endpoint      | Description                        |
|--------|---------------|------------------------------------|
| GET    | /users        | List all users                     |
| DELETE | /users/:id    | Delete user + their materials      |
| GET    | /stats        | Total users & materials count      |

---

## Token Details

| Token          | Expiry   | Transport                    |
|----------------|----------|------------------------------|
| `accessToken`  | 15 min   | `Authorization: Bearer ...` |
| `refreshToken` | 7 days   | `x-refresh-token` header     |

The API returns both tokens in JSON, and the client must attach the access token to protected requests using the Bearer scheme.
