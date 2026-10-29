/* PENORIX site configuration.
   Every value marked TODO is a placeholder from the website brief ([미정]) and must be replaced. */
window.PENORIX_CONFIG = {
  // Supabase project (test project in a free org; TODO: move to the Pro org before launch, then update these two values).
  // The publishable key is public by design; access is limited by the RLS policies in supabase/schema.sql.
  supabaseUrl: "https://mroeajfjoghgxymngzif.supabase.co",
  supabaseAnonKey: "sb_publishable_X8UjigqjIC00wIdEuUTyQA_Gy1F0HnF",
  logoBucket: "quote-logos",

  // TODO: confirm domain (penorix.com / penorix.co / getpenorix.com).
  siteUrl: "https://penorix.com",

  // TODO: replace after the Amazon (US) and Coupang (KR) listings go live.
  amazonUrl: "",
  coupangUrl: "",

  // TODO: confirm the public inbox(es) and which team member is shown per country.
  contactEmail: "hello@penorix.com",
  regionEmails: { US: "hello@penorix.com", KR: "hello@penorix.com", IN: "hello@penorix.com" },

  // TODO: social handles (leave empty to hide).
  instagramUrl: "",
  youtubeUrl: "",

  // TODO: legal entity and address for the footer and privacy policy.
  legalName: "PENORIX",
};
