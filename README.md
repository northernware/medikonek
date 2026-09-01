# MEDIKONEK

Appointments and medical records for family practice, organised by household.

A doctor signs in, creates a **family**, adds its members as **patients**, books
**appointments**, and documents each visit as a **medical record** with vitals,
assessment, plan and prescriptions. Everything a doctor creates is visible only
to that doctor.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + React 19
- **Prisma 7** against **PostgreSQL**, via the `@prisma/adapter-pg` driver adapter
- **Tailwind CSS v4** with a light/dark clinical palette in `app/globals.css`
- **Auth**: email + bcrypt password, session as a signed JWT (`jose`) in an
  HttpOnly cookie
- **Validation**: Zod schemas shared by every server action

## Getting started

```bash
npm install
cp .env.example .env        # then fill in SESSION_SECRET (see below)
npm run db:start            # local Postgres, no Docker needed
npm run db:migrate          # apply migrations
npm run db:seed             # optional: a demo practice to click around in
npm run dev
```

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

The seed creates a demo doctor — **doctor@medikonek.test** / **medikonek-demo** —
with two households, seven patients, today's clinic and a few past encounters.
Delete it before going anywhere near real data.

### Database

`npm run db:start` runs a local Prisma Postgres instance in the background and
serves it at `postgres://postgres:postgres@localhost:51214/template1`. Any
PostgreSQL connection string works instead — point `DATABASE_URL` at Neon,
Supabase, RDS or your own server and the migrations apply unchanged.
`npm run db:stop` shuts the local instance down.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:start` / `db:stop` | Local Postgres instance |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Load the demo practice |
| `npm run db:studio` | Prisma Studio |

## How it fits together

```
app/
  (auth)/            login and register — redirects to / when already signed in
  (app)/             everything behind the session gate
    page.tsx         today's clinic, counts, recently documented
    families/        list, create, edit, household detail, add a member
    patients/        list, chart, edit
    appointments/    list (upcoming/past/all), booking, detail, reschedule
    records/         document a visit, view, edit
  actions/           server actions — one module per resource
lib/
  auth.ts            getCurrentDoctor / requireDoctor
  session.ts         JWT cookie create / read / destroy
  prisma.ts          client + pg driver adapter, cached across hot reloads
  validation.ts      Zod schemas and the FormState shape forms read
  datetime.ts        clinic-timezone formatting and input parsing
  domain.ts          enum labels, age, BP, BMI
components/          UI kit, shared lists, and the four forms
```

### Data model

`Doctor → Family → Patient`, with `Appointment` and `MedicalRecord` hanging off a
patient and `Prescription` off a record. A record optionally links to the
appointment it documents; making that link marks the appointment completed.

### Security notes

- Server Actions are reachable by direct POST, so **every** action calls
  `requireDoctor()` and scopes its query by `doctorId` — the layout guard is
  convenience, not the boundary. Reads and writes for another doctor's ids come
  back as 404 / "not on your list", never as data.
- Passwords are bcrypt with cost 12. A failed login compares against a decoy
  hash so a wrong email and a wrong password take the same time, and the error
  never says which was wrong.
- The session cookie is HttpOnly, SameSite=Lax, and Secure in production.
  Rotating `SESSION_SECRET` signs everyone out.

### Timezone

Appointment times are rendered in the clinic's timezone rather than the
viewer's, so server-rendered markup and the doctor's wall clock agree. It
defaults to `Asia/Manila`; set `NEXT_PUBLIC_CLINIC_TIMEZONE` to change it.

## Not yet built

Nurse/staff roles and shared access, file attachments (labs, imaging),
printable prescriptions and medical certificates, appointment reminders, an
audit trail of who changed what, and per-record soft deletes. The current
delete actions are permanent.
