# Node.js Pure Auth Service (No Express)

This project is a pure Node.js (no Express) authentication microservice with:
- Register + email verification (OTP via SMTP)
- Login (access token + refresh token)
- Refresh token endpoint
- Logout (invalidate refresh token)
- Role-based users (user/admin)
- Rate limiting (in-memory)
- Forgot password (OTP) & Reset password (OTP)
- Protected `/profile` route

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill values:
- `MONGO_URI`: your MongoDB connection string (local or Atlas)
- `SMTP_*`: your SMTP server credentials (Gmail SMTP example given)
- `JWT_SECRET`, `REFRESH_TOKEN_SECRET`: strong secrets

3. Start MongoDB and start the server:
```bash
npm start
```

## Endpoints

- `POST /register`  
  Body: `{ "name","email","password", "role" }`  
  Response: 201 created, sends verification OTP to email.

- `POST /verify-email`  
  Body: `{ "email","otp" }`

- `POST /login`  
  Body: `{ "email","password" }`  
  Response: `{ accessToken, refreshToken }`

- `POST /token`  
  Body: `{ "refreshToken" }` -> returns new accessToken

- `POST /logout`  
  Body: `{ "refreshToken" }` -> invalidates refresh token

- `GET /profile`  
  Header: `Authorization: Bearer <accessToken>` -> returns user info

- `POST /forgot-password`  
  Body: `{ "email" }` -> sends OTP to email

- `POST /reset-password`  
  Body: `{ "email","otp","newPassword" }` -> resets password

## Notes

- Rate limiting is in-memory; for production use Redis.
- Store secrets securely and use HTTPS in production.
- For Gmail SMTP, generate an App Password.

