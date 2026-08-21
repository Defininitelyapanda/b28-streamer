import { CredentialsSignin } from "next-auth";

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_verified"
  | "account_locked"
  | "account_suspended"
  | "service_unavailable";

export class AuthFlowError extends CredentialsSignin {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string) {
    super(message);
    this.code = code;
    if (message) this.message = message;
  }
}

export function mapAuthErrorToMessage(code: string | undefined, fallback?: string): string {
  switch (code) {
    case "email_not_verified":
      return "Verify your email before signing in. Check your inbox or contact support.";
    case "account_locked":
      return "Too many failed attempts. Try again in a few minutes.";
    case "account_suspended":
      return "This account is suspended. Contact support for help.";
    case "service_unavailable":
      return "Sign-in service is temporarily unavailable. Please try again shortly.";
    case "invalid_credentials":
      return "Invalid email or password.";
    default:
      return fallback ?? "Invalid email or password.";
  }
}
