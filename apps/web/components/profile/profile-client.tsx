'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/query/hooks';
import { updateProfile } from '@/lib/api/profile';
import { Badge, InfoChip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { userRoleCodes } from '@/lib/auth/roles';

export function ProfileClient() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (formData: FormData) => updateProfile({
      fullName: String(formData.get('fullName') ?? ''),
      bio: String(formData.get('bio') ?? ''),
      whatsappNumber: String(formData.get('whatsappNumber') ?? ''),
      companyName: String(formData.get('companyName') ?? ''),
      websiteUrl: String(formData.get('websiteUrl') ?? ''),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['current-user'] }),
  });
  return (
    <Card className="p-6">
      <h1 className="text-2xl font-black">Profile</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {userRoleCodes(user).map((role) => <Badge key={role}>{role}</Badge>)}
        <InfoChip>Email verification ready</InfoChip>
        <InfoChip>Phone verification ready</InfoChip>
      </div>
      <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}>
        <Input name="fullName" placeholder="Full name" defaultValue={user?.profile?.fullName ?? ''} />
        <Input name="whatsappNumber" placeholder="WhatsApp number" defaultValue={user?.profile?.whatsappNumber ?? user?.phoneNumber ?? ''} />
        <Input name="companyName" placeholder="Company name" defaultValue={user?.profile?.companyName ?? ''} />
        <Input name="websiteUrl" placeholder="Website" defaultValue={user?.profile?.websiteUrl ?? ''} />
        <Input name="bio" placeholder="Short bio" defaultValue={user?.profile?.bio ?? ''} />
        <Button disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save profile'}</Button>
        {mutation.isSuccess ? <p className="text-sm font-semibold text-trust">Profile updated.</p> : null}
      </form>
    </Card>
  );
}
