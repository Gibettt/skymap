"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Boxes, CheckCircle2, Edit2, PackagePlus, Plus, Search, Trash2, Wrench } from "lucide-react";
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

import type { InventoryItem } from "../page";
import type { StaffRole } from "../../_lib/staff-api";

interface InventoryManagerProps {
  role: StaffRole;
  user?: { id?: string; name?: string; resort_name?: string | null; resort_id?: string | null };
  initialItems: InventoryItem[];
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
export function InventoryManager({ role, user, initialItems }: InventoryManagerProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<InventoryItem[]>(initialItems);
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All");

  // Add Item Modal State
  const [addOpen, setAddOpen] = React.useState(false);
  const [addPending, setAddPending] = React.useState(false);
  const [itemName, setItemName] = React.useState("");
  const [category, setCategory] = React.useState("Optical Equipment");
  const [quantity, setQuantity] = React.useState("1");
  const [unit, setUnit] = React.useState("units");
  const [condition, setCondition] = React.useState("good");
  const [status, setStatus] = React.useState("available");
  const [locationDetails, setLocationDetails] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Edit Item Modal State
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);
  const [editPending, setEditPending] = React.useState(false);

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      !search ||
      item.item_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.location_details && item.location_details.toLowerCase().includes(search.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const totalQuantity = items.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);
  const goodCount = items.filter((item) => item.condition === "good").length;
  const maintenanceCount = items.filter(
    (item) => item.condition === "needs_repair" || item.condition === "broken" || item.status === "maintenance",
  ).length;

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;

    setAddPending(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

      toast.success(`Item "${itemName}" berhasil ditambahkan ke inventory`);
      setItems((prev) => [data.item, ...prev]);
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

  async function handleDeleteItem(item: InventoryItem) {
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
          <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
            {user?.resort_name || "Location Inventory"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Keep track of optical telescopes, eyepieces, mounts, lasers, and resort observation assets.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card size="sm" className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="gap-1 px-4 py-3">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Boxes className="size-3.5 text-cyan-400" /> Total Items
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {totalQuantity} <span className="text-xs font-normal text-muted-foreground">in stock</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm" className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="gap-1 px-4 py-3">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="size-3.5 text-emerald-400" /> Good Condition
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-emerald-400">
              {goodCount} <span className="text-xs font-normal text-muted-foreground">ready for stargazing</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm" className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="gap-1 px-4 py-3">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Wrench className="size-3.5 text-amber-400" /> Maintenance / Repair
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-amber-400">
              {maintenanceCount} <span className="text-xs font-normal text-muted-foreground">needs attention</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl">Equipment & Asset Records</CardTitle>
            <CardDescription>Inventory records updated by internal resort staff and administrators.</CardDescription>
          </div>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-8 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-8 text-xs"
                placeholder="Search equipment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground gap-1.5">
                  <Plus className="size-4" /> Add equipment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleCreateItem}>
                  <DialogHeader>
                    <DialogTitle>Add Equipment to Inventory</DialogTitle>
                    <DialogDescription>
                      Record a new astronomical instrument or accessory for this resort.
                    </DialogDescription>
                  </DialogHeader>
                  <FieldGroup className="grid gap-4 py-4 md:grid-cols-2">
                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor="inv-name">Item Name *</FieldLabel>
                      <Input
                        id="inv-name"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="e.g. Celestron NexStar 8SE Telescope"
                        required
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="inv-category">Category</FieldLabel>
                      <Select value={category} onValueChange={(val) => val && setCategory(val)}>
                        <SelectTrigger id="inv-category" className="w-full">
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
                      <FieldLabel htmlFor="inv-qty">Quantity & Unit</FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          id="inv-qty"
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
                      <FieldLabel htmlFor="inv-condition">Condition</FieldLabel>
                      <Select value={condition} onValueChange={(val) => val && setCondition(val)}>
                        <SelectTrigger id="inv-condition" className="w-full">
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
                      <FieldLabel htmlFor="inv-status">Status</FieldLabel>
                      <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                        <SelectTrigger id="inv-status" className="w-full">
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
                      <FieldLabel htmlFor="inv-loc">Storage Location</FieldLabel>
                      <Input
                        id="inv-loc"
                        value={locationDetails}
                        onChange={(e) => setLocationDetails(e.target.value)}
                        placeholder="e.g. Observatory Deck Cabinet / Storage Room A"
                      />
                    </Field>

                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor="inv-notes">Notes</FieldLabel>
                      <Textarea
                        id="inv-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Maintenance history, serial number, calibration details..."
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

        {/* Category filter tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
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

        {/* Items Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Equipment Name</th>
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
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
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
                <DialogDescription>Update quantity, condition, or storage notes.</DialogDescription>
              </DialogHeader>
              <FieldGroup className="grid gap-4 py-4 md:grid-cols-2">
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="edit-inv-name">Item Name *</FieldLabel>
                  <Input
                    id="edit-inv-name"
                    value={editingItem.item_name}
                    onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-inv-category">Category</FieldLabel>
                  <Select
                    value={editingItem.category}
                    onValueChange={(val) => val && setEditingItem({ ...editingItem, category: val })}
                  >
                    <SelectTrigger id="edit-inv-category" className="w-full">
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
                  <FieldLabel htmlFor="edit-inv-qty">Quantity</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id="edit-inv-qty"
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
                  <FieldLabel htmlFor="edit-inv-condition">Condition</FieldLabel>
                  <Select
                    value={editingItem.condition}
                    onValueChange={(val) => val && setEditingItem({ ...editingItem, condition: val })}
                  >
                    <SelectTrigger id="edit-inv-condition" className="w-full">
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
                  <FieldLabel htmlFor="edit-inv-status">Status</FieldLabel>
                  <Select
                    value={editingItem.status}
                    onValueChange={(val) => val && setEditingItem({ ...editingItem, status: val })}
                  >
                    <SelectTrigger id="edit-inv-status" className="w-full">
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
                  <FieldLabel htmlFor="edit-inv-loc">Storage Location</FieldLabel>
                  <Input
                    id="edit-inv-loc"
                    value={editingItem.location_details || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, location_details: e.target.value })}
                    placeholder="e.g. Observatory Deck Cabinet"
                  />
                </Field>

                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="edit-inv-notes">Notes</FieldLabel>
                  <Textarea
                    id="edit-inv-notes"
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
