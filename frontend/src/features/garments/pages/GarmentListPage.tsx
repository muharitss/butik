import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  Plus,
  Search,
  Eye,
  EyeOff,
  Scissors,
  Loader2,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import type { GarmentType } from '../types/garments.types.ts';
import {
  fetchGarmentTypes,
  deactivateGarmentType,
  updateGarmentType,
} from '../api/garments.api.ts';
import { GarmentFormDialog } from '../components/GarmentFormDialog.tsx';
import { GarmentListTable } from '../components/GarmentListTable.tsx';
import { GarmentDetailDialog } from '../components/GarmentDetailDialog.tsx';

export const GarmentListPage: React.FC = () => {
  const [garments, setGarments] = useState<GarmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Form Dialog state (Create & Edit)
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [garmentToEdit, setGarmentToEdit] = useState<GarmentType | null>(null);

  // Detail Dialog state
  const [selectedGarmentForDetail, setSelectedGarmentForDetail] = useState<GarmentType | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Deactivate confirmation state
  const [garmentToDeactivate, setGarmentToDeactivate] = useState<GarmentType | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch data
  const loadGarments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGarmentTypes({ includeInactive });
      setGarments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load garment types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGarments();
  }, [includeInactive]);

  // Filtered garments by local search query
  const filteredGarments = useMemo(() => {
    if (!searchQuery.trim()) return garments;
    const q = searchQuery.toLowerCase().trim();
    return garments.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        (g.measurementFields &&
          g.measurementFields.some(
            (f) =>
              f.label.toLowerCase().includes(q) ||
              f.fieldKey.toLowerCase().includes(q)
          ))
    );
  }, [garments, searchQuery]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setGarmentToEdit(null);
    setFormDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (item: GarmentType) => {
    setGarmentToEdit(item);
    setFormDialogOpen(true);
  };

  // Open Detail Dialog
  const handleRowClick = (item: GarmentType) => {
    setSelectedGarmentForDetail(item);
    setDetailDialogOpen(true);
  };

  // Handle Form Success
  const handleFormSuccess = (saved: GarmentType) => {
    setGarments((prev) => {
      const existingIdx = prev.findIndex((g) => g.id === saved.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });

    if (selectedGarmentForDetail?.id === saved.id) {
      setSelectedGarmentForDetail(saved);
    }
  };

  // Confirm Deactivate
  const handleConfirmDeactivate = async () => {
    if (!garmentToDeactivate) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await deactivateGarmentType(garmentToDeactivate.id);
      setGarments((prev) =>
        includeInactive
          ? prev.map((g) => (g.id === updated.id ? updated : g))
          : prev.filter((g) => g.id !== updated.id)
      );

      if (selectedGarmentForDetail?.id === updated.id) {
        if (includeInactive) {
          setSelectedGarmentForDetail(updated);
        } else {
          setSelectedGarmentForDetail(null);
          setDetailDialogOpen(false);
        }
      }

      setGarmentToDeactivate(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to deactivate garment type');
    } finally {
      setActionLoading(false);
    }
  };

  // Reactivate garment type
  const handleReactivate = async (item: GarmentType) => {
    setActionLoading(true);
    try {
      const updated = await updateGarmentType(item.id, { isActive: true });
      setGarments((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));

      if (selectedGarmentForDetail?.id === updated.id) {
        setSelectedGarmentForDetail(updated);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reactivate garment type');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="garments-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
              Garment Types & Measurement Fields
            </h1>
            <Badge variant="secondary" className="text-xs">
              {garments.length} {garments.length === 1 ? 'Model' : 'Models'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage master garment types and required body measurement specifications for order creation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={includeInactive ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setIncludeInactive(!includeInactive)}
            className="text-xs"
          >
            {includeInactive ? (
              <>
                <Eye className="size-3.5 mr-1.5" /> Showing Inactive
              </>
            ) : (
              <>
                <EyeOff className="size-3.5 mr-1.5" /> Hide Inactive
              </>
            )}
          </Button>

          <Button onClick={handleOpenCreate} size="sm" className="text-xs">
            <Plus className="size-4 mr-1.5" /> Add Garment Type
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search garment types or measurement fields..."
            className="pl-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-8 animate-spin mb-3 text-primary" />
          <p className="text-sm">Loading garment types...</p>
        </div>
      ) : filteredGarments.length === 0 ? (
        <Card className="border-dashed bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-muted mb-3 text-muted-foreground">
              <Scissors className="size-6" />
            </div>
            <h3 className="font-heading font-semibold text-base text-foreground">
              {searchQuery ? 'No Matching Garment Types' : 'No Garment Types Yet'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              {searchQuery
                ? `No garment types found matching "${searchQuery}". Try another search term.`
                : 'Start by adding your first garment type to define clothing styles and measurement specifications.'}
            </p>
            {!searchQuery && (
              <Button onClick={handleOpenCreate} size="sm" className="text-xs">
                <Plus className="size-3.5 mr-1" /> Add New Garment Type
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <GarmentListTable
          garments={filteredGarments}
          onRowClick={handleRowClick}
          onEdit={handleOpenEdit}
          onDeactivate={setGarmentToDeactivate}
          onReactivate={handleReactivate}
          actionLoading={actionLoading}
        />
      )}

      {/* Detail Dialog */}
      <GarmentDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        garment={selectedGarmentForDetail}
        onEdit={handleOpenEdit}
        onDeactivate={setGarmentToDeactivate}
        onReactivate={handleReactivate}
        actionLoading={actionLoading}
      />

      {/* Form Dialog for Create & Edit */}
      <GarmentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        garmentTypeToEdit={garmentToEdit}
        onSuccess={handleFormSuccess}
      />

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={Boolean(garmentToDeactivate)}
        onOpenChange={(open) => !open && setGarmentToDeactivate(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </div>
              <DialogTitle className="font-heading text-lg">
                Confirm Deactivation
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-2">
              Are you sure you want to deactivate garment type{' '}
              <span className="font-semibold text-foreground">
                "{garmentToDeactivate?.name}"
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Deactivated garment types will no longer appear when creating new orders, but remain preserved in existing order records. You can reactivate them at any time.
          </p>

          {actionError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs">{actionError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGarmentToDeactivate(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeactivate}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Yes, Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
