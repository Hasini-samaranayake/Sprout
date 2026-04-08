/**
 * Visiting a protected route like `/settings` while logged out sends you to
 * `/login?next=/settings`. After sign-in, landing on Settings is surprising;
 * send people to `/dashboard` instead (it redirects by role to student/tutor).
 */
export function postAuthRedirectPath(next: string): string {
  if (next === "/settings" || next.startsWith("/settings/")) {
    return "/dashboard";
  }
  return next;
}
