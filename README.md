# TripSplit

**Plan Together · Spend Together · Travel Better**

TripSplit is a travel-planning and expense-sharing app for friends. It keeps trip dates, day-by-day plans, shared expenses, balances, settlements and photos together in one journal-style workspace.

## Features

- Email/password authentication with JWT sessions and guest traveler claiming.
- Create and manage trips, travelers, itinerary activities and photos.
- Equal, weighted custom, percentage and exact expense splits, stored as integer minor units.
- Backend-computed balances and minimal suggested settlements.
- Profile, currency, notification and theme preferences.
- Responsive welcome, dashboard, trip overview, itinerary, expense, balance, traveler, photo and settings screens.
- Local image storage behind a `StorageProvider` interface.

## Stack

- Client: React 18, TypeScript, Vite, React Router 6, Tailwind CSS, Lucide, Axios, React Hook Form, Zod and Recharts.
- Server: Node.js, Express, TypeScript, Zod, Helmet, CORS, rate limiting, Morgan and Multer.
- Database: MongoDB and Mongoose.
- Tests: Vitest; Supertest is available for API tests.

## Project Layout

```text
client/       React app, API client, contexts, pages, components and styles
server/       Express API, models, services, middleware, seed and tests
docs/         Project documentation and visual references
```

## Requirements

- Node.js 20 or newer and npm.
- MongoDB 6 or newer, running locally or hosted by MongoDB Atlas.

## Install and Run

1. Install dependencies from the repository root:

   ```sh
   npm install
   ```

2. Copy `server/.env.example` to `server/.env` and set `MONGO_URI` and a random `JWT_SECRET` of at least 32 characters. Copy `client/.env.example` to `client/.env` if the API URL differs from its default.

3. Start MongoDB. A local Docker option is:

   ```sh
   docker run --name tripsplit-mongo -p 27017:27017 -d mongo:7
   ```

   For Atlas, create a database user, allow the development IP in Network Access, and set the Atlas connection string as `MONGO_URI`.

4. Seed sample content (this clears and recreates the TripSplit collections):

   ```sh
   npm run seed
   ```

5. Start the API and web app:

   ```sh
   npm run dev
   ```

   Client: <http://localhost:5173>  
   API: <http://localhost:5000/api>

## Deploy to Vercel

TripSplit can be deployed as one Vercel project: Vite serves the client, and the Express API runs as a Vercel Function. Import this repository with the project root set to the repository root. The included `vercel.json` builds the workspaces and publishes `client/dist`.

Before using the deployment:

1. Use a hosted MongoDB deployment such as MongoDB Atlas; a local MongoDB URL is not reachable from Vercel.
2. Add `MONGO_URI`, `JWT_SECRET` (at least 32 characters), and `CLIENT_URL` (the deployed app origin) as Vercel environment variables for Production and Preview. Keep these values private and never commit them.
3. Create a Vercel Blob store and connect it to the Vercel project. The serverless API uses Blob for persistent uploaded images; local development continues to use the local storage provider.
4. Deploy. In production, the client defaults to the same-origin `/api` endpoint.

The API opens and reuses a MongoDB connection when handling function requests. Vercel's local function filesystem is temporary, so do not use local uploads for deployed user content.

## Environment

`server/.env`:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string (required) |
| `JWT_SECRET` | Random signing secret, at least 32 characters (required) |
| `JWT_EXPIRES_IN` | Token lifetime; defaults to `7d` |
| `PORT` | API port; defaults to `5000` |
| `CLIENT_URL` | Allowed browser origin; defaults to `http://localhost:5173` |

`client/.env`:

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL; defaults to `http://localhost:5000/api` |

The server validates its required configuration at startup and reports missing or invalid values before accepting requests. Secrets belong only in ignored `.env` files.

## API Overview

Successful responses use `{ "success": true, "data": ... }`. Errors use `{ "success": false, "message": ..., "errors"?: ... }`. Authenticated requests send `Authorization: Bearer <token>`.

| Method | Route | Auth | Request / result |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | `{ name, email, password }` → `{ user, token }` |
| POST | `/api/auth/login` | No | `{ email, password }` → `{ user, token }` |
| GET | `/api/auth/me` | Yes | → `{ user }` |
| GET / POST | `/api/trips` | Yes | List trips; create with `{ name, destination, startDate, endDate, currency, coverImage?, quote? }` |
| GET / PUT / DELETE | `/api/trips/:tripId` | Member / organizer | Read summary; update or delete a trip |
| GET / POST | `/api/trips/:tripId/travelers` | Member / organizer | List or add `{ email, name?, role?, preferences? }` |
| GET / POST | `/api/trips/:tripId/activities` | Member | List by optional `day`; create an activity |
| PUT / DELETE | `/api/activities/:activityId` | Creator / organizer | Update or remove an activity |
| GET / POST | `/api/trips/:tripId/expenses` | Member | List by optional `category`; create an expense and split |
| GET / PUT / DELETE | `/api/expenses/:expenseId` | Member / creator / organizer | Read, update or delete an expense |
| GET | `/api/trips/:tripId/balance` | Member | → currency, member balances and suggested settlements |
| GET | `/api/trips/:tripId/settlements` | Member | Settlement history |
| POST | `/api/settlements/:id/settle` | Involved member / organizer | Mark a pending settlement complete |
| GET / POST | `/api/trips/:tripId/photos` | Member | List photos; multipart `file`, optional `caption`, `day`, `activity` |
| DELETE | `/api/photos/:photoId` | Uploader / organizer | Remove a photo and stored file |
| GET | `/api/trips/:tripId/stats` | Member | Expense, activity, traveler, day and category totals |
| POST | `/api/upload/avatar`, `/api/upload/trip-cover` | Yes | Multipart image field `file` → `{ url }` |
| PUT | `/api/users/me` | Yes | Update profile and preferences |
| PUT / DELETE | `/api/users/me/password`, `/api/users/me` | Yes | Change password or delete account with password confirmation |

Expense amounts and computed shares use integer minor units (for example, paise). The API balance and settlement services are the only source of truth for balances.

## Sample Accounts

All sample accounts use password `Password123!`:

- `ganavi@tripsplit.dev` (organizer)
- `aisha@tripsplit.dev`
- `riya@tripsplit.dev`

Seed data includes Bali Besties (₹21,600 total), Goa Weekend, five Bali itinerary days, locally generated covers/avatars/photos, and expenses using equal, percentage, exact and custom splits.

## Checks

```sh
npm run test
npm run build
```

For direct TypeScript checks: `cd server && npx tsc --noEmit`; for client source, run `cd client && npx tsc --noEmit -p tsconfig.app.json`.

## Troubleshooting

- **MongoDB connection fails:** Check `MONGO_URI`, confirm the database is running, and verify Atlas network access and credentials.
- **CORS error:** Set `CLIENT_URL` to the exact browser origin, including scheme and port, then restart the API.
- **Port already in use:** Set `PORT` for the server. Vite chooses another available port when 5173 is occupied.
- **Upload fails:** The API accepts JPG, PNG and WebP images up to 5 MB. Ensure `server/uploads` is writable.
- **JWT configuration error:** Set a random `JWT_SECRET` with at least 32 characters. Existing browser sessions can be cleared by logging in again.
- **Seed command reconnects slowly:** Confirm MongoDB is reachable before running `npm run seed`.