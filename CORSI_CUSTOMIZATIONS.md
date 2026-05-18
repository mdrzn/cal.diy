# Corsi.it customizations on top of cal.diy

This fork tracks `calcom/cal.diy`. To keep our changes survivable across upstream
merges, every Corsi-specific code edit is marked with a `// CORSI:` comment.

To inventory current customizations:

```sh
grep -rn "CORSI:" --include="*.ts" --include="*.tsx" --include="*.yml"
```

To merge a new upstream release:

```sh
git fetch upstream
git merge upstream/main
# Resolve conflicts — find `// CORSI:` markers in the touched files and
# re-apply the Corsi-side patch on top of upstream's new code.
git push origin main
```

## Active customizations

### 1. Admin email-verification override
**Files:**
- `apps/web/modules/users/components/UserForm.tsx`
- `apps/web/modules/users/views/users-edit-view.tsx`
- `packages/trpc/server/routers/viewer/users/_router.ts`

**What:** Adds an "Email verified" checkbox to the admin user-edit page. Lets an
admin flip a user's `emailVerified` timestamp directly, bypassing the
SMTP-delivered verification email.

**Why:** When SMTP isn't wired up (or fails for one user), the standard
verification flow is dead. Admins can't currently create usable accounts. This
gives them a manual override.

### 2. Deployment / branding
**Files:**
- `docker-compose.dokploy.yml` (Dokploy-tuned compose with bundled Postgres + Redis)
- `apps/web/public/calcom-logo-white-word.svg` and other logo/favicon files (Corsi.it brand assets)

**Why:** Custom Docker Compose for our Dokploy deployment, and replaced Cal.com
brand assets with Corsi.it equivalents.
