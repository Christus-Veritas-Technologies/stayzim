"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogIcon,
  AlertDialogTitle,
} from "@stayzim/ui/components/alert-dialog";
import { Badge } from "@stayzim/ui/components/badge";
import { Button } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@stayzim/ui/components/dropdown-menu";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Progress } from "@stayzim/ui/components/progress";
import { Spinner } from "@stayzim/ui/components/spinner";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import { ArrowDown, ArrowUp, BedDouble, CircleCheck, Copy, Eye, EyeOff, GripVertical, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { Page, PageHeader, PageSection } from "@/components/dashboard/page";
import { AmenityIcons, RoomStatus, RoomThumb } from "@/components/dashboard/room-bits";
import { RoomSheet } from "@/components/dashboard/room-sheet";
import { formatPrice, ROOM_PHOTO_LIMIT, roomNeedsPhoto, type Lodge, type Room } from "@/lib/lodge";

type Filter = "all" | "missing" | "hidden";

const COLUMNS = "grid-cols-[40px_minmax(0,1.6fr)_0.8fr_0.9fr_1fr_0.8fr_48px]";

type RowActions = {
  onEdit: (room: Room) => void;
  onDuplicate: (room: Room) => void;
  onToggleVisible: (room: Room) => void;
  onMove: (room: Room, by: number) => void;
  onDelete: (room: Room) => void;
  onDragEnd: (room: Room) => void;
};

function RoomMenu({ room, index, total, actions }: { room: Room; index: number; total: number; actions: RowActions }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Options for ${room.name}`}
        className="flex size-8 items-center justify-center rounded-[9px] border border-line bg-white text-muted-2 shadow-xs transition-colors outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/30 data-popup-open:border-brand/40 data-popup-open:text-brand"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => actions.onEdit(room)}>
          <Pencil />
          Edit room
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.onDuplicate(room)}>
          <Copy />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.onToggleVisible(room)}>
          {room.visible ? <EyeOff /> : <Eye />}
          {room.visible ? "Hide from site" : "Show on site"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={index === 0} onClick={() => actions.onMove(room, -1)}>
          <ArrowUp />
          Move up
        </DropdownMenuItem>
        <DropdownMenuItem disabled={index === total - 1} onClick={() => actions.onMove(room, 1)}>
          <ArrowDown />
          Move down
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete(room)}>
          <Trash2 />
          Delete room
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PhotoProgress({ room }: { room: Room }) {
  const count = room.photos.length;
  const percent = Math.round((count / ROOM_PHOTO_LIMIT) * 100);
  return (
    <span className="flex w-full flex-col gap-1.5">
      <span className="flex justify-between text-xs">
        <span className="font-semibold text-ink">
          {count} of {ROOM_PHOTO_LIMIT}
        </span>
        <span className="text-muted-2">{percent}%</span>
      </span>
      <Progress value={percent} tone={count === ROOM_PHOTO_LIMIT ? "success" : count === 0 ? "danger" : "brand"} />
    </span>
  );
}

/** One room. Drag it by its handle (mouse or a held finger). */
function RoomRow({
  room,
  index,
  total,
  sortable,
  busy,
  actions,
}: {
  room: Room;
  index: number;
  total: number;
  sortable: boolean;
  /** Deleting, or its new place is saving: faded, with a spinner in place of the menu */
  busy: boolean;
  actions: RowActions;
}) {
  const controls = useDragControls();
  const menu = busy ? (
    <span className="flex size-8 items-center justify-center text-brand">
      <Spinner label={`Saving ${room.name}`} />
    </span>
  ) : (
    <RoomMenu room={room} index={index} total={total} actions={actions} />
  );
  return (
    <Reorder.Item
      value={room.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={() => actions.onDragEnd(room)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: busy ? 0.55 : 1, y: 0 }}
      aria-busy={busy || undefined}
      exit={{ opacity: 0, x: -24 }}
      whileDrag={{ scale: 1.01, boxShadow: "0 16px 40px -12px rgba(12,24,31,0.25)", zIndex: 10 }}
      className={cn("relative bg-white", busy && "pointer-events-none")}
    >
      {/* Desktop: a table row */}
      <div className={cn("hidden min-h-[68px] items-center border-b border-line-3 md:grid", COLUMNS)}>
        <span className="flex justify-center">
          {sortable ? (
            <button
              type="button"
              aria-label={`Drag to reorder ${room.name}`}
              onPointerDown={(event) => controls.start(event)}
              className="flex size-8 cursor-grab touch-none items-center justify-center rounded-md text-soft hover:bg-surface hover:text-muted active:cursor-grabbing"
            >
              <GripVertical className="size-4" />
            </button>
          ) : null}
        </span>
        <button type="button" onClick={() => actions.onEdit(room)} className="flex min-w-0 items-center gap-3 px-3 py-2.5 text-left">
          <RoomThumb room={room} className="h-11 w-16" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-semibold hover:text-brand">{room.name}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Users className="size-3" />
              Sleeps {room.sleeps}
              {room.units > 1 ? <span className="text-muted-2">· You have {room.units}</span> : null}
            </span>
          </span>
        </button>
        <span className="px-3 text-[13.5px]">
          <strong className="font-semibold">{formatPrice(room.price)}</strong> <span className="text-muted-2">/ night</span>
        </span>
        <span className="px-3">
          <AmenityIcons room={room} />
        </span>
        <span className="px-3">
          <PhotoProgress room={room} />
        </span>
        <span className="px-3">
          <RoomStatus room={room} />
        </span>
        <span className="flex justify-center">{menu}</span>
      </div>

      {/* Phones: a card */}
      <div className="flex items-center gap-3 border-b border-line-3 px-3 py-3 md:hidden">
        {sortable ? (
          <button
            type="button"
            aria-label={`Hold and drag to reorder ${room.name}`}
            onPointerDown={(event) => controls.start(event)}
            className="-my-1 -mr-1 -ml-2 flex h-12 w-9 touch-none items-center justify-center text-soft"
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <button type="button" onClick={() => actions.onEdit(room)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <RoomThumb room={room} className="h-12 w-16" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[14px] font-semibold">{room.name}</span>
            <span className="text-xs text-muted">
              {formatPrice(room.price)} / night · Sleeps {room.sleeps}
              {room.units > 1 ? ` · × ${room.units}` : ""}
            </span>
            {!room.visible ? (
              <span className="text-xs font-semibold text-muted-2">Hidden from your site</span>
            ) : roomNeedsPhoto(room) ? (
              <span className="text-xs font-semibold text-warning">Add a photo</span>
            ) : (
              <span className="text-xs text-muted-2">
                {room.photos.length} of {ROOM_PHOTO_LIMIT} photos
              </span>
            )}
          </span>
        </button>
        {menu}
      </div>
    </Reorder.Item>
  );
}

export default function RoomsPage() {
  const { lodge, save, saveWith } = useLodge();
  const [filter, setFilter] = useState<Filter>("all");
  const [order, setOrder] = useState<string[]>(() => lodge.rooms.map((room) => room.id));
  const latestOrder = useRef(order);
  const [sheet, setSheet] = useState<{ open: boolean; roomId: string | null; key: number }>({ open: false, roomId: null, key: 0 });
  const [deleting, setDeleting] = useState<Room | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  /** The room whose move is saving */
  const [moving, setMoving] = useState<string | null>(null);

  useEffect(() => {
    const ids = lodge.rooms.map((room) => room.id);
    setOrder(ids);
    latestOrder.current = ids;
  }, [lodge.rooms]);

  const missing = lodge.rooms.filter((room) => room.visible && roomNeedsPhoto(room));
  const hidden = lodge.rooms.filter((room) => !room.visible);
  const shown: Filter = filter === "hidden" && hidden.length === 0 ? "all" : filter;
  const rooms = order
    .map((id) => lodge.rooms.find((room) => room.id === id))
    .filter((room): room is Room => Boolean(room))
    .filter((room) => (shown === "missing" ? room.visible && roomNeedsPhoto(room) : shown === "hidden" ? !room.visible : true));
  const sortable = shown === "all";

  async function saveOrder(ids: string[], movedId: string) {
    if (ids.join() === lodge.rooms.map((room) => room.id).join()) return;
    setMoving(movedId);
    const error = await save("/rooms/order", "PUT", { ids });
    setMoving(null);
    if (error) {
      toast.error(error);
      setOrder(lodge.rooms.map((room) => room.id));
    }
  }

  const actions: RowActions = {
    onEdit: (room) => setSheet((current) => ({ open: true, roomId: room.id, key: current.key + 1 })),
    onDelete: setDeleting,
    onDuplicate: async (room) => {
      setMoving(room.id);
      const result = await saveWith<{ roomId: string; lodge: Lodge }>(`/rooms/${room.id}/duplicate`, "POST");
      setMoving(null);
      if (result.error !== undefined) {
        toast.error(result.error);
        return;
      }
      toast.success("Copy added", { description: "It's hidden until you show it on your site." });
      setSheet((current) => ({ open: true, roomId: result.data.roomId, key: current.key + 1 }));
    },
    onToggleVisible: async (room) => {
      const visible = !room.visible;
      setMoving(room.id);
      const error = await save(`/rooms/${room.id}`, "PATCH", { visible });
      setMoving(null);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(visible ? `${room.name} is on your site` : `${room.name} is hidden from your site`, {
        description: visible ? undefined : "It stays here, with its photos. Guests don't see it.",
        action: {
          label: "Undo",
          onClick: async () => {
            const undoError = await save(`/rooms/${room.id}`, "PATCH", { visible: !visible });
            if (undoError) toast.error(undoError);
          },
        },
      });
    },
    onDragEnd: (room) => void saveOrder(latestOrder.current, room.id),
    onMove: (room, by) => {
      const from = order.indexOf(room.id);
      const to = from + by;
      if (to < 0 || to >= order.length) return;
      const next = [...order];
      next.splice(to, 0, next.splice(from, 1)[0]!);
      setOrder(next);
      latestOrder.current = next;
      void saveOrder(next, room.id);
    },
  };

  async function confirmDelete() {
    if (!deleting) return;
    setBusyDelete(true);
    const error = await save(`/rooms/${deleting.id}`, "DELETE");
    setBusyDelete(false);
    if (error) toast.error(error);
    else {
      toast.success(`${deleting.name} deleted`);
      setDeleting(null);
    }
  }

  const editingRoom = sheet.roomId ? (lodge.rooms.find((room) => room.id === sheet.roomId) ?? null) : null;

  return (
    <Page>
      <PageHeader
        sitePage
        back={{ label: "My site", href: "/dashboard/site" }}
        title="Rooms"
        count={lodge.rooms.length}
        description="Guests see rooms in this order. Drag to reorder, or hide a room you're not letting for now."
        actions={
          <Button onClick={() => setSheet((current) => ({ open: true, roomId: null, key: current.key + 1 }))}>
            <Plus />
            Add room
          </Button>
        }
      />

      <PageSection>
        <Card className="overflow-hidden">
          {lodge.rooms.length === 0 ? (
            <EmptyState
              icon={<BedDouble />}
              title="No rooms yet"
              description="Add each room with its price, how many it sleeps and a few photos. Every room gets its own Book on WhatsApp button."
              action={
                <Button onClick={() => setSheet((current) => ({ open: true, roomId: null, key: current.key + 1 }))}>
                  <Plus />
                  Add your first room
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex items-center gap-3 overflow-x-auto px-3 py-3 [scrollbar-width:none] sm:px-4">
                <Tabs value={shown} onValueChange={(value) => setFilter(value as Filter)}>
                  <TabsList aria-label="Show" className="shrink-0">
                    <TabsTab value="all">All rooms</TabsTab>
                    <TabsTab value="missing">
                      Missing photos
                      {missing.length > 0 ? (
                        <Badge variant={shown === "missing" ? "inverse" : "warning"} className="h-5 px-1.5">
                          {missing.length}
                        </Badge>
                      ) : null}
                    </TabsTab>
                    {hidden.length > 0 ? (
                      <TabsTab value="hidden">
                        Hidden
                        <Badge variant={shown === "hidden" ? "inverse" : "neutral"} className="h-5 px-1.5">
                          {hidden.length}
                        </Badge>
                      </TabsTab>
                    ) : null}
                  </TabsList>
                </Tabs>
              </div>

              <div className={cn("hidden h-[38px] items-center border-y border-[#EAEFF2] bg-surface text-xs font-semibold text-muted md:grid", COLUMNS)}>
                <span />
                {["Room", "Price", "Amenities", "Photos", "Status"].map((heading) => (
                  <span key={heading} className="px-3">
                    {heading}
                  </span>
                ))}
                <span />
              </div>

              {rooms.length === 0 ? (
                <EmptyState
                  icon={<CircleCheck />}
                  title="Every room has a photo"
                  description="Rooms with photos get more booking chats."
                  className="border-t border-line-3"
                />
              ) : (
                <Reorder.Group
                  axis="y"
                  values={order}
                  onReorder={(next: string[]) => {
                    setOrder(next);
                    latestOrder.current = next;
                  }}
                  className="border-t border-line-3 md:border-t-0"
                >
                  <AnimatePresence initial={false}>
                    {rooms.map((room, index) => (
                      <RoomRow
                        key={room.id}
                        room={room}
                        index={index}
                        total={rooms.length}
                        sortable={sortable}
                        busy={moving === room.id || (busyDelete && deleting?.id === room.id)}
                        actions={actions}
                      />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[12.5px] text-muted">
                <span>
                  Total <strong className="font-semibold text-ink">{lodge.rooms.length}</strong> {lodge.rooms.length === 1 ? "room" : "rooms"}
                  {sortable ? (
                    <>
                      {" "}
                      · drag <GripVertical className="inline size-3.5 align-[-3px]" /> to reorder
                    </>
                  ) : null}
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={moving ? "saving" : "saved"}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    role="status"
                    className="inline-flex items-center gap-1.5"
                  >
                    {moving ? (
                      <>
                        <Spinner className="size-3.5 text-brand" />
                        Saving order…
                      </>
                    ) : (
                      <>
                        <CircleCheck className="size-3.5 text-success" />
                        Order and changes show on your site straight away
                      </>
                    )}
                  </motion.span>
                </AnimatePresence>
              </div>
            </>
          )}
        </Card>
      </PageSection>

      <RoomSheet
        key={sheet.key}
        open={sheet.open}
        onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
        room={editingRoom}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogIcon>
            <Trash2 />
          </AlertDialogIcon>
          <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            It disappears from your site straight away
            {deleting && deleting.photos.length > 0
              ? `, with its ${deleting.photos.length} ${deleting.photos.length === 1 ? "photo" : "photos"}`
              : ""}
            . You can&apos;t undo this.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>Keep room</AlertDialogClose>
            <Button variant="destructive" onClick={confirmDelete} loading={busyDelete}>
              Delete room
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
