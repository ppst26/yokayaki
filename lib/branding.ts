/** Platform default login assets — ไฟล์อยู่ใน `public/branding/` (โลโก้ต้องเป็น PNG จริงพร้อม alpha) */
export const PLATFORM_BRANDING = {
  logo: '/branding/logo.png',
  logoDark: '/branding/logo-dark.png',
  loginBackground: '/branding/login-bg.webp',
  loginBackgroundMobile: '/branding/login-bg.webp',
} as const;

export type BrandingAssets = {
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  loginBgUrl?: string | null;
};

/** รองรับ white-label ต่อ org ในอนาคต (เช่น org_settings.logo_url จาก R2) */
export function resolveBranding(org?: BrandingAssets | null) {
  return {
    logo: org?.logoUrl ?? PLATFORM_BRANDING.logo,
    logoDark: org?.logoDarkUrl ?? PLATFORM_BRANDING.logoDark,
    loginBackground: org?.loginBgUrl ?? PLATFORM_BRANDING.loginBackground,
  };
}

/** light → logo-dark.png · dark → logo.png */
export function getLogoForTheme(theme: 'light' | 'dark', org?: BrandingAssets | null) {
  const assets = resolveBranding(org);
  return theme === 'light' ? assets.logoDark : assets.logo;
}
