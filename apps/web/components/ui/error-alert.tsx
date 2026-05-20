import { Card } from './card';
import { getUserFriendlyErrorMessage } from '@/lib/api/mock-fallback';

export function ErrorAlert({ error, message }: { error?: unknown; message?: string }) {
  return (
    <Card className="border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
      {message ?? getUserFriendlyErrorMessage(error)}
    </Card>
  );
}
