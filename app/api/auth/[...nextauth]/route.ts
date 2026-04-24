import NextAuth from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import type { JWT } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/lib/supabase";

async function upsertUserByKakao(params: {
  kakaoId: string;
  email: string | null;
  name: string | null;
}): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const userId = `user_${params.kakaoId}`;

  const { data: existing, error: selectError } = await supabase
    .from("users")
    .select("id")
    .eq("kakao_id", params.kakaoId)
    .maybeSingle();

  if (selectError) {
    console.error("Supabase users 조회 실패:", selectError.message);
    return null;
  }

  const targetId = existing?.id ?? userId;

  const { error: upsertError } = await supabase
    .from("users")
    .upsert(
      {
        id: targetId,
        kakao_id: params.kakaoId,
        email: params.email,
        name: params.name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (upsertError) {
    console.error("Supabase users upsert 실패:", upsertError.message);
    return null;
  }

  return targetId;
}

async function findArtistIdByKakaoId(
  kakaoId: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("artists")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (error) {
    console.error("Supabase artist 조회 실패:", error.message);
    return null;
  }

  return data?.id ?? null;
}

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7일
    updateAge: 60 * 60 * 24, // 하루마다 토큰 갱신
  },
  debug: process.env.NODE_ENV !== "production",
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
    async signIn({ user }) {
      if (!user.email && process.env.NODE_ENV !== "production") {
        console.warn("카카오 이메일이 없어. 카카오 ID 기준으로 진행할게.");
      }
      return true;
    },

    async jwt({ token, user, account }) {
      const customToken = token as JWT & {
        userId?: string;
        artistId?: string;
        kakaoId?: string;
        dbError?: boolean;
      };

      if (account?.provider === "kakao" && account.providerAccountId) {
        customToken.kakaoId = String(account.providerAccountId);
      }

      if (customToken.kakaoId && user) {
        const userId = await upsertUserByKakao({
          kakaoId: customToken.kakaoId,
          email: user.email ?? null,
          name: user.name ?? null,
        });

        if (userId) {
          customToken.userId = userId;
          customToken.dbError = false;
        } else {
          // DB 장애 시 클라이언트에 표시해서 작가 가입 유도 등 오동작 방지
          customToken.dbError = true;
        }

        const artistId = await findArtistIdByKakaoId(customToken.kakaoId);
        if (artistId) {
          customToken.artistId = artistId;
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
        (session.user as { userId?: string | null }).userId =
          customToken.userId ?? null;
        (session.user as { artistId?: string | null }).artistId =
          customToken.artistId ?? null;
        (session.user as { kakaoId?: string | null }).kakaoId =
          customToken.kakaoId ?? null;
      }

      return session;
    },
  },
});

export { handler as GET, handler as POST };
