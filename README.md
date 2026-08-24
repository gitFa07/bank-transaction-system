# Bank Transaction System

A backend banking and ledger service built with **Node.js, Express, MongoDB, and Mongoose**. The system provides user authentication, bank account management, balance calculation, atomic account-to-account transactions, immutable ledger entries, idempotent transaction processing, system-user initial funding, and email notifications.

## Live API

**Render:** https://bank-transaction-system-wdkl.onrender.com

**GitHub:** https://github.com/gitFa07/bank-transaction-system.git

---

## Features

- User registration and login
- JWT-based authentication
- Authentication through HTTP cookies or `Authorization: Bearer <token>`
- Password hashing with bcrypt
- Logout with JWT token blacklisting
- Automatic expiration of blacklisted tokens after 3 days
- Create bank accounts for authenticated users
- Retrieve all accounts belonging to the logged-in user
- Calculate account balance from ledger entries
- Account status management (`ACTIVE`, `FROZEN`, `CLOSED`)
- Account-to-account money transfers
- Atomic transactions using MongoDB sessions
- Double-entry-style ledger records using `DEBIT` and `CREDIT`
- Immutable ledger entries
- Idempotency keys to prevent duplicate transactions
- Transaction states: `PENDING`, `COMPLETED`, `FAILED`, `REVERSED`
- Protected system-user endpoint for initial account funding
- Registration email notifications
- Successful transaction email notifications
- Gmail OAuth2 authentication through Google Cloud credentials
- MongoDB indexes for commonly queried fields

---

## Tech Stack

### Backend

- **Node.js**
- **Express.js**
- **MongoDB**
- **Mongoose**
- **JWT (`jsonwebtoken`)**
- **bcryptjs**
- **cookie-parser**
- **Nodemailer**
- **Google Cloud / Gmail OAuth2**

### Architecture

The project follows a modular Express backend structure:

```text
bank-transaction-system/
├── server.js
└── src/
    ├── app.js
    ├── config/
    │   └── db.js
    ├── controllers/
    │   ├── account.controller.js
    │   ├── auth.controller.js
    │   └── transaction.controller.js
    ├── middleware/
    │   └── auth.middleware.js
    ├── models/
    │   ├── account.model.js
    │   ├── blacklist.model.js
    │   ├── ledger.model.js
    │   ├── transaction.model.js
    │   └── user.model.js
    ├── routes/
    │   ├── account.routes.js
    │   ├── auth.routes.js
    │   └── transaction.routes.js
    └── services/
        └── email.service.js
```

---

# API Documentation

Base URL:

```text
https://bank-transaction-system-wdkl.onrender.com
```

For local development:

```text
http://localhost:3000
```

## Authentication

Authenticated endpoints accept the JWT in either:

```http
Cookie: token=<JWT>
```

or:

```http
Authorization: Bearer <JWT>
```

---

# Authentication Routes

## Register

Creates a new user and automatically logs the user in by issuing a JWT.

```http
POST /api/auth/register
```

### Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Response

```json
{
  "user": {
    "_id": "USER_ID",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "token": "JWT_TOKEN"
}
```

A registration email is also sent to the user's email address.

---

## Login

Authenticates an existing user.

```http
POST /api/auth/login
```

### Request Body

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Response

```json
{
  "user": {
    "_id": "USER_ID",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "token": "JWT_TOKEN"
}
```

---

## Logout

Invalidates the current authentication token.

```http
POST /api/auth/logout
```

### Authentication

Required.

The token is added to a blacklist and automatically removed after 3 days using a MongoDB TTL index.

---

# Account Routes

All account routes require authentication.

## Create Account

Creates a bank account for the currently authenticated user.

```http
POST /api/accounts
```

### Response

```json
{
  "account": {
    "_id": "ACCOUNT_ID",
    "user": "USER_ID",
    "status": "ACTIVE",
    "currency": "INR"
  }
}
```

---

## Get User Accounts

Returns all accounts owned by the authenticated user.

```http
GET /api/accounts
```

### Response

```json
{
  "accounts": []
}
```

---

## Get Account Balance

Calculates the balance of an account from its ledger entries.

```http
GET /api/accounts/balance/:accountId
```

### Example

```http
GET /api/accounts/balance/ACCOUNT_ID
```

### Response

```json
{
  "accountId": "ACCOUNT_ID",
  "balance": 5000
}
```

The balance is derived as:

```text
Balance = Total Credits - Total Debits
```

This means the application does not need to maintain a mutable balance field on the account itself.

---

# Transaction Routes

## Create Transaction

Transfers money from one account to another.

```http
POST /api/transaction
```

### Authentication

Required.

### Request Body

```json
{
  "fromAccount": "FROM_ACCOUNT_ID",
  "toAccount": "TO_ACCOUNT_ID",
  "amount": 1000,
  "idempotencyKey": "unique-transaction-key-001"
}
```

### Transaction Flow

The backend:

1. Validates the request.
2. Validates both accounts.
3. Checks the idempotency key.
4. Verifies both accounts are `ACTIVE`.
5. Calculates the sender's balance from the ledger.
6. Rejects the transaction if the balance is insufficient.
7. Creates a `PENDING` transaction.
8. Creates a `DEBIT` ledger entry for the sender.
9. Creates a `CREDIT` ledger entry for the receiver.
10. Marks the transaction as `COMPLETED`.
11. Commits the MongoDB transaction.
12. Sends a transaction-success email.

### Response

```json
{
  "message": "Transaction completed successfully",
  "transaction": {
    "_id": "TRANSACTION_ID",
    "fromAccount": "FROM_ACCOUNT_ID",
    "toAccount": "TO_ACCOUNT_ID",
    "amount": 1000,
    "status": "COMPLETED",
    "idempotencyKey": "unique-transaction-key-001"
  }
}
```

---

## Create Initial Funds Transaction

Used by an authenticated system user to provide initial funds to an account.

```http
POST /api/transaction/system/initial-funds
```

### Authentication

Required.

The authenticated user must have `systemUser: true`.

### Request Body

```json
{
  "toAccount": "ACCOUNT_ID",
  "amount": 10000,
  "idempotencyKey": "initial-funds-001"
}
```

### Response

```json
{
  "message": "Initial funds transaction completed successfully",
  "transaction": {
    "_id": "TRANSACTION_ID",
    "status": "COMPLETED"
  }
}
```

---

# Data Model

## User

Stores user identity and authentication information.

Important fields:

- `name`
- `email`
- `password`
- `systemUser`
- `createdAt`
- `updatedAt`

Passwords are hashed using `bcryptjs` before being stored.

---

## Account

Represents a bank account belonging to a user.

Important fields:

- `user`
- `status`
- `currency`
- `createdAt`
- `updatedAt`

Supported account statuses:

```text
ACTIVE
FROZEN
CLOSED
```

---

## Transaction

Represents a transfer between two accounts.

Important fields:

- `fromAccount`
- `toAccount`
- `amount`
- `status`
- `idempotencyKey`
- `createdAt`
- `updatedAt`

Supported transaction statuses:

```text
PENDING
COMPLETED
FAILED
REVERSED
```

The `idempotencyKey` is unique and prevents the same transaction request from being processed more than once.

---

## Ledger

The ledger stores immutable financial entries.

Each entry contains:

- `account`
- `amount`
- `transaction`
- `type`

Supported types:

```text
CREDIT
DEBIT
```

Ledger entries are intentionally immutable. Update and delete operations are blocked through Mongoose middleware.

---

## Token Blacklist

Logged-out JWTs are stored temporarily in a blacklist collection.

A MongoDB TTL index automatically removes blacklist entries after 3 days.

---

# Transaction Consistency

The project uses **MongoDB sessions and transactions** when creating financial transactions.

A transfer consists of two ledger operations:

```text
Sender Account
      |
      | DEBIT
      v
Transaction
      |
      | CREDIT
      v
Receiver Account
```

For example, transferring ₹1,000:

```text
Sender Ledger:
DEBIT  ₹1,000

Receiver Ledger:
CREDIT ₹1,000
```

The account balance is then derived from the ledger:

```text
Balance = Credits - Debits
```

Using a database transaction helps ensure that the debit and credit operations are committed together.

---

# Idempotency

Transactions require an `idempotencyKey`.

Example:

```json
{
  "fromAccount": "ACCOUNT_A",
  "toAccount": "ACCOUNT_B",
  "amount": 1000,
  "idempotencyKey": "payment-12345"
}
```

If the same key is submitted again, the backend checks the existing transaction instead of creating another one.

This helps protect against duplicate transfers caused by:

- Network retries
- Client retries
- Duplicate API requests
- Request timeouts

---

# Email Notifications

The application uses **Nodemailer with Gmail OAuth2**.

Google Cloud credentials are used to authenticate with Gmail without storing a Gmail password in the application.

Emails are sent for:

### Registration

A welcome email is sent after successful registration.

### Successful Transaction

A transaction confirmation email is sent after a successful transfer.

The email service uses:

```text
EMAIL_USER
CLIENT_ID
CLIENT_SECRET
REFRESH_TOKEN
```

---

# Environment Variables

Create a `.env` file in the project root:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

CLIENT_ID=your_google_oauth_client_id
CLIENT_SECRET=your_google_oauth_client_secret
REFRESH_TOKEN=your_google_oauth_refresh_token
EMAIL_USER=your_gmail_address
```

### Environment variable description

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign and verify JWTs |
| `CLIENT_ID` | Google OAuth2 client ID |
| `CLIENT_SECRET` | Google OAuth2 client secret |
| `REFRESH_TOKEN` | Google OAuth2 refresh token |
| `EMAIL_USER` | Gmail account used to send emails |

**Never commit `.env` or OAuth credentials to GitHub.**

---

# Installation

## 1. Clone the repository

```bash
git clone https://github.com/gitFa07/bank-transaction-system.git
```

```bash
cd bank-transaction-system
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create a `.env` file and add the required variables.

## 4. Start the server

For development:

```bash
npm run dev
```

For production:

```bash
npm start
```

The server runs on:

```text
http://localhost:3000
```

---

# Deployment

The backend is deployed on **Render**.

Live API:

```text
https://bank-transaction-system-wdkl.onrender.com
```

When deploying to Render, add the required environment variables through the Render dashboard rather than committing them to the repository.

---

# Security

The project implements several security mechanisms:

- Password hashing with bcrypt
- JWT authentication
- HTTP cookie-based token storage
- Authorization middleware
- System-user authorization
- JWT blacklist on logout
- Automatic blacklist expiration
- Unique transaction idempotency keys
- Immutable ledger entries
- Account ownership validation when retrieving balances
- MongoDB transactions for financial operations
- OAuth2 for Gmail authentication

---

# Project Architecture

The backend follows a layered Express architecture:

```text
Client
  |
  v
Routes
  |
  v
Middleware
  |
  v
Controllers
  |
  +---------> Services
  |
  v
Models
  |
  v
MongoDB
```

### Routes

Define API endpoints and connect them to controllers.

### Middleware

Handles authentication and system-user authorization.

### Controllers

Contain request validation and business logic.

### Models

Define MongoDB schemas and database behavior.

### Services

Handle reusable external integrations such as email delivery.

### Config

Contains database connection configuration.

---

# API Summary

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register user |
| `POST` | `/api/auth/login` | No | Login |
| `POST` | `/api/auth/logout` | Token | Logout |
| `POST` | `/api/accounts` | Required | Create account |
| `GET` | `/api/accounts` | Required | Get user's accounts |
| `GET` | `/api/accounts/balance/:accountId` | Required | Get account balance |
| `POST` | `/api/transaction` | Required | Transfer money |
| `POST` | `/api/transaction/system/initial-funds` | System user | Add initial funds |

---

# Future Improvements

Potential improvements for future versions include:

- Transaction history endpoint
- Account statement generation
- Admin dashboard
- Account freeze/unfreeze APIs
- Transaction reversal functionality
- Rate limiting
- Request validation middleware
- Centralized error-handling middleware
- API documentation with Swagger/OpenAPI
- Improved transaction audit logs
- Pagination for transaction history
- Automated tests
- CI/CD pipeline
- Production-grade logging and monitoring

---

## License

This project is intended as a backend engineering project for learning, development, and portfolio purposes.
