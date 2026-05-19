import type { GetServerSidePropsContext } from "next";
// CORSI: removed `getCsrfToken` + `getProviders`. Both make server-to-self HTTP
// fetches against NEXTAUTH_URL (the public domain), which hairpins back to the
// container and hangs ~10s on Hetzner. The signin page uses signIn() client-side
// which gets CSRF on-demand. Providers are discovered via env flags client-side.
import type { ClientSafeProvider } from "next-auth/react";

export async function getServerSideProps(_context: GetServerSidePropsContext) {
  return {
    props: {
      csrfToken: "",
      providers: null as Record<string, ClientSafeProvider> | null,
    },
  };
}
