import { formatManilaTimestamp, type NotificationList } from '@pesowise/shared';
import { Button, Card, EmptyState, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { useApiData } from '../lib/hooks';

export function NotificationsPage() {
  const notes = useApiData(() => api<NotificationList>('/api/notifications'), []);
  const mark = async (id: string) => {
    await api(`/api/notifications/${id}/read`, { method: 'PATCH' });
    notes.reload();
  };
  const markAll = async () => {
    await api('/api/notifications/read-all', { method: 'POST' });
    notes.reload();
  };
  return (
    <div>
      <PageHeader title="Notifications" description="Budget alerts are sent once per level for each budget month. These are in-app notifications." action={<Button variant="secondary" onClick={() => void markAll()}>Mark all read</Button>} />
      {notes.data && notes.data.items.length === 0 ? <EmptyState title="No notifications" message="Budget warnings, completed goals, and generated recurring transactions will show up here." /> : null}
      <div className="space-y-2">
        {notes.data?.items.map((item) => (
          <Card key={item.id} className={item.read ? '' : 'border-emerald-200'}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{item.message}</p>
                <p className="mt-2 text-xs text-slate-400">{formatManilaTimestamp(item.createdAt)} · {item.read ? 'Read' : 'Unread'}</p>
              </div>
              {!item.read ? <Button variant="ghost" onClick={() => void mark(item.id)}>Mark read</Button> : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
