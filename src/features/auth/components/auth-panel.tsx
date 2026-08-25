"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";

import {
  Button,
  ChevronRightIcon,
  Divider,
  GoogleMark,
  InputField,
} from "@/design-system";

import { afterSignInHref } from "../constants";
import { isValidEmail } from "../validation";

type EmailFormState = { error: string | null };

const idle: EmailFormState = { error: null };

export type AuthPanelProps = {
  className?: string;
};

/**
 * The form half of the sign-in surface. There is no password: an address or a
 * Google account is the whole ask, so both paths are single actions.
 *
 * Both hand off to the auth provider at the marked points below; until one is
 * wired they carry the player straight through to the app.
 */
export function AuthPanel({ className }: AuthPanelProps) {
  const router = useRouter();
  const [googlePending, startGoogleSignIn] = useTransition();

  const [state, submitEmail, emailPending] = useActionState(
    async (
      _previous: EmailFormState,
      formData: FormData,
    ): Promise<EmailFormState> => {
      const email = String(formData.get("email") ?? "").trim();

      if (!isValidEmail(email)) {
        return { error: "Enter a valid email address" };
      }

      // Hand-off: send the sign-in link or code for `email` here.
      router.push(afterSignInHref);
      return idle;
    },
    idle,
  );

  function signInWithGoogle() {
    startGoogleSignIn(() => {
      // Hand-off: start the Google OAuth redirect here.
      router.push(afterSignInHref);
    });
  }

  return (
    <div
      className={["flex flex-col gap-6 px-5 pb-9 pt-7", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      <h1 className="font-display text-3xl font-black leading-tight tracking-tight">
        LET&apos;S GET STARTED
      </h1>

      <form action={submitEmail} noValidate className="flex flex-col gap-5">
        <InputField
          label="Enter Your Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="champion@arena.com"
          hint="Enter a valid email address"
          error={state.error ?? undefined}
          required
        />

        <Divider label="OR" />

        <Button
          variant="surface"
          size="lg"
          fullWidth
          onClick={signInWithGoogle}
          pending={googlePending}
          leadingIcon={<GoogleMark size={20} />}
        >
          SIGN IN WITH GOOGLE
        </Button>

        <p className="text-xs leading-relaxed text-muted">
          By continuing, you agree to our{" "}
          <Link
            href="/terms"
            className="text-subtle underline underline-offset-2"
          >
            Terms of Service
          </Link>{" "}
          &amp;{" "}
          <Link
            href="/privacy"
            className="text-subtle underline underline-offset-2"
          >
            Privacy Policy
          </Link>
        </p>

        <Button
          type="submit"
          variant="tonal"
          size="lg"
          fullWidth
          pending={emailPending}
          trailingIcon={<ChevronRightIcon size={18} />}
        >
          SIGN UP / LOG IN
        </Button>
      </form>
    </div>
  );
}
