import "next-auth";
import type { SubscriptionInfo } from "@/lib/api-client";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    subscription?: SubscriptionInfo;
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      roles?: string[];
    };
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
    roles?: string[];
    subscription?: SubscriptionInfo;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    roles?: string[];
    subscription?: SubscriptionInfo;
  }
}
