const fallback = {
  supportEmail: "support@audienceown.com",
  privacyEmail: "contact@audienceown.com",
  legalEntityName: "AudienceOwn",
};

export function publicSiteConfig() {
  return {
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || fallback.supportEmail,
    privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || fallback.privacyEmail,
    legalEntityName: process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() || fallback.legalEntityName,
    companyAddress: process.env.NEXT_PUBLIC_COMPANY_ADDRESS?.trim() || null,
  };
}
