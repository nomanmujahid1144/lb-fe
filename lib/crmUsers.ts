// Usernames that get the "Send to CRM" button (Zapier trigger) on the
// All Prospects and Follow-up pages. One list for both pages — they used to
// carry their own copies and drifted apart.
//
// Matching is exact and case-sensitive on `user.username`.
export const CRM_USERS: readonly string[] = [
  'Luuk_Admin', 'Luuk_Admin_Test', 'laura', 'Jessy', 'Jean_Jiggr', 'Alan',
  'Jerome_DeSpeld', 'Melle_DeSpeld', 'Manager_DeSpeld',
  'Rob_PostNL', 'Sigrid_PostNL', 'Thomas_PostNL', 'Johan_PostNL', 'Manager_PostNL',
  'Manager_Jiggr',
  'Nicolas_HealthyMind', 'Manager_HealthyMind',
  'Eelco_RolanRobotics', 'Manager_RolanRobotics',
  'Laura_Demo',
  'Reinier_Natwerk', 'Coen_Natwerk', 'Manager_Natwerk', 'Hanneke_Natwerk',
  'Daan_Lumiq', 'Manager_Lumiq',
  'Joop_Healzzy2GO', 'Manager_Healzzy2GO',
  'Karin_YourGift', 'Manager_YourGift',
  'Manager_RoutiGo', 'Patrick_RoutiGo', 'Huub_RoutiGo', 'Anick_RoutiGo',
  'Bram_SubsidieDirect', 'Manager_SubsidieDirect',
  'Rocher',
];

export const canSendToCrm = (username: string | null | undefined): boolean =>
  CRM_USERS.includes(username ?? '');