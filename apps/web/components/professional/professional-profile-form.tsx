'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Skeleton } from '@/components/ui/state';
import { createProfessionalProfile, ProfessionalProfileInput, updateProfessionalProfile } from '@/lib/api/professional';
import { useCities, useProfessionalProfile } from '@/lib/query/hooks';

const empty: ProfessionalProfileInput = { businessName: '', businessType: 'agent_agency', contactPersonName: '', phone: '', whatsapp: '', email: '', websiteUrl: '', logoUrl: '', cityId: '', addressLine: '', description: '' };
const businessTypes = [['agent_agency', 'Agent / Agency'], ['developer_builder', 'Developer / Builder'], ['property_dealer', 'Property Dealer'], ['property_marketing_company', 'Property Marketing Company'], ['other_real_estate_business', 'Other Real Estate Business']];

export function ProfessionalProfileForm() {
  const profile = useProfessionalProfile(); const cities = useCities(); const queryClient = useQueryClient(); const router = useRouter(); const [form, setForm] = useState(empty);
  useEffect(() => { if (profile.data) setForm({ ...empty, ...profile.data, cityId: profile.data.cityId ?? '' }); }, [profile.data]);
  const save = useMutation({ mutationFn: (input: ProfessionalProfileInput) => profile.data ? updateProfessionalProfile(input) : createProfessionalProfile(input), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['professional-profile'] }); await queryClient.invalidateQueries({ queryKey: ['professional-summary'] }); router.push('/dashboard/professional'); } });
  if (profile.isLoading || cities.isLoading) return <Skeleton className="h-96" />;
  const set = (key: keyof ProfessionalProfileInput, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value || undefined])) as ProfessionalProfileInput); };
  return <Card className="p-6"><h1 className="text-2xl font-black">{profile.data ? 'Edit business profile' : 'Create your professional profile'}</h1><p className="mt-2 text-sm text-muted">This information powers your private professional dashboard and verification request.</p>
    {save.isError ? <div className="mt-4"><ErrorAlert error={save.error} /></div> : null}
    <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={submit}>
      <Field label="Business name"><Input required value={form.businessName} onChange={(e) => set('businessName', e.target.value)} /></Field>
      <Field label="Business type"><Select value={form.businessType} onChange={(e) => set('businessType', e.target.value)}>{businessTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
      <Field label="Contact person"><Input required value={form.contactPersonName} onChange={(e) => set('contactPersonName', e.target.value)} /></Field>
      <Field label="Phone"><Input required value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
      <Field label="WhatsApp"><Input value={form.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
      <Field label="Business email"><Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
      <Field label="City"><Select value={form.cityId ?? ''} onChange={(e) => set('cityId', e.target.value)}><option value="">Select city</option>{cities.data?.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</Select></Field>
      <Field label="Website"><Input type="url" placeholder="https://" value={form.websiteUrl ?? ''} onChange={(e) => set('websiteUrl', e.target.value)} /></Field>
      <Field label="Logo URL"><Input type="url" placeholder="https://" value={form.logoUrl ?? ''} onChange={(e) => set('logoUrl', e.target.value)} /></Field>
      <Field label="Address"><Input value={form.addressLine ?? ''} onChange={(e) => set('addressLine', e.target.value)} /></Field>
      <label className="grid gap-1 md:col-span-2"><span className="text-sm font-bold">Short description</span><textarea className="min-h-28 rounded-md border border-line p-3 text-sm" maxLength={1000} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></label>
      <div className="md:col-span-2 flex gap-3"><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save business profile'}</Button><Button asChild href="/help" variant="secondary">Account guidance</Button></div>
    </form>
  </Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1"><span className="text-sm font-bold">{label}</span>{children}</label>; }
