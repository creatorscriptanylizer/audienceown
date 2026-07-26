export function canAccessRecoveryDeveloperTools({
  isDevelopment,
  isAdmin,
  isOwner,
}: {
  isDevelopment: boolean;
  isAdmin: boolean;
  isOwner: boolean;
}) {
  return isDevelopment || isAdmin || isOwner;
}
