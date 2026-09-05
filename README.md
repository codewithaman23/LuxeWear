# LuxeWear

NOIR is a modern fashion storefront for browsing curated everyday essentials, managing a bag, saving favourites, and completing a protected checkout flow.

## Features

- Responsive premium storefront and product catalogue
- Search, category filters, price filters, and sorting
- Product detail pages with sizes, ratings, discounts, and quick view
- Persistent cart and wishlist interactions
- Protected checkout and account pages
- Email/password registration and login
- Email OTP architecture with SMTP delivery
- Secure session cookies and SQLite persistence
- Responsive mobile navigation and accessible form controls
- Subtle hover, reveal, modal, and toast interactions

## Tech stack

- Frontend: semantic HTML, CSS, and browser JavaScript
- Backend: Node.js and Express
- Database: SQLite through `better-sqlite3`
- Authentication: `scrypt` password hashing, expiring HTTP-only sessions, and rate-limited email OTP
- Email: Nodemailer with an SMTP provider

Google login and phone OTP are not enabled in this build because provider credentials and OAuth configuration are not present. The current authentication structure can be extended with those providers without exposing secrets to the browser.

## Local setup

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Open `http://localhost:3000`.

The application creates its SQLite database in the ignored `data/` directory on first start.

## Environment variables

Set these values in `.env`:

| Variable | Purpose |
| --- | --- |
| `PORT` | Local HTTP port, defaults to `3000` |
| `SESSION_SECRET` | Long random value used by the server session configuration |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM` | Verified sender address |

Never commit `.env`, credentials, API keys, OAuth secrets, or generated database files.

## Project structure

```text
.
├── image/              Product and campaign assets
├── js/
│   ├── app.js          Product cards, cart, wishlist, and storefront behavior
│   ├── auth.js         Login, registration, and OTP client behavior
│   └── guard.js        Protected-page session checks
├── account.html        Protected account view
├── cart.html           Bag view
├── checkout.html       Protected checkout form
├── index.html          Storefront homepage
├── login.html          Sign-in page
├── product.html        Product detail view
├── signup.html         Registration page
├── streetwear.html     Product catalogue
├── wishlist.html       Protected wishlist view
├── server.js           Express API and authentication server
├── style.css           Storefront design system
├── auth.css            Authentication page styles
├── product-cards.css   Product card and quick-view styles
└── .env.example        Safe configuration template
```

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Checkout currently uses the local storefront state for its demonstration order flow. A production payment provider and server-side order endpoint should be connected before taking real payments.
