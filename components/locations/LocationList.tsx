"use client";

import { useState } from "react";
import { MapPin, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button.legacy";
import { Input } from "@/components/ui/Input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import type { Location } from "@/types/prisma";

interface LocationListProps {
  locations: Location[];
  onUpdateName: (locationId: string, name: string) => Promise<void>;
  onDelete: (locationId: string) => Promise<void>;
}

export function LocationList({
  locations,
  onUpdateName,
  onDelete,
}: LocationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleStartEdit = (location: Location) => {
    setEditingId(location.id);
    setEditName(location.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      setSaving(true);
      await onUpdateName(editingId, editName.trim());
      setEditingId(null);
      setEditName("");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await onDelete(deleteId);
      setDeleteId(null);
    } catch {
      // Error handled in parent
    }
  };

  const locationToDelete = locations.find((l) => l.id === deleteId);

  if (locations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No locations added yet.</p>
        <p className="text-sm">Add your first location to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {locations.map((location) => (
          <div
            key={location.id}
            className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />

            <div className="flex-1 min-w-0">
              {editingId === location.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                />
              ) : (
                <>
                  <p className="font-medium truncate">{location.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {location.address}
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              {editingId === location.id ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={saving || !editName.trim()}
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(location)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(location.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{locationToDelete?.name}&quot;?
              This will also remove all travel times associated with this
              location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
