import { CATEGORY_COLORS, type Category, type TransactionType } from '@pesowise/shared';
import { useState, type FormEvent } from 'react';
import { CategoryIcon, CATEGORY_ICON_NAMES } from '../components/icons';
import { Button, EmptyState, Field, Modal, PageHeader, SelectInput, TextInput } from '../components/ui';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { ApiError, api } from '../lib/api';
import { useApiData } from '../lib/hooks';

export function CategoriesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [form, setForm] = useState<{ name: string; type: TransactionType; icon: string; color: string }>({ name: '', type: 'EXPENSE', icon: 'Tag', color: CATEGORY_COLORS[0] });
  const categories = useApiData(() => api<{ categories: Category[] }>('/api/categories?includeArchived=true'), []);
  const visible = (categories.data?.categories ?? []).filter((category) => category.type === type);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFields({ name: 'Enter a category name.' });
      return;
    }
    try {
      await api(editing ? `/api/categories/${editing.id}` : '/api/categories', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(form) });
      toast.success(editing ? 'Category updated.' : 'Category created.');
      setOpen(false);
      categories.reload();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not save the category.');
      if (reason instanceof ApiError) setFields(reason.fields ?? {});
    }
  };

  const archive = async (category: Category) => {
    await api(`/api/categories/${category.id}/${category.archived ? 'restore' : 'archive'}`, { method: 'POST' });
    toast.success(category.archived ? 'Category restored.' : 'Category archived. Existing transactions stay attached to it.');
    categories.reload();
  };

  const remove = async (category: Category) => {
    const ok = await confirm({ title: 'Delete category?', message: 'This only works when the category has no transactions, budgets, or recurring rules.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try {
      await api(`/api/categories/${category.id}`, { method: 'DELETE' });
      toast.success('Category deleted.');
      categories.reload();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not delete the category.');
    }
  };

  return (
    <div>
      <PageHeader title="Categories" description="Defaults are yours to rename, recolor, or archive. Archiving keeps transaction history." action={<Button onClick={() => { setEditing(null); setForm({ name: '', type, icon: 'Tag', color: CATEGORY_COLORS[0] }); setFields({}); setOpen(true); }}>New category</Button>} />
      <div className="mb-4 flex gap-2">
        {(['EXPENSE', 'INCOME'] as const).map((item) => (
          <button key={item} type="button" className={`rounded-full px-3 py-1.5 text-sm font-semibold ${type === item ? 'bg-navy-900 text-white' : 'bg-white ring-1 ring-line'}`} onClick={() => setType(item)}>
            {item === 'EXPENSE' ? 'Expenses' : 'Income'}
          </button>
        ))}
      </div>
      {visible.length === 0 ? <EmptyState title="No categories" message="Create one for this type." /> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((category) => (
          <article key={category.id} className={`rounded-xl border border-line bg-white p-4 shadow-card ${category.archived ? 'opacity-70' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg text-white" style={{ backgroundColor: category.color }}>
                <CategoryIcon name={category.icon} className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold">{category.name}</h2>
                <p className="text-xs text-muted">{category.archived ? 'Archived' : category.isDefault ? 'Default' : 'Custom'}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => { setEditing(category); setForm({ name: category.name, type: category.type, icon: category.icon, color: category.color }); setOpen(true); }}>Edit</Button>
              <Button variant="ghost" onClick={() => void archive(category)}>{category.archived ? 'Restore' : 'Archive'}</Button>
              <Button variant="ghost" onClick={() => void remove(category)}>Delete</Button>
            </div>
          </article>
        ))}
      </div>
      {open ? (
        <Modal title={editing ? 'Edit category' : 'New category'} onClose={() => setOpen(false)}>
          <form className="space-y-3" onSubmit={save}>
            <Field label="Name" error={fields.name}><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Type">
              <SelectInput value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as TransactionType })}>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </SelectInput>
            </Field>
            <Field label="Icon">
              <div className="grid grid-cols-8 gap-2">
                {CATEGORY_ICON_NAMES.map((icon) => (
                  <button key={icon} type="button" aria-label={icon} className={`grid h-9 place-items-center rounded-lg border ${form.icon === icon ? 'border-navy-900 bg-navy-50' : 'border-line'}`} onClick={() => setForm({ ...form, icon })}>
                    <CategoryIcon name={icon} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Color">
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => (
                  <button key={color} type="button" aria-label={color} className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ${form.color === color ? 'ring-navy-900' : 'ring-transparent'}`} style={{ backgroundColor: color }} onClick={() => setForm({ ...form, color })} />
                ))}
              </div>
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
