// /middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" }, // 커스텀 로그인 페이지 있으면
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/events/:path*"],
};
