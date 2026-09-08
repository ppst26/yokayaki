/** Platform default login assets — ไฟล์อยู่ใน `public/branding/` (โลโก้ต้องเป็น PNG จริงพร้อม alpha) */
export const PLATFORM_BRANDING = {
  logo: '/branding/logo.png',
  logoDark: '/branding/logo-dark.png',
  loginBackground: '/branding/login-bg.webp',
  loginBackgroundMobile: '/branding/login-bg.webp',
  appBackground: '/branding/app-bg.webp',
  appBackgroundLight: '/branding/app-bg-light.webp',
} as const;

export type BrandingAssets = {
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  loginBgUrl?: string | null;
  appBgUrl?: string | null;
  appBgLightUrl?: string | null;
};

/** รองรับ white-label ต่อ org ในอนาคต (เช่น org_settings.logo_url จาก R2) */
export function resolveBranding(org?: BrandingAssets | null) {
  return {
    logo: org?.logoUrl ?? PLATFORM_BRANDING.logo,
    logoDark: org?.logoDarkUrl ?? PLATFORM_BRANDING.logoDark,
    loginBackground: org?.loginBgUrl ?? PLATFORM_BRANDING.loginBackground,
    appBackground: org?.appBgUrl ?? PLATFORM_BRANDING.appBackground,
    appBackgroundLight: org?.appBgLightUrl ?? PLATFORM_BRANDING.appBackgroundLight,
  };
}

/** light → app-bg-light.webp · dark → app-bg.webp */
export function getAppBackgroundForTheme(theme: 'light' | 'dark', org?: BrandingAssets | null) {
  const assets = resolveBranding(org);
  return theme === 'light' ? assets.appBackgroundLight : assets.appBackground;
}

/** light → logo-dark.png · dark → logo.png */
export function getLogoForTheme(theme: 'light' | 'dark', org?: BrandingAssets | null) {
  const assets = resolveBranding(org);
  return theme === 'light' ? assets.logoDark : assets.logo;
}
