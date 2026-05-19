import process from "node:process";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import prisma from "@calcom/prisma";
import { IS_GOOGLE_LOGIN_ENABLED } from "@server/lib/constants";
import { jwtVerify } from "jose";
import type { GetServerSidePropsContext } from "next";
// CORSI: removed `getCsrfToken` import. Server-side it fetches /api/auth/csrf
// over the public NEXTAUTH_URL; on Hetzner this hairpins back to the container
// and hangs ~10s. The login form uses signIn() client-side which fetches the
// CSRF token on demand, so the SSR-supplied csrfToken prop is unused at runtime.

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req, query } = context;

  const session = await getServerSession({ req });

  const verifyJwt = (jwt: string) => {
    const secret = new TextEncoder().encode(process.env.CALENDSO_ENCRYPTION_KEY);

    return jwtVerify(jwt, secret, {
      issuer: WEBSITE_URL,
      audience: `${WEBSITE_URL}/auth/login`,
      algorithms: ["HS256"],
    });
  };

  let totpEmail = null;
  if (context.query.totp) {
    try {
      const decryptedJwt = await verifyJwt(context.query.totp as string);
      if (decryptedJwt.payload) {
        totpEmail = decryptedJwt.payload.email as string;
      } else {
        return {
          redirect: {
            destination: "/auth/error?error=JWT%20Invalid%20Payload",
            permanent: false,
          },
        };
      }
    } catch {
      return {
        redirect: {
          destination: "/auth/error?error=Invalid%20JWT%3A%20Please%20try%20again",
          permanent: false,
        },
      };
    }
  }

  if (session) {
    const { callbackUrl } = query;

    if (callbackUrl) {
      try {
        const destination = getSafeRedirectUrl(callbackUrl as string);
        if (destination) {
          return {
            redirect: {
              destination,
              permanent: false,
            },
          };
        }
      } catch (e) {
        console.warn(e);
      }
    }

    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const userExists = await prisma.user.findFirst({ select: { id: true } });
  if (!userExists) {
    // Proceed to new onboarding to create first admin user
    return {
      redirect: {
        destination: "/auth/setup",
        permanent: false,
      },
    };
  }
  return {
    props: {
      // CORSI: was `await getCsrfToken(context)` — see top-of-file comment.
      csrfToken: "",
      isGoogleLoginEnabled: IS_GOOGLE_LOGIN_ENABLED,
      isOutlookLoginEnabled: false,
      totpEmail,
    },
  };
}
