import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pencil,
  Eye,
  CheckCircle2,
  XCircle,
  Scissors,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { GarmentType } from '../types/garments.types.ts';

interface GarmentListTableProps {
  garments: GarmentType[];
  onRowClick: (garment: GarmentType) => void;
  onEdit: (garment: GarmentType) => void;
  onDeactivate: (garment: GarmentType) => void;
  onReactivate: (garment: GarmentType) => void;
  actionLoading?: boolean;
  canManage?: boolean;
}

const formatDate = (isoString?: string | null) => {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

export const GarmentListTable: React.FC<GarmentListTableProps> = ({
  garments,
  onRowClick,
  onEdit,
  onDeactivate,
  onReactivate,
  actionLoading = false,
  canManage = false,
}) => {

  if (garments.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden"
      id="garment-list-table-container"
    >
      <Table id="table-garments">
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[30%] min-w-[200px] text-xs font-semibold">
              Garment Type
            </TableHead>
            <TableHead className="w-[35%] min-w-[220px] text-xs font-semibold">
              Measurement Fields
            </TableHead>
            <TableHead className="w-[12%] text-xs font-semibold">
              Status
            </TableHead>
            <TableHead className="w-[14%] text-xs font-semibold">
              Last Updated
            </TableHead>
            <TableHead className="w-[8%] text-right text-xs font-semibold min-w-[60px]">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {garments.map((item) => {
            const fieldsCount = item.measurementFields?.length || 0;
            const previewFields = item.measurementFields?.slice(0, 3) || [];
            const remainingFields = fieldsCount - previewFields.length;

            return (
              <TableRow
                key={item.id}
                onClick={() => onRowClick(item)}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  !item.isActive ? 'opacity-75 bg-muted/10' : ''
                }`}
                title="Click to view garment type details"
              >
                {/* Garment Name & Description */}
                <TableCell className="align-top py-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-md bg-muted text-muted-foreground shrink-0 mt-0.5">
                      <Scissors className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-semibold text-sm text-foreground tracking-tight hover:underline">
                        {item.name}
                      </p>
                      {item.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      ) : (
                        <p className="text-xs italic text-muted-foreground/60 mt-0.5">
                          No description
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Measurement Fields Preview */}
                <TableCell className="align-top py-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {fieldsCount}
                      </span>
                      <span>{fieldsCount === 1 ? 'measurement field' : 'measurement fields'}</span>
                    </div>

                    {fieldsCount > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {previewFields.map((field) => (
                          <span
                            key={field.id || field.fieldKey}
                            className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border ${
                              field.isRequired
                                ? 'bg-secondary/60 text-secondary-foreground border-border'
                                : 'bg-muted/40 text-muted-foreground border-border/50'
                            }`}
                          >
                            {field.label}
                            {field.isRequired && (
                              <span className="text-primary font-bold ml-0.5">*</span>
                            )}
                          </span>
                        ))}
                        {remainingFields > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50">
                            +{remainingFields} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs italic text-muted-foreground/60">
                        No fields configured
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Status Badge */}
                <TableCell className="align-top py-3.5">
                  {item.isActive ? (
                    <Badge variant="default" className="text-[10px] px-2 py-0.5">
                      <CheckCircle2 className="size-3 mr-1" /> Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-2 py-0.5 text-muted-foreground"
                    >
                      <XCircle className="size-3 mr-1" /> Inactive
                    </Badge>
                  )}
                </TableCell>

                {/* Last Updated */}
                <TableCell className="align-top py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(item.updatedAt || item.createdAt)}
                </TableCell>

                {/* Actions */}
                <TableCell className="align-top py-3.5 text-right whitespace-nowrap">
                  <div
                    className="flex items-center justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Actions"
                            aria-label={`Actions for ${item.name}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => onRowClick(item)}
                          className="cursor-pointer"
                        >
                          <Eye className="size-3.5 mr-2 text-muted-foreground" />
                          <span>View Details</span>
                        </DropdownMenuItem>
                        {canManage && (
                          <>
                            <DropdownMenuItem
                              onClick={() => onEdit(item)}
                              className="cursor-pointer"
                            >
                              <Pencil className="size-3.5 mr-2 text-muted-foreground" />
                              <span>Edit Garment Type</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {item.isActive ? (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => onDeactivate(item)}
                                disabled={actionLoading}
                                className="cursor-pointer"
                              >
                                <XCircle className="size-3.5 mr-2" />
                                <span>Deactivate</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => onReactivate(item)}
                                disabled={actionLoading}
                                className="cursor-pointer"
                              >
                                <CheckCircle2 className="size-3.5 mr-2 text-muted-foreground" />
                                <span>Reactivate</span>
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>

                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
