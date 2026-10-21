import {
  PAYMENT_METHODS,
  formatLongDate,
  normalizeMoney,
  paymentLabel,
  rangeForPreset,
  type Category,
  type PageResult,
  type PaymentMethod,
  type Transaction,
  type TransactionType,
} from '@pesowise/shared';
import { useMemo, useState, type FormEvent } from 'react';
import { Badge, Button, EmptyState, ErrorNote, Field, Modal, MoneyText, PageHeader, SelectInput, TextArea, TextInput } from '../components/ui';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { ApiError, api, downloadCsv, withQuery } from '../lib/api';
import { useApiData } from '../lib/hooks';

const initial = rangeForPreset('this-month');

interface Draft {
  description: string;
  amount: string;
  type: TransactionType;
  categoryId: string;
  date: string;
  paymentMethod: PaymentMethod;
  notes: string;
}

const emptyDraft = (date: string): Draft => ({
  description: '',
  amount: '',
  type: 'EXPENSE',
  categoryId: '',
  date,
  paymentMethod: 'CASH',
  notes: '',
});

export function TransactionsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [sort, setSort] = useState<'date' | 'amount'>('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; draft: Draft; id?: string } | null>(null);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const categories = useApiData(() => api<{ categories: Category[] }>('/api/categories?includeArchived=true'), []);
  const filters = { search, type, categoryId, paymentMethod, from, to, sort, order, page, pageSize: 10 };
  const list = useApiData(() => api<PageResult<Transaction>>(withQuery('/api/transactions', filters)), [search, type, categoryId, paymentMethod, from, to, sort, order, page], 'pesowise:refresh');
  const activeCategories = useMemo(() => (categories.data?.categories ?? []).filter((category) => !category.archived || category.id === editor?.draft.categoryId), [categories.data, editor]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    const nextFields: Record<string, string> = {};
    if (!editor.draft.description.trim()) nextFields.description = 'Enter a description.';
    if (!normalizeMoney(editor.draft.amount)) nextFields.amount = 'Enter an amount greater than 0 with up to 2 decimal places.';
    if (!editor.draft.categoryId) nextFields.categoryId = 'Choose a category.';
    if (!editor.draft.date) nextFields.date = 'Enter a valid date.';
    setFields(nextFields);
    if (Object.keys(nextFields).length > 0) return;
    setSaving(true);
    try {
      const path = editor.mode === 'create' ? '/api/transactions' : `/api/transactions/${editor.id}`;
      await api(path, { method: editor.mode === 'create' ? 'POST' : 'PATCH', body: JSON.stringify({ ...editor.draft, notes: editor.draft.notes || null }) });
      toast.success(editor.mode === 'create' ? 'Transaction added.' : 'Transaction updated.');
      setEditor(null);
      list.reload();
      window.dispatchEvent(new Event('pesowise:refresh'));
    } catch (reason) {
      if (reason instanceof ApiError) {
        setFields(reason.fields ?? {});
        toast.error(reason.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (transaction: Transaction) => {
    const ok = await confirm({
      title: 'Delete transaction?',
      message: 'This removes the transaction and updates budgets and reports that include it.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await api(`/api/transactions/${transaction.id}`, { method: 'DELETE' });
    toast.success('Transaction deleted.');
    setDetail(null);
    list.reload();
    window.dispatchEvent(new Event('pesowise:refresh'));
  };

  const exportCsv = async () => {
    try {
      await downloadCsv(withQuery('/api/transactions/export', filters), 'pesowise-transactions.csv');
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not export.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Search, filter, and export the records that drive your dashboard."
        action={<Button onClick={() => { setFields({}); setEditor({ mode: 'create', draft: emptyDraft(to) }); }}>Add transaction</Button>}
      />
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TextInput placeholder="Search description" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} aria-label="Search description" />
        <SelectInput value={type} onChange={(event) => { setPage(1); setType(event.target.value); }} aria-label="Filter by type">
          <option value="">All types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </SelectInput>
        <SelectInput value={categoryId} onChange={(event) => { setPage(1); setCategoryId(event.target.value); }} aria-label="Filter by category">
          <option value="">All categories</option>
          {(categories.data?.categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}{category.archived ? ' (archived)' : ''}</option>)}
        </SelectInput>
        <SelectInput value={paymentMethod} onChange={(event) => { setPage(1); setPaymentMethod(event.target.value); }} aria-label="Filter by payment method">
          <option value="">All payment methods</option>
          {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
        </SelectInput>
        <label className="text-sm text-muted">From <input className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-ink" type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value); }} /></label>
        <label className="text-sm text-muted">To <input className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-ink" type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value); }} /></label>
        <SelectInput value={`${sort}:${order}`} onChange={(event) => { const [nextSort, nextOrder] = event.target.value.split(':'); setSort(nextSort as 'date' | 'amount'); setOrder(nextOrder as 'asc' | 'desc'); }} aria-label="Sort transactions">
          <option value="date:desc">Newest date</option>
          <option value="date:asc">Oldest date</option>
          <option value="amount:desc">Highest amount</option>
          <option value="amount:asc">Lowest amount</option>
        </SelectInput>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setFrom(''); setTo(''); setPage(1); }}>All dates</Button>
          <Button variant="secondary" onClick={() => void exportCsv()}>Export CSV</Button>
        </div>
      </div>
      {list.error ? <ErrorNote message={list.error} /> : null}
      {list.loading && !list.data ? <p className="text-sm text-muted">Loading transactions…</p> : null}
      {list.data && list.data.items.length === 0 ? <EmptyState title="No matching transactions" message="Adjust the filters or add a transaction for this period." /> : null}
      {list.data && list.data.items.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-white shadow-card md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Transactions</caption>
              <thead className="bg-navy-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((transaction) => (
                  <tr key={transaction.id} className="cursor-pointer border-t border-line hover:bg-navy-50" onClick={() => setDetail(transaction)}>
                    <td className="px-3 py-2.5">{transaction.description}</td>
                    <td className="px-3 py-2.5">{transaction.category.name}</td>
                    <td className="px-3 py-2.5 text-muted">{formatLongDate(transaction.date)}</td>
                    <td className="px-3 py-2.5"><Badge tone={transaction.type === 'INCOME' ? 'good' : 'neutral'}>{transaction.type === 'INCOME' ? 'Income' : 'Expense'}</Badge></td>
                    <td className="px-3 py-2.5 text-muted">{paymentLabel(transaction.paymentMethod)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold"><MoneyText value={transaction.amount} tone={transaction.type === 'INCOME' ? 'income' : 'expense'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 md:hidden">
            {list.data.items.map((transaction) => (
              <button key={transaction.id} type="button" className="w-full rounded-xl border border-line bg-white p-3 text-left shadow-card" onClick={() => setDetail(transaction)}>
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block font-semibold">{transaction.description}</span>
                    <span className="text-xs text-muted">{transaction.category.name} · {formatLongDate(transaction.date)}</span>
                  </span>
                  <MoneyText value={transaction.amount} tone={transaction.type === 'INCOME' ? 'income' : 'expense'} />
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-muted">Page {list.data.page} of {list.data.totalPages} · {list.data.total} records</p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <Button variant="secondary" disabled={page >= (list.data.totalPages || 1)} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </>
      ) : null}

      {detail ? (
        <Modal title="Transaction details" onClose={() => setDetail(null)}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted">Description</dt><dd>{detail.description}</dd></div>
            <div><dt className="text-muted">Amount</dt><dd><MoneyText value={detail.amount} tone={detail.type === 'INCOME' ? 'income' : 'expense'} /></dd></div>
            <div><dt className="text-muted">Category</dt><dd>{detail.category.name}</dd></div>
            <div><dt className="text-muted">Date</dt><dd>{formatLongDate(detail.date)}</dd></div>
            <div><dt className="text-muted">Type</dt><dd>{detail.type === 'INCOME' ? 'Income' : 'Expense'}</dd></div>
            <div><dt className="text-muted">Payment</dt><dd>{paymentLabel(detail.paymentMethod)}</dd></div>
            <div className="col-span-2"><dt className="text-muted">Notes</dt><dd>{detail.notes || 'None'}</dd></div>
          </dl>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setDetail(null); setFields({}); setEditor({ mode: 'edit', id: detail.id, draft: { description: detail.description, amount: detail.amount, type: detail.type, categoryId: detail.category.id, date: detail.date, paymentMethod: detail.paymentMethod, notes: detail.notes ?? '' } }); }}>Edit</Button>
            <Button variant="danger" onClick={() => void remove(detail)}>Delete</Button>
          </div>
        </Modal>
      ) : null}

      {editor ? (
        <Modal title={editor.mode === 'create' ? 'Add transaction' : 'Edit transaction'} onClose={() => setEditor(null)}>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
            <Field label="Description" error={fields.description}>
              <TextInput value={editor.draft.description} onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, description: event.target.value } })} />
            </Field>
            <Field label="Amount (PHP)" error={fields.amount}>
              <TextInput inputMode="decimal" value={editor.draft.amount} onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, amount: event.target.value } })} />
            </Field>
            <Field label="Type" error={fields.type}>
              <SelectInput value={editor.draft.type} onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, type: event.target.value as TransactionType, categoryId: '' } })}>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </SelectInput>
            </Field>
            <Field label="Category" error={fields.categoryId}>
              <SelectInput value={editor.draft.categoryId} onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, categoryId: event.target.value } })}>
                <option value="">Choose</option>
                {activeCategories.filter((category) => category.type === editor.draft.type).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Date" error={fields.date}>
              <TextInput type="date" value={editor.draft.date} onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, date: event.target.value } })} />
            </Field>
            <Field label="Payment method" error={fields.paymentMethod}>
              <SelectInput value={editor.draft.paymentMethod} onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, paymentMethod: event.target.value as PaymentMethod } })}>
                {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
              </SelectInput>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes" error={fields.notes}>
                <TextArea value={editor.draft.notes} onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, notes: event.target.value } })} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setEditor(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>Save</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
