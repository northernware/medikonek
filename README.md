# MEDIKONEK

Appointments and medical records for family practice, organised by household.

A doctor signs in, creates a **family**, adds its members as **patients**, books
**appointments** against one of fifteen services, and documents each visit as a
**medical record** with vitals, assessment, plan and prescriptions. A month
**calendar** shows which days are booked and at what times. Everything a doctor
creates is visible only to that doctor.

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
with two households, seven patients, seventeen appointments spread across the
month and a few past encounters.
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
| `npm run db:migrate` | Create and apply a migration (needs `SHADOW_DATABASE_URL`) |
| `npm run db:seed` | Load the demo practice |
| `npm run db:studio` | Prisma Studio |

## How it fits together

```
app/
  (auth)/            login and register — redirects to / when already signed in
  (app)/             everything behind the session gate
    page.tsx         today's clinic, counts, recently documented
    calendar/        month grid of booked days and times, plus a day panel
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

### Booking rules

One module, `lib/scheduling.ts`, holds the clinic's rules: open 8:00 AM to
5:00 PM, closed Sundays, and a booking must be at least one day ahead (and at
most 180). The booking form mirrors them — the date input is bounded, Sundays
explain themselves, and the slot grid only offers times a visit of that length
actually fits into — but `checkBookingRules` on the server is what decides. A
stale slot list and a direct POST both land there.

Overlap is checked the same way: the form greys out any start time that would
collide with an existing booking, and the action re-checks against the whole
clinic day before writing, so two people racing for the last slot cannot both
get it.

### Services

Every appointment carries a `ServiceType` from a fixed list of fifteen — general
consultation, family checkup, follow-up, routine physical, pediatric, senior
citizen, prenatal/postnatal, chronic disease management, prescription renewal,
laboratory result review, medical certificate, vaccination, minor injury and
wound care, teleconsultation, and referral. The catalogue lives in one place,
`SERVICES` in `lib/domain.ts`, which also carries each service's description and
its default slot length. Duration is derived from the service rather than asked
for — the slot picker needs to know how much of the day a visit consumes.
Free-text `reason` still carries the specifics.

### Calendar

`/calendar?month=YYYY-MM&day=YYYY-MM-DD` renders whole Sunday-first weeks for the
month, each day cell showing its booked times in a compact form (`9:00a`) with a
colour per status — phones get density dots instead, where there is no room for
text. The selected day's full schedule sits in a sticky panel **beside** the
grid on large screens, stacking underneath on small ones. Selecting an empty day
offers a booking link prefilled to it, and picking a leading or trailing cell
moves the grid to that neighbouring month. Days are bucketed by a
clinic-timezone `YYYY-MM-DD` key, so the month query stays a single indexed
range scan.

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

**A patient-facing portal.** The doctor books on the patient's behalf today.
Patients choosing their own slot needs patient accounts, a public booking flow,
and a review step for `PENDING` requests. `BookingSource.PATIENT_PORTAL` exists
so those bookings will be distinguishable when it lands.

**Multiple doctors per clinic.** One account is one doctor, and every query
scopes to the signed-in doctor's own records. A "which doctor" field on booking
needs a clinic that owns doctors, per-doctor availability, and a rethink of that
scoping — it is not a dropdown.

**Attending family members.** `FAMILY_CHECKUP` labels the visit but still books
one patient. Several members in one appointment needs a join table and a
decision about whose record the encounter belongs to.

**Attachments** (labs, referral letters, images) need file storage, which the
app has none of yet.

**Reminders** are recorded as a preference only; nothing sends anything.

Also outstanding: repeat/recurring appointments, week and day calendar views,
per-doctor working hours and holidays beyond the fixed Sunday closure,
printable prescriptions and medical certificates, an audit trail of who changed
what, and soft deletes — deletion is permanent.
