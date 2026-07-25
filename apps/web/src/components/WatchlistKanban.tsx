"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useWatchlistStore, type WatchlistColumn } from "@/stores/use-watchlist-store";
import { useAuthStore } from "@/stores/use-auth-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const COLUMNS: WatchlistColumn[] = [
  { id: "want", title: "Quero ver", items: [] },
  { id: "watching", title: "Assistindo", items: [] },
  { id: "completed", title: "Completo", items: [] },
  { id: "dropped", title: "Abandonado", items: [] },
];

function KanbanCard({ id, title }: { id: string; title: string }) {
  const t = useTranslations("catalog");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-surface-card rounded-lg p-3 border border-surface-border/20 cursor-grab active:cursor-grabbing shadow-surface-1 touch-none">
      <Link href={`/media/${id}`} className="block text-sm font-medium text-gray-200 hover:text-accent-400 truncate">{title}</Link>
    </div>
  );
}

export function WatchlistKanban() {
  const t = useTranslations("catalog");
  const { columns, moveItem, addToColumn } = useWatchlistStore();
  const { isAuthenticated } = useAuthStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromCol = Object.entries(columns).find(([, c]) => c.items.includes(String(active.id)))?.[0];
    const toCol = Object.values(columns).find((c) => c.items.includes(String(over.id)))?.id || over.id;
    if (fromCol) {
      moveItem(fromCol, String(toCol), String(active.id));
      toast.success("Movido!");
    }
  };

  const totalItems = Object.values(columns).reduce((s, c) => s + c.items.length, 0);

  if (totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" role="status">
        <svg className="w-14 h-14 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
        <p className="text-gray-400 mb-4">Sua watchlist está vazia.</p>
        <Link href="/catalog"><Button>Explorar catálogo</Button></Link>
      </div>
    );
  }

  return (
    <>
      {!isAuthenticated && (
        <div className="mb-8 p-4 bg-surface-elevated rounded-xl border border-accent-500/20 text-sm text-gray-300 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Sua watchlist está salva neste dispositivo. Crie uma conta para sincronizar entre dispositivos.</span>
          <Link href="/register"><Button size="sm" variant="default">Criar conta</Button></Link>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="grid grid-cols-4 gap-4 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ gridAutoColumns: "minmax(220px, 1fr)" }}>
          {COLUMNS.map((col) => {
            const colData = columns[col.id];
            const items = colData?.items || [];
            return (
              <div key={col.id} className="snap-start min-w-[220px] flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-200">{col.title}</h3>
                  <span className="text-xs text-gray-500 bg-surface-card px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 flex-1 min-h-[120px] bg-surface-elevated/20 rounded-xl p-2 border border-dashed border-surface-border/20">
                    {items.length === 0 && (
                      <p className="text-xs text-gray-600 text-center py-8">Solte títulos aqui</p>
                    )}
                    {items.map((mediaId) => (
                      <KanbanCard key={mediaId} id={mediaId} title={`Mídia ${mediaId}`} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>
    </>
  );
}
