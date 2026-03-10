# rbxl.eu — Really Beautiful eXtraordinary Link

A lightweight, production-ready personal bio/profile hosting platform styled with **Material You (Material Design 3)**. Create beautiful custom profile pages with links, media embeds, badges, and animations.

![Home Page](https://github.com/user-attachments/assets/34915dab-ace8-4795-b9f7-011ba48125b0)

## Features

- **Material You Design** — Full Material Design 3 with dynamic color theming, elevated surfaces, rounded components, and smooth animations
- **Custom Profiles** — Avatar, banner, bio, social links, media embeds, badges, and custom themes at `domain.tld/@username`
- **Click-to-Enter System** — Aesthetic intro overlay before viewing each profile (toggleable)
- **Unique Tag System** — Discord-style `@username#0000` identity
- **Animation Controls** — Toggle animations, hover effects, animated backgrounds, and entry animations per-profile
- **Badge System** — Earn and display badges (Early User, Verified, Developer, Donator, Admin, custom)
- **Media Embeds** — YouTube, Spotify, SoundCloud, Twitch embeds with secure sanitization
- **Admin Panel** — User management, badge management, analytics, content moderation
- **REST API** — Full programmatic access for registration, login, profiles, and links
- **Security** — Rate limiting, XSS protection, secure cookies, bcrypt password hashing, input validation
- **Docker Ready** — Alpine-optimized Dockerfile + docker-compose with Caddy reverse proxy
- **Profile View Counter** — Track profile visits

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Views | EJS templates (SSR) |
| Styling | Custom Material You CSS |
| Auth | express-session + bcryptjs |
| Web Server | Caddy (reverse proxy, auto HTTPS) |
| Container | Docker (Alpine) |

## Quick Start

### Local Development

```bash
cd backend
npm install
npm run migrate
npm run seed        # Creates admin user + default badges
npm run dev         # Starts with --watch on port 3000
```

Visit `http://localhost:3000`. Default admin: `admin` / `admin123`

### Docker Deployment

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your secrets

# Build and run
docker compose up -d
```

For production with your domain, edit `caddy/Caddyfile`:
```
rbxl.eu {
    reverse_proxy app:3000
}
```

## URL Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Home page |
| `/@username` | Public | Profile page (click-to-enter) |
| `/register` | Public | Registration |
| `/login` | Public | Login |
| `/dashboard` | Auth | Profile editor, links, embeds |
| `/admin` | Admin | Admin dashboard + analytics |
| `/admin/users` | Admin | User management |
| `/admin/badges` | Admin | Badge management |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/register` | Register new user |
| `POST` | `/api/login` | Login |
| `GET` | `/api/profile/:username` | Get public profile data |
| `PUT` | `/api/profile` | Update own profile (auth) |
| `POST` | `/api/links` | Add link (auth) |
| `DELETE` | `/api/links/:id` | Delete link (auth) |

## Database Schema

- **users** — id, username, tag, password_hash, is_admin, is_banned
- **profiles** — user_id, bio, avatar, banner, theme/accent colors, background, animations, layout, views
- **links** — user_id, title, url, link_type, sort_order
- **badges** — name, label, icon, color, description
- **user_badges** — user_id, badge_id, granted_by
- **embeds** — user_id, embed_type, embed_url, title

## Project Structure

```
rbxl.eu/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express app entry point
│   │   ├── db/                   # Database schema, migrations, seeds
│   │   ├── routes/               # Auth, profile, API, admin routes
│   │   ├── middleware/           # Auth guards, validation
│   │   ├── views/                # EJS templates
│   │   │   ├── admin/            # Admin panel views
│   │   │   ├── partials/         # Nav, shared components
│   │   │   └── layouts/          # Base layouts
│   │   └── public/               # Static assets
│   │       ├── css/              # Material You + app styles
│   │       └── js/               # Client-side scripts
│   └── package.json
├── caddy/
│   └── Caddyfile                 # Caddy reverse proxy config
├── Dockerfile                    # Alpine-based production image
├── docker-compose.yml            # App + Caddy services
├── .env.example                  # Environment template
└── README.md
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `SESSION_SECRET` | dev default | Session encryption key |
| `DB_PATH` | `data/rbxl.db` | SQLite database path |
| `ADMIN_PASSWORD` | `admin123` | Initial admin password (seed only) |
| `NODE_ENV` | `development` | Set `production` for secure cookies |

## License

MIT
