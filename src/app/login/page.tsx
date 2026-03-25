// src/app/login/page.tsx
import { auth } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import LoginButton from "@/src/components/LoginButton";

interface LoginPageProps {
  searchParams: { error?: string };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session) redirect("/dashboard");

  const error = searchParams.error;

  return (
    <main className="min-h-dvh grid place-items-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mailable</h1>
          <p className="text-gray-600">행사 자동 메일링 시스템에 로그인하세요</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">
              {error === 'OAuthSignin' && '로그인 중 오류가 발생했습니다. 다시 시도해주세요.'}
              {error === 'OAuthCallback' && '인증 콜백 처리 중 오류가 발생했습니다.'}
              {error === 'OAuthCreateAccount' && '계정 생성 중 오류가 발생했습니다.'}
              {error === 'EmailCreateAccount' && '이메일 계정 생성 중 오류가 발생했습니다.'}
              {error === 'Callback' && '콜백 처리 중 오류가 발생했습니다.'}
              {error === 'OAuthAccountNotLinked' && '이미 다른 방법으로 가입된 이메일입니다.'}
              {error === 'EmailSignin' && '이메일 로그인 중 오류가 발생했습니다.'}
              {error === 'CredentialsSignin' && '로그인 정보가 올바르지 않습니다.'}
              {error === 'SessionRequired' && '로그인이 필요합니다.'}
              {!['OAuthSignin', 'OAuthCallback', 'OAuthCreateAccount', 'EmailCreateAccount', 'Callback', 'OAuthAccountNotLinked', 'EmailSignin', 'CredentialsSignin', 'SessionRequired'].includes(error) && 
                '로그인 중 알 수 없는 오류가 발생했습니다.'}
            </p>
          </div>
        )}

        <LoginButton />
      </div>
    </main>
  );
}