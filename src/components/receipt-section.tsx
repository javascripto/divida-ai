import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type DragEvent,
} from "react"
import { FileText, ImageIcon, Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { cn } from "@/lib/utils"
import { getReceiptsByExpense, type ReceiptRecord } from "@/lib/receipt-db"

export type ReceiptChanges = {
  keepIds: string[]
  newFiles: File[]
  deletedIds: Set<string>
}

export type ReceiptSectionHandle = {
  getChanges: () => ReceiptChanges
}

interface Props {
  expenseId?: string
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]
const MAX_MB = 10

export const ReceiptSection = forwardRef<ReceiptSectionHandle, Props>(function ReceiptSection(
  { expenseId },
  ref,
) {
  const [existing, setExisting] = useState<ReceiptRecord[]>([])
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!expenseId) return
    getReceiptsByExpense(expenseId).then(setExisting)
  }, [expenseId])

  useImperativeHandle(ref, () => ({
    getChanges: () => ({
      keepIds: existing.filter((r) => !deletedIds.has(r.id)).map((r) => r.id),
      newFiles,
      deletedIds,
    }),
  }))

  const addFiles = (files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => {
      if (!ACCEPTED.includes(f.type)) return false
      if (f.size > MAX_MB * 1024 * 1024) return false
      return true
    })
    setNewFiles((prev) => [...prev, ...valid])
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const visibleExisting = existing.filter((r) => !deletedIds.has(r.id))
  const hasAny = visibleExisting.length > 0 || newFiles.length > 0

  return (
    <div className="space-y-3">
      {hasAny && (
        <div className="grid gap-2 sm:grid-cols-2">
          {visibleExisting.map((r) => (
            <ReceiptItem
              key={r.id}
              name={r.fileName}
              mimeType={r.mimeType}
              blob={r.data}
              onRemove={() => setDeletedIds((prev) => new Set([...prev, r.id]))}
            />
          ))}
          {newFiles.map((f, i) => (
            <ReceiptItem
              key={`new-${i}`}
              name={f.name}
              mimeType={f.type}
              blob={f}
              onRemove={() => setNewFiles((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragging
            ? "border-primary bg-primary-fixed/20"
            : "border-outline-variant text-on-surface-variant hover:border-primary/60 hover:bg-surface-container-low",
        )}
      >
        <Paperclip className="size-5" />
        <div>
          <p className="text-sm font-semibold">Adicionar recibo</p>
          <p className="text-xs">Imagens ou PDF · máx. {MAX_MB} MB</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ""
        }}
      />
    </div>
  )
})

// ── ReceiptItem ────────────────────────────────────────────────────────────

function ReceiptItem({
  name,
  mimeType,
  blob,
  onRemove,
}: {
  name: string
  mimeType: string
  blob: Blob
  onRemove: () => void
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isImage = mimeType.startsWith("image/")
  const isPdf = mimeType === "application/pdf"

  useEffect(() => {
    const url = URL.createObjectURL(blob)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  return (
    <>
      <div className="group flex items-center gap-3 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low p-3">
        {/* Thumbnail — clickable to open viewer */}
        <button
          type="button"
          aria-label={`Visualizar ${name}`}
          onClick={() => setViewerOpen(true)}
          className="shrink-0 rounded transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isImage && objectUrl ? (
            <img
              src={objectUrl}
              alt={name}
              className="size-12 rounded object-cover"
            />
          ) : (
            <span className="flex size-12 items-center justify-center rounded bg-surface-container text-on-surface-variant">
              {isPdf ? <FileText className="size-6" /> : <ImageIcon className="size-6" />}
            </span>
          )}
        </button>

        {/* Filename — clickable to open viewer */}
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="min-w-0 flex-1 text-left text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="block truncate">{name}</span>
        </button>

        {/* Remove — opens confirmation */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 shrink-0 text-error opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
          onClick={() => setConfirmOpen(true)}
          aria-label="Remover recibo"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Viewer dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className={isPdf ? "max-w-4xl" : "max-w-2xl"}>
          <DialogHeader>
            <DialogTitle className="truncate pr-6 text-base">{name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden px-6 pb-6">
            {isImage && objectUrl && (
              <img
                src={objectUrl}
                alt={name}
                className="max-h-[70dvh] w-full rounded object-contain"
              />
            )}
            {isPdf && objectUrl && (
              <iframe
                src={objectUrl}
                title={name}
                className="h-[70dvh] w-full rounded border-0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Removal confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remover recibo?"
        description={`"${name}" será removido ao salvar a despesa.`}
        confirmLabel="Remover"
        destructive
        onConfirm={onRemove}
      />
    </>
  )
}

// ── ReceiptBadge ────────────────────────────────────────────────────────────

export function ReceiptBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span
      title={`${count} recibo${count > 1 ? "s" : ""}`}
      className="inline-flex items-center gap-1 text-xs text-on-surface-variant"
    >
      <Paperclip className="size-3" />
      {count}
    </span>
  )
}
