import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
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
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      console.log("로그인 이메일:", user.email);

      if (!user.email) return false;

      const airtableUser = await findUserByEmail(user.email);
      console.log("에어테이블 유저:", JSON.stringify(airtableUser, null, 2));

      return true;
    },

    async jwt({ token, user }) {
      const customToken = token as JWT & {
        userId?: string;
        artistId?: string;
      };

      if (user?.email) {
        const airtableUser = await findUserByEmail(user.email);

        if (airtableUser?.fields?.user_id) {
          customToken.userId = airtableUser.fields.user_id;

          const artist = await findArtistByUserId(airtableUser.fields.user_id);

          if (artist?.fields?.artist_id) {
            customToken.artistId = artist.fields.artist_id;
          }
        }
      }

      return customToken;
    },

    async session({ session, token }) {
      const customToken = token as JWT & {
        userId?: string;
        artistId?: string;
      };

      (session.user as any).userId = customToken.userId;
      (session.user as any).artistId = customToken.artistId;

      return session;
    },
  },
});

export { handler as GET, handler as POST };