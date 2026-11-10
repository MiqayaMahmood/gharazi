type NotificationPayload = Record<string, unknown> | undefined;

export function getNotificationDestination(payload: NotificationPayload): string | undefined {
  const chatId = identifier(payload?.chatId);
  if (chatId) return `/dashboard/chats?chatId=${encodeURIComponent(chatId)}`;

  const inquiryId = identifier(payload?.inquiryId);
  if (inquiryId) return `/dashboard/inquiries?inquiryId=${encodeURIComponent(inquiryId)}`;

  const listingId = identifier(payload?.listingId);
  if (listingId && payload?.action === 'renew_listing') return '/dashboard/listings';
  if (listingId) return `/dashboard/listings/${encodeURIComponent(listingId)}/edit`;

  const projectId = identifier(payload?.projectId);
  if (projectId) return `/dashboard/projects/${encodeURIComponent(projectId)}/edit`;

  if (identifier(payload?.professionalProfileId)) return '/dashboard/professional/profile';
  if (identifier(payload?.verificationRequestId)) return '/dashboard/profile';
  return undefined;
}

function identifier(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
