"use client";

import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { signIn } from "next-auth/react";
import { useState } from "react";

// ── Colors ──
const C = {
  ink: "#1a1a2e",
  inkSoft: "#3d3d5c",
  inkMuted: "#8888a8",
  paper: "#faf9f7",
  accent: "#e8533a",
  accentLight: "#fdf1ee",
  gold: "#c9a84c",
  border: "#e2dfd8",
  card: "#ffffff",
} as const;

// ── Keyframes ──
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const floatEnv = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%       { transform: translateY(-12px) rotate(2deg); }
`;

const floatEnv2 = keyframes`
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50%       { transform: translateY(10px) rotate(1deg); }
`;

const floatEnv3 = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%       { transform: translateY(-12px) rotate(2deg); }
`;

// ── Styled Components ──
const Page = styled.div`
  height: 100vh;
  display: grid;
  grid-template-columns: 1fr 480px;
  font-family: var(--font-sans, "DM Sans", sans-serif);
  overflow: hidden;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }
`;

const LeftPanel = styled.div`
  position: relative;
  background: ${C.ink};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(32px, 5vh, 64px);
  padding: clamp(32px, 4vh, 48px) 56px;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 30% 70%, rgba(201, 168, 76, 0.12) 0%, transparent 60%),
      radial-gradient(ellipse 60% 80% at 80% 20%, rgba(232, 83, 58, 0.1) 0%, transparent 55%);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 36px 28px 40px;
    min-height: auto;
  }
`;

const EnvDeco = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const EnvFloat1 = styled.g`
  transform-origin: 500px 380px;
  animation: ${floatEnv} 7s ease-in-out infinite;
`;

const EnvFloat2 = styled.g`
  transform-origin: 140px 200px;
  animation: ${floatEnv2} 9s ease-in-out infinite;
`;

const EnvFloat3 = styled.g`
  transform-origin: 650px 560px;
  animation: ${floatEnv3} 11s ease-in-out 1s infinite;
`;

const LeftLogo = styled.div`
  position: relative;
  z-index: 2;
  animation: ${fadeIn} 0.5s ease both;
`;

const LogoMark = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
`;

const LogoIcon = styled.div`
  width: 36px;
  height: 36px;
  background: ${C.accent};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const LogoText = styled.span`
  font-family: var(--font-serif, "DM Serif Display", serif);
  font-size: 22px;
  color: #fff;
  letter-spacing: -0.3px;
`;

const LeftHero = styled.div`
  position: relative;
  z-index: 2;
  animation: ${fadeUp} 0.6s ease 0.1s both;
`;

const HeroLabel = styled.p`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: ${C.gold};
  margin-bottom: 20px;
`;

const HeroTitle = styled.h1`
  font-family: var(--font-serif, "DM Serif Display", serif);
  font-size: clamp(36px, 4vw, 52px);
  line-height: 1.1;
  color: #fff;
  margin-bottom: 24px;

  em {
    font-style: italic;
    color: ${C.gold};
  }

  @media (max-width: 768px) {
    font-size: 34px;
  }
`;

const HeroDesc = styled.p`
  font-size: 15px;
  font-weight: 300;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.55);
  max-width: 380px;
`;

const RightPanel = styled.div`
  background: ${C.card};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: clamp(32px, 4vh, 48px) 40px;
  border-left: 1px solid ${C.border};
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 36px 24px 48px;
    border-left: none;
    border-top: 1px solid ${C.border};
    overflow: visible;
  }
`;

const RightInner = styled.div`
  width: 100%;
  max-width: 340px;
`;

const FormHeader = styled.div`
  margin-bottom: 36px;
  animation: ${fadeUp} 0.5s ease 0.15s both;
`;

const FormEyebrow = styled.p`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${C.inkMuted};
  margin-bottom: 10px;
`;

const FormTitle = styled.h2`
  font-family: var(--font-serif, "DM Serif Display", serif);
  font-size: 30px;
  color: ${C.ink};
  line-height: 1.15;
  letter-spacing: -0.5px;

  span {
    color: ${C.accent};
  }
`;

const TrustBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${C.accentLight};
  border: 1px solid rgba(232, 83, 58, 0.15);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 28px;
  animation: ${fadeUp} 0.5s ease 0.2s both;

  svg {
    width: 14px;
    height: 14px;
    color: ${C.accent};
    flex-shrink: 0;
  }

  span {
    font-size: 12px;
    color: ${C.inkSoft};
    font-weight: 400;
    line-height: 1.4;
  }
`;

const GoogleButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: ${C.ink};
  color: #fff;
  border: none;
  border-radius: 10px;
  height: 50px;
  font-family: var(--font-sans, "DM Sans", sans-serif);
  font-size: 14.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
  animation: ${fadeUp} 0.5s ease 0.25s both;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.06));
  }

  &:hover:not(:disabled) {
    background: #2d2d4a;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
`;

const SignupRow = styled.p`
  text-align: center;
  font-size: 13px;
  color: ${C.inkMuted};
  font-weight: 300;
  animation: ${fadeUp} 0.5s ease 0.3s both;

  a {
    color: ${C.ink};
    font-weight: 500;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ErrorBox = styled.div`
  margin-bottom: 20px;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid rgba(232, 83, 58, 0.25);
  border-radius: 8px;
  font-size: 13px;
  color: #b91c1c;
  line-height: 1.5;
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// ── Error message map ──
const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "로그인 중 오류가 발생했습니다. 다시 시도해주세요.",
  OAuthCallback: "인증 콜백 처리 중 오류가 발생했습니다.",
  OAuthCreateAccount: "계정 생성 중 오류가 발생했습니다.",
  EmailCreateAccount: "이메일 계정 생성 중 오류가 발생했습니다.",
  Callback: "콜백 처리 중 오류가 발생했습니다.",
  OAuthAccountNotLinked: "이미 다른 방법으로 가입된 이메일입니다.",
  EmailSignin: "이메일 로그인 중 오류가 발생했습니다.",
  CredentialsSignin: "로그인 정보가 올바르지 않습니다.",
  SessionRequired: "로그인이 필요합니다.",
};

// ── Component ──
interface LoginProps {
  error?: string;
}

export default function Login({ error }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signIn("google", { callbackUrl: "/dashboard", redirect: true });
    } catch (err) {
      console.error("Sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "로그인 중 알 수 없는 오류가 발생했습니다.")
    : null;

  return (
    <Page>
      {/* ── LEFT PANEL ── */}
      <LeftPanel>
        <EnvDeco>
          <svg
            viewBox="0 0 800 700"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            <EnvFloat1>
              <rect x="360" y="300" width="280" height="190" rx="8" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
              <path d="M360 308 L500 398 L640 308" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />
            </EnvFloat1>
            <EnvFloat2>
              <rect x="60" y="150" width="170" height="115" rx="6" stroke="rgba(201,168,76,0.15)" strokeWidth="1.5" />
              <path d="M60 158 L145 218 L230 158" stroke="rgba(201,168,76,0.15)" strokeWidth="1.5" fill="none" />
            </EnvFloat2>
            <EnvFloat3>
              <rect x="590" y="520" width="120" height="82" rx="5" stroke="rgba(232,83,58,0.18)" strokeWidth="1.5" />
              <path d="M590 527 L650 568 L710 527" stroke="rgba(232,83,58,0.18)" strokeWidth="1.5" fill="none" />
            </EnvFloat3>
            <circle cx="180" cy="450" r="2.5" fill="rgba(255,255,255,0.08)" />
            <circle cx="620" cy="160" r="2" fill="rgba(255,255,255,0.07)" />
            <circle cx="420" cy="580" r="3" fill="rgba(201,168,76,0.12)" />
            <circle cx="740" cy="400" r="2" fill="rgba(255,255,255,0.06)" />
            <circle cx="100" cy="580" r="3.5" fill="rgba(232,83,58,0.10)" />
            <path d="M100 350 Q280 280 460 330 Q580 360 680 280" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="6 4" fill="none" />
          </svg>
        </EnvDeco>

        <LeftLogo>
          <LogoMark>
            <LogoIcon>
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="5" width="16" height="11" rx="2" stroke="white" strokeWidth="1.5" />
                <path d="M2 7L10 13L18 7" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </LogoIcon>
            <LogoText>Mailable</LogoText>
          </LogoMark>
        </LeftLogo>

        <LeftHero>
          <HeroLabel>행사 자동 메일링 시스템</HeroLabel>
          <HeroTitle>
            이메일, 이제
            <br />
            <em>자동으로</em>
            <br />
            보내세요.
          </HeroTitle>
          <HeroDesc>
            행사 참가자에게 초대장, 안내문, 결과 리포트까지—
            <br />
            Mailable이 대신 발송해 드립니다.
          </HeroDesc>
        </LeftHero>
      </LeftPanel>

      {/* ── RIGHT PANEL ── */}
      <RightPanel>
        <RightInner>
          <FormHeader>
            <FormEyebrow>Welcome back</FormEyebrow>
            <FormTitle>
              다시 만나서
              <br />
              <span>반가워요.</span>
            </FormTitle>
          </FormHeader>

          {errorMessage && <ErrorBox>{errorMessage}</ErrorBox>}

          <TrustBadge>
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M8 1L10.5 5.5L15.5 6.27L12 9.74L12.77 14.73L8 12.1L3.23 14.73L4 9.74L0.5 6.27L5.5 5.5L8 1Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
            <span>Google Workspace와 안전하게 연동됩니다</span>
          </TrustBadge>

          <GoogleButton onClick={handleSignIn} disabled={isLoading}>
            {isLoading ? (
              <Spinner />
            ) : (
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            {isLoading ? "로그인 중..." : "Google로 로그인"}
          </GoogleButton>

          <SignupRow>
            계정이 없으신가요? <a href="#">지금 가입하기 →</a>
          </SignupRow>
        </RightInner>
      </RightPanel>
    </Page>
  );
}
