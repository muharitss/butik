import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Phone,
  Mail,
  MapPin,
  Loader2,
  X,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { usePermission } from '../../../hooks/usePermission.ts';
import { fetchCustomers, deleteCustomer } from '../api/customers.api.ts';
import type { Customer, PaginationMeta } from '../types/customers.types.ts';

export const CustomerListPage: React.FC = () => {
  const canDeleteCustomer = usePermission('customers:delete');
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
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
              Customer Directory
            </h1>
            <Badge variant="secondary" className="text-xs">
              {meta.totalItems} {meta.totalItems === 1 ? 'client' : 'clients'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage bespoke tailoring clients, contact records, and measurement profiles.
          </p>
        </div>

        <Link
          to="/customers/new"
          id="btn-create-customer"
          className={buttonVariants({ size: 'default' })}
        >
          <Plus className="size-4 mr-1.5" />
          Add Customer
        </Link>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 max-w-md w-full">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id="input-customer-search"
            type="search"
            placeholder="Search by name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 text-sm"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search input"
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
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
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-7 animate-spin mb-2 text-primary" />
          <span className="text-sm">Loading customer directory...</span>
        </div>
      ) : customers.length === 0 ? (
        <Card className="border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="rounded-full bg-muted p-3 mb-3 text-muted-foreground">
              <Users className="size-6" />
            </div>
            <h3 className="font-heading font-semibold text-lg text-foreground">
              {debouncedQuery ? 'No customers found' : 'No customers yet'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              {debouncedQuery
                ? `No client matched "${debouncedQuery}". Try another search term or create a new client record.`
                : 'Add your first customer to start tracking bespoke measurements and tailoring orders.'}
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
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <Card className="hidden md:block overflow-hidden border">
            <Table id="table-customers">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[32%]">Client Name</TableHead>
                  <TableHead className="w-[28%]">Contact Info</TableHead>
                  <TableHead className="w-[22%]">Address / Notes</TableHead>
                  <TableHead className="w-[10%]">Added</TableHead>
                  <TableHead className="w-[8%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-medium">
                      <Link
                        to={`/customers/${c.id}`}
                        className="group/name flex items-center gap-3 text-foreground hover:underline"
                      >
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-heading font-bold text-xs">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate text-foreground group-hover/name:text-primary transition-colors">
                            {c.name}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs space-y-1">
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            className="text-foreground hover:underline flex items-center gap-1.5 w-fit"
                          >
                            <Phone className="size-3 text-muted-foreground" />
                            <span>{c.phone}</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic flex items-center gap-1.5">
                            <Phone className="size-3 text-muted-foreground/60" />
                            No phone
                          </span>
                        )}
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="text-muted-foreground hover:underline flex items-center gap-1.5 truncate max-w-[220px]"
                          >
                            <Mail className="size-3 shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground max-w-[220px] truncate">
                        {c.address || c.notes ? (
                          <span className="flex items-center gap-1.5 truncate">
                            {c.address ? (
                              <>
                                <MapPin className="size-3 shrink-0 text-muted-foreground" />
                                <span className="truncate">{c.address}</span>
                              </>
                            ) : (
                              <span className="truncate">{c.notes}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 italic">—</span>
                        )}
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
                          <span className="sr-only">View {c.name}</span>
                        </Link>
                        <Link
                          to={`/customers/${c.id}/edit`}
                          className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                          title="Edit Customer"
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Edit {c.name}</span>
                        </Link>
                        {canDeleteCustomer && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              setDeleteError(null);
                              setCustomerToDelete(c);
                            }}
                            title="Delete Customer"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Delete {c.name}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {customers.map((c) => (
              <Card key={c.id} className="transition-all hover:border-foreground/20">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={`/customers/${c.id}`}
                      className="flex items-center gap-2.5 min-w-0"
                    >
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-heading font-bold text-xs">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="font-heading text-sm font-semibold truncate hover:underline text-foreground">
                          {c.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Added {formatDate(c.createdAt)}
                        </CardDescription>
                      </div>
                    </Link>
                  </div>
                </CardHeader>

                <CardContent className="space-y-1.5 text-xs text-muted-foreground pt-0 pb-3">
                  {c.phone ? (
                    <div className="flex items-center gap-2 text-foreground">
                      <Phone className="size-3 text-muted-foreground" />
                      <a href={`tel:${c.phone}`} className="hover:underline">
                        {c.phone}
                      </a>
                    </div>
                  ) : null}
                  {c.email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="size-3 text-muted-foreground" />
                      <a href={`mailto:${c.email}`} className="hover:underline truncate">
                        {c.email}
                      </a>
                    </div>
                  ) : null}
                  {c.address ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  ) : null}
                </CardContent>

                <CardFooter className="border-t pt-3 flex items-center justify-end gap-2">
                  <Link
                    to={`/customers/${c.id}`}
                    className={buttonVariants({ variant: 'outline', size: 'xs' })}
                  >
                    <Eye className="size-3 mr-1" />
                    View
                  </Link>
                  <Link
                    to={`/customers/${c.id}/edit`}
                    className={buttonVariants({ variant: 'outline', size: 'xs' })}
                  >
                    <Pencil className="size-3 mr-1" />
                    Edit
                  </Link>
                  {canDeleteCustomer && (
                    <Button
                      variant="destructive"
                      size="xs"
                      onClick={() => {
                        setDeleteError(null);
                        setCustomerToDelete(c);
                      }}
                    >
                      <Trash2 className="size-3 mr-1" />
                      Delete
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
              <span>
                Showing page <strong className="text-foreground">{meta.page}</strong> of{' '}
                <strong className="text-foreground">{meta.totalPages}</strong> (
                {meta.totalItems} total {meta.totalItems === 1 ? 'client' : 'clients'})
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
