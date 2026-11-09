import { getNotificationDestination } from './notification-destination';

describe('getNotificationDestination', () => {
  it.each([
    [{ chatId: 'chat 1' }, '/dashboard/chats?chatId=chat%201'],
    [{ inquiryId: 'inq-1' }, '/dashboard/inquiries?inquiryId=inq-1'],
    [{ listingId: 'listing-1' }, '/dashboard/listings/listing-1/edit'],
    [{ projectId: 'project-1' }, '/dashboard/projects/project-1/edit'],
    [{ professionalProfileId: 'profile-1' }, '/dashboard/professional/profile'],
    [{ verificationRequestId: 'verification-1' }, '/dashboard/profile'],
  ])('maps supported notification payloads', (payload, expected) => {
    expect(getNotificationDestination(payload)).toBe(expected);
  });

  it('does not invent a destination for unsupported or malformed payloads', () => {
    expect(getNotificationDestination(undefined)).toBeUndefined();
    expect(getNotificationDestination({ chatId: 42 })).toBeUndefined();
    expect(getNotificationDestination({ reportId: 'report-1' })).toBeUndefined();
  });
});
