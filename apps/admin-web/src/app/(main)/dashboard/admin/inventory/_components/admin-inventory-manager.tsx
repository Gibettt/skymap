"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Boxes, Building2, CheckCircle2, Edit2, PackagePlus, Plus, Search, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import type { AdminInventoryItem, ResortOption } from "../page";

interface AdminInventoryManagerProps {
  initialItems: AdminInventoryItem[];
  resorts: ResortOption[];
}

const CATEGORIES = [
  "All",
  "Optical Equipment",
  "Mounts & Tripods",
  "Eyepieces & Lenses",
  "Accessories",
  "Power & Batteries",
  "Safety & Tools",
];

function getConditionBadgeStyle(condition: string): string {
  if (condition === "good") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs";
  if (condition === "fair") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs";
  return "border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs";
}

function getConditionLabel(condition: string): string {
  if (condition === "good") return "Good";
  if (condition === "fair") return "Fair";
  if (condition === "needs_repair") return "Needs Repair";
  return "Broken";
}

function getStatusBadgeStyle(status: string): string {
  if (status === "available") return "border-emerald-500/30 text-emerald-300 text-xs";
  if (status === "in_use") return "border-violet-500/30 text-violet-300 text-xs";
  return "border-amber-500/30 text-amber-300 text-xs";
}

function getStatusLabel(status: string): string {
  if (status === "available") return "Available";
  if (status === "in_use") return "In Use";
  return "Maintenance";
}

export function AdminInventoryManager({ initialItems, resorts }: AdminInventoryManagerProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<AdminInventoryItem[]>(initialItems);
  const [search, setSearch] = React.useState("");
  const [selectedResort, setSelectedResort] = React.useState("All");
  const [selectedCategory, setSelectedCategory] = React.useState("All");

  // Add item modal
  const [addOpen, setAddOpen] = React.useState(false);
  const [addPending, setAddPending] = React.useState(false);
  const [resortId, setResortId] = React.useState(resorts[0]?.id || "");
  const [itemName, setItemName] = React.useState("");
  const [category, setCategory] = React.useState("Optical Equipment");
  const [quantity, setQuantity] = React.useState("1");
  const [unit, setUnit] = React.useState("units");
  const [condition, setCondition] = React.useState("good");
  const [status, setStatus] = React.useState("available");
  const [locationDetails, setLocationDetails] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Edit item modal
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<AdminInventoryItem | null>(null);
  const [editPending, setEditPending] = React.useState(false);

  const filteredItems = items.filter((item) => {
    const matchesResort = selectedResort === "All" || item.resort_id === selectedResort;
    const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      !search ||
      item.item_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.resort_name && item.resort_name.toLowerCase().includes(search.toLowerCase())) ||
      (item.location_details && item.location_details.toLowerCase().includes(search.toLowerCase()));
    return matchesResort && matchesCat && matchesSearch;
  });

  const totalQuantity = items.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);
  const goodCount = items.filter((item) => item.condition === "good").length;
  const maintenanceCount = items.filter(
    (item) => item.condition === "needs_repair" || item.condition === "broken" || item.status === "maintenance",
  ).length;

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim() || !resortId) return;

    setAddPending(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resortId,
          itemName: itemName.trim(),
          category,
          quantity: parseInt(quantity, 10) || 1,
          unit,
          condition,
          status,
          locationDetails: locationDetails.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambahkan item");

      const resortName = resorts.find((r) => r.id === resortId)?.name || null;
      const newItem: AdminInventoryItem = { ...data.item, resort_name: resortName };

      toast.success(`Item "${itemName}" berhasil ditambahkan`);
      setItems((prev) => [newItem, ...prev]);
      setAddOpen(false);
      setItemName("");
      setLocationDetails("");
      setNotes("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan item");
    } finally {
      setAddPending(false);
    }
  }

  async function handleUpdateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;

    setEditPending(true);
    try {
      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: editingItem.item_name,
          category: editingItem.category,
          quantity: Number(editingItem.quantity),
          unit: editingItem.unit,
          condition: editingItem.condition,
          status: editingItem.status,
          locationDetails: editingItem.location_details,
          notes: editingItem.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui item");

      toast.success(`Item "${editingItem.item_name}" berhasil diperbarui`);
      setItems((prev) => prev.map((item) => (item.id === editingItem.id ? { ...item, ...data.item } : item)));
      setEditOpen(false);
      setEditingItem(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui item");
    } finally {
      setEditPending(false);
    }
  }

  async function handleDeleteItem(item: AdminInventoryItem) {
    if (!confirm(`Hapus "${item.item_name}" dari inventory?`)) return;

    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus item");

      toast.success(`"${item.item_name}" dihapus`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus item");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">Resort Inventory</h1>
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            All Locations
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Manage astronomical telescopes, observation gear, mounts, and resort equipment across all partner locations.
        </p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card size="sm" className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="gap-1 px-4 py-3">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Boxes className="size-3.5 text-primary" /> Total Equipment
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {totalQuantity} <span className="text-xs font-normal text-muted-foreground">across resorts</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm" className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="gap-1 px-4 py-3">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="size-3.5 text-emerald-500" /> Operational
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-emerald-500">
              {goodCount} <span className="text-xs font-normal text-muted-foreground">good condition</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm" className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="gap-1 px-4 py-3">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Wrench className="size-3.5 text-amber-500" /> Maintenance
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-amber-500">
              {maintenanceCount} <span className="text-xs font-normal text-muted-foreground">repair / service</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl">Resort Asset Records</CardTitle>
            <CardDescription>
              Inventory assets synchronized across partner resorts and updated by guides and admins.
            </CardDescription>
          </div>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-8 w-full md:w-56">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-8 text-base md:text-xs"
                placeholder="Search equipment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-4" /> Add equipment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleCreateItem}>
                  <DialogHeader>
                    <DialogTitle>Add Equipment to Resort Inventory</DialogTitle>
                    <DialogDescription>
                      Assign an astronomical instrument or gear to a resort location.
                    </DialogDescription>
                  </DialogHeader>
                  <FieldGroup className="grid gap-4 py-4 md:grid-cols-2">
                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor="admin-inv-resort">Resort Location *</FieldLabel>
                      <Select value={resortId} onValueChange={(val) => val && setResortId(val)}>
                        <SelectTrigger id="admin-inv-resort" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {resorts.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name} ({r.code})
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor="admin-inv-name">Equipment Name *</FieldLabel>
                      <Input
                        id="admin-inv-name"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="e.g. Celestron NexStar 8SE Telescope"
                        required
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="admin-inv-category">Category</FieldLabel>
                      <Select value={category} onValueChange={(val) => val && setCategory(val)}>
                        <SelectTrigger id="admin-inv-category" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="admin-inv-qty">Quantity & Unit</FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          id="admin-inv-qty"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-20"
                          required
                        />
                        <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs, units, pairs" />
                      </div>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="admin-inv-condition">Condition</FieldLabel>
                      <Select value={condition} onValueChange={(val) => val && setCondition(val)}>
                        <SelectTrigger id="admin-inv-condition" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="good">Good (Fully functional)</SelectItem>
                            <SelectItem value="fair">Fair (Minor wear)</SelectItem>
                            <SelectItem value="needs_repair">Needs Repair</SelectItem>
                            <SelectItem value="broken">Broken / Out of order</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="admin-inv-status">Status</FieldLabel>
                      <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                        <SelectTrigger id="admin-inv-status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="available">Available in Resort</SelectItem>
                            <SelectItem value="in_use">In Use / Deployed</SelectItem>
                            <SelectItem value="maintenance">Under Maintenance</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor="admin-inv-loc">Storage Location</FieldLabel>
                      <Input
                        id="admin-inv-loc"
                        value={locationDetails}
                        onChange={(e) => setLocationDetails(e.target.value)}
                        placeholder="e.g. Observatory Deck Cabinet / Storage Room A"
                      />
                    </Field>

                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor="admin-inv-notes">Notes</FieldLabel>
                      <Textarea
                        id="admin-inv-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Serial number, accessories included, calibration date..."
                      />
                    </Field>
                  </FieldGroup>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addPending || !itemName.trim()}>
                      {addPending ? <Spinner data-icon="inline-start" /> : <PackagePlus data-icon="inline-start" />}
                      {addPending ? "Adding..." : "Add to inventory"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardAction>
        </CardHeader>

        {/* Filter bar: Resort selector & Category tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Category:</span>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "secondary" : "ghost"}
                size="xs"
                className="text-xs h-7"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Resort:</span>
            <Select value={selectedResort} onValueChange={(val) => val && setSelectedResort(val)}>
              <SelectTrigger className="h-7 text-xs w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="All">All Resorts</SelectItem>
                  {resorts.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Items Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Equipment Name</th>
                  <th className="px-4 py-3 font-medium">Resort</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 font-medium">Condition</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Storage Location</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No inventory items found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div>{item.item_name}</div>
                        {item.notes && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">{item.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="size-3 text-muted-foreground" />
                          <span>{item.resort_name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold">
                        {item.quantity} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={getConditionBadgeStyle(item.condition)}>
                          {getConditionLabel(item.condition)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={getStatusBadgeStyle(item.status)}>
                          {getStatusLabel(item.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{item.location_details || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              setEditingItem(item);
                              setEditOpen(true);
                            }}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-rose-400 hover:text-rose-300"
                            onClick={() => handleDeleteItem(item)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Item Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          {editingItem && (
            <form onSubmit={handleUpdateItem}>
              <DialogHeader>
                <DialogTitle>Edit Equipment Details</DialogTitle>
                <DialogDescription>Update quantity, condition, or storage location.</DialogDescription>
              </DialogHeader>
              <FieldGroup className="grid gap-4 py-4 md:grid-cols-2">
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="edit-admin-inv-name">Equipment Name *</FieldLabel>
                  <Input
                    id="edit-admin-inv-name"
                    value={editingItem.item_name}
                    onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-admin-inv-category">Category</FieldLabel>
                  <Select
                    value={editingItem.category}
                    onValueChange={(val) => val && setEditingItem({ ...editingItem, category: val })}
                  >
                    <SelectTrigger id="edit-admin-inv-category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-admin-inv-qty">Quantity</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id="edit-admin-inv-qty"
                      type="number"
                      min="0"
                      value={editingItem.quantity}
                      onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value, 10) || 0 })}
                      className="w-20"
                      required
                    />
                    <Input
                      value={editingItem.unit}
                      onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                      placeholder="pcs, units, pairs"
                    />
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-admin-inv-condition">Condition</FieldLabel>
                  <Select
                    value={editingItem.condition}
                    onValueChange={(val) => val && setEditingItem({ ...editingItem, condition: val })}
                  >
                    <SelectTrigger id="edit-admin-inv-condition" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="good">Good (Fully functional)</SelectItem>
                        <SelectItem value="fair">Fair (Minor wear)</SelectItem>
                        <SelectItem value="needs_repair">Needs Repair</SelectItem>
                        <SelectItem value="broken">Broken / Out of order</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-admin-inv-status">Status</FieldLabel>
                  <Select
                    value={editingItem.status}
                    onValueChange={(val) => val && setEditingItem({ ...editingItem, status: val })}
                  >
                    <SelectTrigger id="edit-admin-inv-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="in_use">In Use</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="edit-admin-inv-loc">Storage Location</FieldLabel>
                  <Input
                    id="edit-admin-inv-loc"
                    value={editingItem.location_details || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, location_details: e.target.value })}
                    placeholder="e.g. Observatory Deck Cabinet"
                  />
                </Field>

                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="edit-admin-inv-notes">Notes</FieldLabel>
                  <Textarea
                    id="edit-admin-inv-notes"
                    value={editingItem.notes || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                    placeholder="Maintenance history, serial number..."
                  />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editPending || !editingItem.item_name.trim()}>
                  {editPending ? <Spinner data-icon="inline-start" /> : null}
                  {editPending ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
