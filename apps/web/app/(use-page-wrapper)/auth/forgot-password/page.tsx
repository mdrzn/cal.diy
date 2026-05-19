import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import ForgotPassword from "~/auth/forgot-password/forgot-password-view";

// CORSI: removed `getCsrfToken(context)` SSR call. The container can't hairpin
// to its own public URL on Hetzner, so next-auth's server-to-self fetch hangs
// for ~10s on every render. The forgot-password form posts JSON directly to
// /api/auth/forgot-password and doesn't use the CSRF token at all (the hidden
// input in forgot-password-view.tsx is unused — kept for upstream parity).
export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("forgot_password"),
    (t) => t("request_password_reset"),
    undefined,
    undefined,
    "/auth/forgot-password"
  );
};

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const session = await getServerSession({ req: context.req });

  if (session) {
    redirect("/");
  }

  return <ForgotPassword csrfToken={undefined} />;
};

export default ServerPage;
