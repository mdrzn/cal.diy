/**
 * CORSI: one-off migration seed for Calendly → Cal.diy event types.
 *
 * Idempotent: re-running this won't duplicate event types (upsert on userId+slug).
 *
 * Run inside the calcom container (Dokploy → app → Open Terminal):
 *
 *   cd /calcom && npx ts-node --transpile-only scripts/corsi-seed-event-types.ts
 *
 * What this script does:
 *  - Resolves a target user (marketing@corsi.it by default; change OWNER_EMAIL).
 *  - Creates two shared Schedule records: a "Default working hours" schedule
 *    matching the Calendly weekly pattern, and a single-day "Wed only" schedule.
 *  - Upserts 15 EventType rows mirroring the Calendly "Corsiit" personal events.
 *
 * What this script does NOT do (configure manually in the cal.diy UI after seed):
 *  - Custom booking questions (Phone, Dropdown, Radio, Checkbox fields). The
 *    base name+email fields work out of the box; add the extras in the UI.
 *  - Date-specific schedule overrides (Events #3-7 with 20+ specific dates).
 *    These need either UI configuration on the Schedule, or a follow-up script.
 *  - Workflows: cal.diy removed the Workflows feature. Reminders are handled
 *    by your CRM per the customer's setup.
 *  - "Shared" events (#16-21 in the recap): those belong to other users (e.g.
 *    Tutor Corsi.it = claudio@corsi.it). Once those accounts exist, run the
 *    same script with OWNER_EMAIL pointed at them and a different event list.
 */
import prisma from "@calcom/prisma";

// ---------- CONFIG ----------
const OWNER_EMAIL = "marketing@corsi.it";

// Color presets — cal.com stores eventTypeColor as JSON with light + dark variants.
const COLOR = {
  purple: { lightEventTypeColor: "#7C3AED", darkEventTypeColor: "#A78BFA" },
  green: { lightEventTypeColor: "#10B981", darkEventTypeColor: "#6EE7B7" },
  blue: { lightEventTypeColor: "#1D4ED8", darkEventTypeColor: "#60A5FA" },
  teal: { lightEventTypeColor: "#0891B2", darkEventTypeColor: "#67E8F9" },
  orange: { lightEventTypeColor: "#F97316", darkEventTypeColor: "#FB923C" },
  red: { lightEventTypeColor: "#EF4444", darkEventTypeColor: "#FCA5A5" },
};

// Location presets.
const LOC = {
  meet: [{ type: "integrations:google:meet" }],
  zoom: [{ type: "integrations:zoom" }],
  phone: [{ type: "phone" }],
  // "Custom — we'll contact you" type. Stored as the generic "user-decides"
  // location so the actual mechanism (WhatsApp, phone call, whatever) is
  // explained in the description.
  custom: [{ type: "somewhereElse" }],
};

// ---------- SCHEDULES ----------
// Calendly's "Working hours (default)" — used by events 2, 8, 10, 11, 12, 13, 14.
// Mon: 09:00-16:00 + 17:00-18:30 / Tue: 09:00-18:30 / Wed: 09:00-18:00
// Thu: 09:00-18:30 / Fri: 09:00-17:00 / Sat-Sun: closed
const DEFAULT_HOURS = [
  // Sunday = 0, Monday = 1, ... Saturday = 6
  { days: [1], start: "09:00", end: "16:00" },
  { days: [1], start: "17:00", end: "18:30" },
  { days: [2], start: "09:00", end: "18:30" },
  { days: [3], start: "09:00", end: "18:00" },
  { days: [4], start: "09:00", end: "18:30" },
  { days: [5], start: "09:00", end: "17:00" },
];

// Event 9's special schedule: Wed only, 09:00-18:00.
const WEDNESDAY_ONLY = [{ days: [3], start: "09:00", end: "18:00" }];

// Helper: turn HH:MM into a UTC Date with year=1970 (cal.com convention).
function timeStr(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date("1970-01-01T00:00:00.000Z");
  d.setUTCHours(h, m, 0, 0);
  return d;
}

async function upsertSchedule(
  userId: number,
  name: string,
  slots: { days: number[]; start: string; end: string }[]
): Promise<number> {
  // Find by user+name; if exists, return id; else create with availabilities.
  const existing = await prisma.schedule.findFirst({ where: { userId, name } });
  if (existing) return existing.id;

  const schedule = await prisma.schedule.create({
    data: {
      userId,
      name,
      timeZone: "Europe/Rome",
      availability: {
        create: slots.map((s) => ({
          userId,
          days: s.days,
          startTime: timeStr(s.start),
          endTime: timeStr(s.end),
        })),
      },
    },
  });
  return schedule.id;
}

// ---------- EVENT TYPE DEFINITIONS ----------
// Subset of EventType fields. Anything left undefined keeps Prisma defaults.
type EventDef = {
  title: string;
  slug: string;
  length: number;
  description: string | null;
  locations: any;
  eventTypeColor: any;
  minimumBookingNotice: number; // minutes
  slotInterval: number; // minutes
  seatsPerTimeSlot?: number;
  lockTimeZoneToggleOnBookingPage?: boolean;
  successRedirectUrl?: string | null;
  scheduleName?: "default" | "wednesday";
  periodDays?: number; // booking window in days
};

const EVENTS: EventDef[] = [
  {
    title: "Richiesta info post diretta per Imprenditori Liberi",
    slug: "richiesta-info-post-diretta-imprenditori-liberi",
    length: 45,
    description:
      "Verrai contattato da un nostro Tutor. Lascia il tuo numero di telefono qui sotto.",
    locations: LOC.custom,
    eventTypeColor: COLOR.purple,
    minimumBookingNotice: 30,
    slotInterval: 45,
    seatsPerTimeSlot: 3,
    periodDays: 60,
  },
  {
    title: "Video Chiamata Benvenuto | MMI",
    slug: "video-chiamata-benvenuto-mmi",
    length: 20,
    description:
      "Prenota il tuo spazio scegliendo la fascia oraria più comoda in base alle tue esigenze. Aggiungi l'evento al calendario, troverai il link per la chiamata nei dettagli dell'evento!",
    locations: LOC.meet,
    eventTypeColor: COLOR.green,
    minimumBookingNotice: 1440,
    slotInterval: 10,
    lockTimeZoneToggleOnBookingPage: true,
    scheduleName: "default",
    periodDays: 12,
  },
  {
    title: "MMI | Mentoring",
    slug: "mmimentoring",
    length: 90,
    description: "Il tema del mese di 🌸 MAGGIO è Fioritura e riconoscimento.",
    locations: LOC.zoom,
    eventTypeColor: COLOR.purple,
    minimumBookingNotice: 240,
    slotInterval: 30,
    seatsPerTimeSlot: 300,
    periodDays: 8,
    // Date-specific schedule — needs UI configuration after seed.
  },
  {
    title: "4°_MMI | Coaching di gruppo",
    slug: "4-mmi-coaching-di-gruppo",
    length: 60,
    description: "Prenota il tuo spazio per il Coaching!",
    locations: LOC.zoom,
    eventTypeColor: COLOR.green,
    minimumBookingNotice: 120,
    slotInterval: 60,
    seatsPerTimeSlot: 200,
    lockTimeZoneToggleOnBookingPage: true,
    periodDays: 11,
  },
  {
    title: "3°_MMI | Coaching di gruppo",
    slug: "3-mmi-coaching-di-gruppo",
    length: 60,
    description: "Prenota il tuo spazio per il Coaching!",
    locations: LOC.zoom,
    eventTypeColor: COLOR.green,
    minimumBookingNotice: 120,
    slotInterval: 60,
    seatsPerTimeSlot: 200,
    lockTimeZoneToggleOnBookingPage: true,
    periodDays: 11,
  },
  {
    title: "2°_MMI | Coaching di gruppo",
    slug: "2-mmi-coaching-di-gruppo",
    length: 60,
    description: "Prenota il tuo spazio per il Coaching!",
    locations: LOC.zoom,
    eventTypeColor: COLOR.green,
    minimumBookingNotice: 120,
    slotInterval: 60,
    seatsPerTimeSlot: 200,
    lockTimeZoneToggleOnBookingPage: true,
    periodDays: 11,
  },
  {
    title: "1°_MMI | Coaching di gruppo",
    slug: "1-mmi-coaching-di-gruppo",
    length: 60,
    description: "Prenota il tuo spazio per il Coaching!",
    locations: LOC.zoom,
    eventTypeColor: COLOR.teal,
    minimumBookingNotice: 120,
    slotInterval: 60,
    seatsPerTimeSlot: 200,
    lockTimeZoneToggleOnBookingPage: true,
    periodDays: 11,
  },
  {
    title: "Supporto Master",
    slug: "supporto-master",
    length: 20,
    description:
      "Prenota un incontro con il team di Corsi.it per ricevere il giusto supporto per il tuo master.",
    locations: LOC.meet,
    eventTypeColor: COLOR.blue,
    minimumBookingNotice: 1440,
    slotInterval: 20,
    lockTimeZoneToggleOnBookingPage: true,
    scheduleName: "default",
    periodDays: 14,
  },
  {
    title: "Consulenza sul Master MBI",
    slug: "consulenza-mbi-1-to-1",
    length: 30,
    description:
      "In questa sessione di 30 minuti riceverai:\n• 🧠 Analisi della tua situazione attuale\n• 📊 Identificazione dei blocchi alla crescita del tuo business\n• 📋 Piano d'azione personalizzato\n• 🔷 Valutazione fit con il Master\n\nTutto questo gratuitamente e senza impegno.",
    locations: LOC.meet,
    eventTypeColor: COLOR.blue,
    minimumBookingNotice: 60,
    slotInterval: 30,
    scheduleName: "wednesday",
    periodDays: 7,
    // successRedirectUrl: fill in your post-booking CRM URL in the UI.
  },
  {
    title: "Benvenuto nel Master in Coaching",
    slug: "benvenuto-coach",
    length: 20,
    description:
      "Prenota la tua chiamata di benvenuto nel Master in Coaching.",
    locations: LOC.meet,
    eventTypeColor: COLOR.orange,
    minimumBookingNotice: 2160, // 36h
    slotInterval: 10,
    scheduleName: "default",
    periodDays: 10,
  },
  {
    title: "Benvenuto nel Bootcamp AI",
    slug: "benvenuto-smm-bootcamp",
    length: 20,
    description: "Prenota la tua chiamata di benvenuto nel Bootcamp AI.",
    locations: LOC.meet,
    eventTypeColor: COLOR.orange,
    minimumBookingNotice: 1440,
    slotInterval: 10,
    scheduleName: "default",
    periodDays: 10,
  },
  {
    title: "Benvenuto nel Master in Business e Imprenditoria",
    slug: "benvenuto-mbi",
    length: 20,
    description:
      "Prenota la tua chiamata di benvenuto nel master in Business e Imprenditoria.",
    locations: LOC.meet,
    eventTypeColor: COLOR.orange,
    minimumBookingNotice: 1440,
    slotInterval: 10,
    lockTimeZoneToggleOnBookingPage: true,
    scheduleName: "default",
    periodDays: 10,
  },
  {
    title: "Benvenuto nella BusinessApp",
    slug: "benvenuto-business",
    length: 45,
    description: "Prenota la tua chiamata di benvenuto per BusinessApp.",
    locations: LOC.meet,
    eventTypeColor: COLOR.orange,
    minimumBookingNotice: 1440,
    slotInterval: 10,
    scheduleName: "default",
    periodDays: 10,
  },
  {
    title: "Video Chiamata Finale | MMI",
    slug: "video-chiamata-finale-mmi",
    length: 20,
    description:
      "Complimenti 🎉 Sei alla fine di questo percorso. Prenota la tua chiamata finale.",
    locations: LOC.meet,
    eventTypeColor: COLOR.orange,
    minimumBookingNotice: 1440,
    slotInterval: 10,
    scheduleName: "default",
    periodDays: 10,
  },
  {
    title: "Video Chiamata con i Trasformatori | MMI",
    slug: "chiamata-con-i-trasformatori-mmi",
    length: 30,
    description:
      "Prenota una telefonata con i trasformatori del percorso.",
    locations: LOC.meet,
    eventTypeColor: COLOR.orange,
    minimumBookingNotice: 960, // 16h
    slotInterval: 10,
    scheduleName: "default",
    periodDays: 10,
  },
];

// ---------- MAIN ----------
async function main() {
  console.log(`Looking up owner: ${OWNER_EMAIL}`);
  const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) {
    throw new Error(
      `User with email ${OWNER_EMAIL} not found. Create the account first (sign up at /signup), then re-run.`
    );
  }
  console.log(`  → userId=${owner.id} (${owner.username || "no-username"})`);

  console.log("\nUpserting shared schedules…");
  const defaultScheduleId = await upsertSchedule(
    owner.id,
    "Default working hours",
    DEFAULT_HOURS
  );
  console.log(`  → "Default working hours" (id=${defaultScheduleId})`);
  const wednesdayScheduleId = await upsertSchedule(
    owner.id,
    "Wednesday only",
    WEDNESDAY_ONLY
  );
  console.log(`  → "Wednesday only" (id=${wednesdayScheduleId})`);

  const scheduleByName = {
    default: defaultScheduleId,
    wednesday: wednesdayScheduleId,
  };

  console.log(`\nUpserting ${EVENTS.length} event types…`);
  let created = 0;
  let updated = 0;
  for (const evt of EVENTS) {
    const data = {
      title: evt.title,
      length: evt.length,
      description: evt.description,
      locations: evt.locations,
      eventTypeColor: evt.eventTypeColor,
      minimumBookingNotice: evt.minimumBookingNotice,
      slotInterval: evt.slotInterval,
      seatsPerTimeSlot: evt.seatsPerTimeSlot ?? null,
      lockTimeZoneToggleOnBookingPage:
        evt.lockTimeZoneToggleOnBookingPage ?? false,
      successRedirectUrl: evt.successRedirectUrl ?? null,
      scheduleId: evt.scheduleName ? scheduleByName[evt.scheduleName] : null,
      periodType: evt.periodDays ? "ROLLING" : "UNLIMITED",
      periodDays: evt.periodDays ?? null,
      periodCountCalendarDays: evt.periodDays ? true : null,
    } as const;

    // CORSI: EventType has two owner-style relations:
    //   - `userId` (direct, set above) and
    //   - `users` (M2M `_user_eventtype`) which the public profile + dashboard
    //     queries use to resolve event types per user.
    // Both must be populated; missing the M2M means /<username>/<slug> 404s.
    const result = await prisma.eventType.upsert({
      where: { userId_slug: { userId: owner.id, slug: evt.slug } },
      update: { ...data, users: { connect: [{ id: owner.id }] } },
      create: {
        ...data,
        slug: evt.slug,
        userId: owner.id,
        users: { connect: [{ id: owner.id }] },
      },
    });

    // Differentiate created vs updated by checking createdAt vs now.
    const isNew =
      Math.abs(Date.now() - (result.createdAt?.getTime?.() ?? 0)) < 5000;
    if (isNew) created++;
    else updated++;
    console.log(`  ${isNew ? "+" : "↻"} ${evt.title}`);
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}.`);
  console.log(
    `\nFollow-up (in cal.diy UI as ${OWNER_EMAIL}, at /event-types):`
  );
  console.log("  • Add custom booking questions (Phone, Dropdown, etc.)");
  console.log("  • Add date-specific overrides for #3-7 coaching events");
  console.log("  • Set successRedirectUrl on Consulenza MBI to your CRM URL");
}

main()
  .catch((err) => {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
