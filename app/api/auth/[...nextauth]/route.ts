import NextAuth from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import type { JWT } from "next-auth/jwt";

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, any>;
};

async function findUserByEmail(email: string): Promise<AirtableRecord | null> {
  const baseId = process.env.AIRTABLE_BASE_ID!;
  const table = process.env.AIRTABLE_USERS_TABLE || "user";
  const token = process.env.AIRTABLE_TOKEN!;

  const formula = encodeURIComponent(`{email}="${email}"`);
  const url = `https://api.airtable.com/v0/${baseId}/${table}?filterByFormula=${formula}&maxRecords=1`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Airtable user 조회 실패:", text);
    return null;
  }

  const data = await res.json();
  return data.records?.[0] || null;
}

async function findArtistByUserId(userId: string): Promise<AirtableRecord | null> {
  const baseId = process.env.AIRTABLE_BASE_ID!;
  const table = process.env.AIRTABLE_ARTISTS_TABLE || "artists";
  const token = process.env.AIRTABLE_TOKEN!;

  const formula = encodeURIComponent(`{user_id}="${userId}"`);
  const url = `https://api.airtable.com/v0/${baseId}/${table}?filterByFormula=${formula}&maxRecords=1`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Airtable artist 조회 실패:", text);
    return null;
  }

  const data = await res.json();
  return data.records?.[0] || null;
}

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  debug: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },

 providers: [
  KakaoProvider({
  clientId: process.env.KAKAO_CLIENT_ID!,
  clientSecret: process.env.KAKAO_CLIENT_SECRET!,
}),
],

  callbacks: {
  async signIn({ user, account, profile }) {
  console.log("===== KAKAO SIGNIN DEBUG =====");
  console.log("user:", JSON.stringify(user, null, 2));
  console.log("account:", JSON.stringify(account, null, 2));
  console.log("profile:", JSON.stringify(profile, null, 2));

  if (!user.email) {
    console.warn("카카오 이메일이 없어. 카카오 ID 기준으로 진행할게.");
  }

  return true;
},

  async jwt({ token, user, account }) {
  const customToken = token as JWT & {
    userId?: string;
    artistId?: string;
    kakaoId?: string;
  };

  if (account?.provider === "kakao" && account.providerAccountId) {
    customToken.kakaoId = String(account.providerAccountId);
  }

  if (user?.email) {
    const airtableUser = await findUserByEmail(user.email);

    if (airtableUser?.fields?.user_id) {
      customToken.userId = String(airtableUser.fields.user_id);

      const artist = await findArtistByUserId(String(airtableUser.fields.user_id));

      if (artist?.fields?.artist_id) {
        customToken.artistId = String(artist.fields.artist_id);
      }
    }
  }

  return customToken;
},

   async session({ session, token }) {
  const customToken = token as JWT & {
    userId?: string;
    artistId?: string;
    kakaoId?: string;
  };

  if (session.user) {
    (session.user as any).userId = customToken.userId ?? null;
    (session.user as any).artistId = customToken.artistId ?? null;
    (session.user as any).kakaoId = customToken.kakaoId ?? null;
  }

  return session;
},
  },
});

export { handler as GET, handler as POST };