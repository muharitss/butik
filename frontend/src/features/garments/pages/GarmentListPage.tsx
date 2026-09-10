import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
  Pencil,
  Eye,
  EyeOff,
  Scissors,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type { GarmentType } from '../types/garments.types.ts';
import { fetchGarmentTypes, deactivateGarmentType, updateGarmentType } from '../api/garments.api.ts';
import { GarmentFormDialog } from '../components/GarmentFormDialog.tsx';

export const GarmentListPage: React.FC = () => {
  const [garments, setGarments] = useState<GarmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Form Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [garmentToEdit, setGarmentToEdit] = useState<GarmentType | null>(null);

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
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar tipe busana');
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
    setDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (item: GarmentType) => {
    setGarmentToEdit(item);
    setDialogOpen(true);
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
      setGarmentToDeactivate(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal menonaktifkan tipe busana');
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
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengaktifkan kembali tipe busana');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
              Tipe Busana & Bidang Ukuran
            </h1>
            <Badge variant="secondary" className="text-xs">
              {garments.length} Model
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola master tipe busana dan daftar spesifikasi ukuran badan yang dibutuhkan saat pembuatan pesanan.
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
                <Eye className="h-3.5 w-3.5 mr-1.5" /> Menampilkan Nonaktif
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5 mr-1.5" /> Sembunyikan Nonaktif
              </>
            )}
          </Button>

          <Button onClick={handleOpenCreate} size="sm" className="text-xs">
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Tipe Busana
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari tipe busana atau nama ukuran..."
            className="pl-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Kesalahan</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
          <p className="text-sm">Memuat data tipe busana...</p>
        </div>
      ) : filteredGarments.length === 0 ? (
        <Card className="border-dashed bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-muted mb-3 text-muted-foreground">
              <Scissors className="h-6 w-6" />
            </div>
            <h3 className="font-heading font-semibold text-base text-foreground">
              {searchQuery ? 'Tidak Ada Tipe Busana yang Sesuai' : 'Belum Ada Tipe Busana'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              {searchQuery
                ? `Tidak ditemukan tipe busana dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                : 'Mulai dengan menambahkan tipe busana pertama Anda untuk mendefinisikan model pakaian dan spesifikasi ukurannya.'}
            </p>
            {!searchQuery && (
              <Button onClick={handleOpenCreate} size="sm" className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Tipe Busana Baru
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGarments.map((item) => (
            <Card
              key={item.id}
              className={`flex flex-col transition-all hover:border-foreground/20 ${
                !item.isActive ? 'opacity-75 bg-muted/20 border-dashed' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                      <span>{item.name}</span>
                    </CardTitle>
                    {item.description ? (
                      <CardDescription className="text-xs line-clamp-2">
                        {item.description}
                      </CardDescription>
                    ) : (
                      <CardDescription className="text-xs italic text-muted-foreground/60">
                        Tidak ada deskripsi tambahan
                      </CardDescription>
                    )}
                  </div>
                  <div>
                    {item.isActive ? (
                      <Badge variant="default" className="text-[10px] px-2 py-0.5">
                        <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" /> Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5 text-muted-foreground">
                        <XCircle className="h-3 w-3 mr-1" /> Nonaktif
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pb-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">Spesifikasi Ukuran:</span>
                    <span className="text-[11px]">
                      {item.measurementFields?.length || 0} bidang ukuran
                    </span>
                  </div>

                  {/* Measurement field chips */}
                  {item.measurementFields && item.measurementFields.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                      {item.measurementFields.map((field) => (
                        <span
                          key={field.id || field.fieldKey}
                          className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-md border ${
                            field.isRequired
                              ? 'bg-secondary/60 text-secondary-foreground border-border'
                              : 'bg-muted/40 text-muted-foreground border-border/50'
                          }`}
                          title={`Kunci: ${field.fieldKey} (${field.unit}) ${
                            field.isRequired ? '- Wajib' : '- Opsional'
                          }`}
                        >
                          {field.label}
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({field.unit})
                          </span>
                          {field.isRequired && (
                            <span className="text-primary font-bold ml-0.5">*</span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-muted-foreground/70 py-1">
                      Belum ada bidang ukuran yang dikonfigurasikan.
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => handleOpenEdit(item)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Ubah
                </Button>

                {item.isActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setGarmentToDeactivate(item)}
                  >
                    Nonaktifkan
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => handleReactivate(item)}
                    disabled={actionLoading}
                  >
                    Aktifkan Kembali
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog for Create & Edit */}
      <GarmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        garmentTypeToEdit={garmentToEdit}
        onSuccess={handleFormSuccess}
      />

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={Boolean(garmentToDeactivate)}
        onOpenChange={(open) => !open && setGarmentToDeactivate(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="font-heading text-lg">
                Konfirmasi Nonaktifkan
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-2">
              Apakah Anda yakin ingin menonaktifkan tipe busana{' '}
              <span className="font-semibold text-foreground">
                "{garmentToDeactivate?.name}"
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Tipe busana yang dinonaktifkan tidak akan muncul lagi di daftar pilihan pembuatan pesanan baru, namun tetap tersimpan pada pesanan riwayat yang sudah ada. Anda dapat mengaktifkannya kembali sewaktu-waktu.
          </p>

          {actionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
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
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeactivate}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Ya, Nonaktifkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
