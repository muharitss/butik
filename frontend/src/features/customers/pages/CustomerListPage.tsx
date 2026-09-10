import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { fetchCustomers, deleteCustomer } from '../api/customers.api.ts';
import type { Customer, PaginationMeta } from '../types/customers.types.ts';

export const CustomerListPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete dialog state
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Debounce search query
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setMeta((prev) => ({ ...prev, page: 1 })); // reset to page 1 on query change
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Load data
  const loadCustomers = async (page: number, q: string) => {
    setError(null);
    try {
      const res = await fetchCustomers({ q, page, pageSize: 20 });
      setCustomers(res.customers);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchCustomers({ q: debouncedQuery, page: meta.page, pageSize: 20 })
      .then((res) => {
        if (!active) return;
        setCustomers(res.customers);
        setMeta(res.meta);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load customers');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [meta.page, debouncedQuery]);

  const handleDelete = async () => {
    if (!customerToDelete) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
      // Reload current page or step back if page is now empty
      const isLastItemOnPage = customers.length === 1 && meta.page > 1;
      const targetPage = isLastItemOnPage ? meta.page - 1 : meta.page;
      loadCustomers(targetPage, debouncedQuery);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6" id="customers-list-page">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Customer Directory
            </h2>
            <Badge variant="secondary" className="font-sans">
              {meta.totalItems} clients
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage bespoke tailoring clients, contact records, and measurement profiles.
          </p>
        </div>

        <Link
          to="/customers/new"
          id="btn-create-customer"
          className={buttonVariants()}
        >
          <Plus className="size-4 mr-1.5" />
          Add Customer
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative flex items-center max-w-md">
        <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
        <Input
          id="input-customer-search"
          type="search"
          placeholder="Search by name or phone number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-8"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 text-muted-foreground hover:text-foreground p-1"
            aria-label="Clear search input"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Error loading customers</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Customers Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin mr-2" />
          <span className="text-sm">Loading customers...</span>
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 px-4 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <User className="size-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground">
            {debouncedQuery ? 'No customers found' : 'No customers yet'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            {debouncedQuery
              ? `No client matched "${debouncedQuery}". Try another search term or create a new client record.`
              : 'Add your first customer to start tracking measurements and tailoring orders.'}
          </p>
          {debouncedQuery ? (
            <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
              Clear Search Filter
            </Button>
          ) : (
            <Link
              to="/customers/new"
              className={buttonVariants({ size: 'sm' })}
            >
              <Plus className="size-4 mr-1.5" />
              Add Customer
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border bg-card">
            <Table id="table-customers">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Client Name</TableHead>
                  <TableHead className="w-[25%]">Contact</TableHead>
                  <TableHead className="w-[25%]">Address / Notes</TableHead>
                  <TableHead className="w-[10%]">Added</TableHead>
                  <TableHead className="w-[10%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} className="group">
                    <TableCell className="font-medium">
                      <Link
                        to={`/customers/${c.id}`}
                        className="hover:underline text-foreground flex items-center gap-2"
                      >
                        <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                        <span>{c.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs space-y-0.5">
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            className="text-foreground hover:underline flex items-center gap-1"
                          >
                            <Phone className="size-3 text-muted-foreground" />
                            {c.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">No phone</span>
                        )}
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="text-muted-foreground hover:underline flex items-center gap-1"
                          >
                            <Mail className="size-3" />
                            {c.email}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground max-w-xs truncate">
                        {c.address || c.notes || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/customers/${c.id}`}
                          className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                          title="View Details"
                        >
                          <Eye className="size-3.5" />
                        </Link>
                        <Link
                          to={`/customers/${c.id}/edit`}
                          className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                          title="Edit Customer"
                        >
                          <Pencil className="size-3.5" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteError(null);
                            setCustomerToDelete(c);
                          }}
                          title="Delete Customer"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {customers.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border bg-card p-4 space-y-3 text-card-foreground shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/customers/${c.id}`}
                    className="font-medium text-foreground hover:underline flex items-center gap-2"
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm">{c.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Added {formatDate(c.createdAt)}
                      </p>
                    </div>
                  </Link>
                </div>

                <div className="text-xs space-y-1 text-muted-foreground border-t pt-2">
                  {c.phone && (
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Phone className="size-3 text-muted-foreground" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3" />
                      <span>{c.email}</span>
                    </div>
                  )}
                  {c.address && <p className="truncate">📍 {c.address}</p>}
                </div>

                <div className="flex items-center justify-end gap-2 border-t pt-2">
                  <Link
                    to={`/customers/${c.id}`}
                    className={buttonVariants({ variant: 'outline', size: 'xs' })}
                  >
                    View
                  </Link>
                  <Link
                    to={`/customers/${c.id}/edit`}
                    className={buttonVariants({ variant: 'outline', size: 'xs' })}
                  >
                    Edit
                  </Link>
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => {
                      setDeleteError(null);
                      setCustomerToDelete(c);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
              <span>
                Page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> (
                {meta.totalItems} total)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1 || loading}
                  onClick={() => setMeta((prev) => ({ ...prev, page: prev.page - 1 }))}
                >
                  <ChevronLeft className="size-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages || loading}
                  onClick={() => setMeta((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                  <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={customerToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCustomerToDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent id="dialog-confirm-delete">
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{customerToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Cannot delete customer</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground">
            This customer will be soft-deleted and removed from standard directory searches.
          </p>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomerToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              id="btn-confirm-delete"
            >
              {deleting && <Loader2 className="size-3.5 animate-spin mr-1" />}
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
