import { useRef, useState } from "react"
import { Download, Upload, Trash2, Info, Moon, FileArchive, FileJson, Paperclip } from "lucide-react"
import { PageHeader } from "@/components/layout"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useStore } from "@/store/store"
import { useTheme } from "@/components/theme-provider"
import { currencyOptions } from "@/lib/format"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  getAllReceipts,
  clearAllReceipts,
  putReceipt,
  blobToBase64,
  base64ToBlob,
} from "@/lib/receipt-db"
import JSZip from "jszip"

type ExportMode = "json" | "zip" | "base64"

export function SettingsPage() {
  const { settings, dispatch, exportJSON, importJSON, resetAll } = useStore()
  const { theme, setTheme } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [exportDialog, setExportDialog] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  // ── Export ──────────────────────────────────────────────────────────────

  const doExport = async (mode: ExportMode) => {
    setExporting(true)
    const dateStr = new Date().toISOString().slice(0, 10)
    try {
      if (mode === "json") {
        download(
          new Blob([exportJSON()], { type: "application/json" }),
          `divida-ai-backup-${dateStr}.json`,
        )
        toast.success("Backup exportado (sem recibos)")
      } else if (mode === "base64") {
        const receipts = await getAllReceipts()
        const b64Receipts = await Promise.all(
          receipts.map(async (r) => ({
            id: r.id,
            expenseId: r.expenseId,
            fileName: r.fileName,
            mimeType: r.mimeType,
            size: r.size,
            data: await blobToBase64(r.data),
          })),
        )
        const payload = { ...JSON.parse(exportJSON()), receipts: b64Receipts }
        download(
          new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
          `divida-ai-backup-${dateStr}.json`,
        )
        toast.success(`Backup exportado com ${receipts.length} recibo(s) em base64`)
      } else {
        // ZIP
        const receipts = await getAllReceipts()
        const zip = new JSZip()
        zip.file("data.json", exportJSON())
        const folder = zip.folder("receipts")!
        for (const r of receipts) {
          const ext = extFromMime(r.mimeType) || extFromName(r.fileName)
          folder.file(`${r.id}${ext ? "." + ext : ""}`, r.data)
        }
        const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" })
        download(blob, `divida-ai-backup-${dateStr}.zip`)
        toast.success(`Backup exportado com ${receipts.length} recibo(s) em ZIP`)
      }
    } catch (err) {
      console.error(err)
      toast.error("Erro ao exportar")
    } finally {
      setExporting(false)
      setExportDialog(false)
    }
  }

  // ── Import ──────────────────────────────────────────────────────────────

  const onImportFile = async (file: File) => {
    setImporting(true)
    try {
      if (file.name.endsWith(".zip")) {
        await importZip(file)
      } else {
        await importJsonFile(file)
      }
    } catch (err) {
      console.error(err)
      toast.error("Erro ao importar arquivo")
    } finally {
      setImporting(false)
    }
  }

  const importJsonFile = async (file: File) => {
    const text = await file.text()
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed.events)) {
      toast.error("Arquivo inválido")
      return
    }
    await clearAllReceipts()
    if (Array.isArray(parsed.receipts)) {
      const b64list = parsed.receipts as Array<{
        id: string; expenseId: string; fileName: string
        mimeType: string; size: number; data: string
      }>
      await Promise.all(
        b64list.map((r) =>
          putReceipt({
            id: r.id,
            expenseId: r.expenseId,
            fileName: r.fileName,
            mimeType: r.mimeType,
            size: r.size,
            data: base64ToBlob(r.data, r.mimeType),
          }),
        ),
      )
      delete parsed.receipts
      if (importJSON(JSON.stringify(parsed)))
        toast.success(`Dados importados com ${b64list.length} recibo(s)`)
      else toast.error("Arquivo inválido")
    } else {
      if (importJSON(text)) toast.success("Dados importados (sem recibos)")
      else toast.error("Arquivo inválido")
    }
  }

  const importZip = async (file: File) => {
    const zip = await JSZip.loadAsync(file)
    const dataFile = zip.file("data.json")
    if (!dataFile) { toast.error("ZIP inválido: data.json não encontrado"); return }

    const json = await dataFile.async("text")
    const parsed = JSON.parse(json)

    // Build receiptId → expenseId from the JSON before touching the DB
    const receiptToExpense = new Map<string, string>()
    if (Array.isArray(parsed.events)) {
      for (const ev of parsed.events) {
        for (const ex of ev.expenses ?? []) {
          for (const rid of ex.receiptIds ?? []) {
            receiptToExpense.set(rid, ex.id)
          }
        }
      }
    }

    await clearAllReceipts()

    // JSZip relativePath inside a folder reference includes the folder prefix —
    // iterate the whole zip and filter by the receipts/ prefix instead.
    const filePromises: Promise<void>[] = []
    zip.forEach((path, entry) => {
      if (!path.startsWith("receipts/") || entry.dir) return
      const fileName = path.slice("receipts/".length) // e.g. "abc123.jpg"
      const id = fileName.replace(/\.[^.]+$/, "")
      const ext = fileName.split(".").pop() ?? ""
      const mimeType = mimeFromExt(ext)
      const expenseId = receiptToExpense.get(id) ?? ""
      filePromises.push(
        entry.async("blob").then((blob) =>
          putReceipt({
            id,
            expenseId,
            fileName,
            mimeType,
            size: blob.size,
            data: new Blob([blob], { type: mimeType }),
          }),
        ),
      )
    })
    await Promise.all(filePromises)

    if (importJSON(json))
      toast.success(`Dados importados com ${filePromises.length} recibo(s)`)
    else toast.error("data.json inválido no ZIP")
  }

  // ── Reset ───────────────────────────────────────────────────────────────

  const handleReset = async () => {
    await clearAllReceipts()
    resetAll()
    toast.success("Dados restaurados")
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Configurações"
        subtitle="Gerencie seus dados e as preferências do app neste dispositivo."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Preferências */}
        <Card className="p-6">
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
            Preferências do app
          </h3>
          <div className="space-y-5">
            <div className="grid gap-1.5">
              <Label>Moeda padrão</Label>
              <p className="text-xs text-on-surface-variant">Usada em novos eventos.</p>
              <Select
                value={settings.defaultCurrency}
                onValueChange={(v) => dispatch({ type: "UPDATE_SETTINGS", patch: { defaultCurrency: v } })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-2">
                <Moon className="size-4" /> Modo escuro
              </Label>
              <p className="text-xs text-on-surface-variant">Alterne entre tema claro e escuro.</p>
              <Tabs value={theme} onValueChange={(v) => setTheme(v as typeof theme)} className="mt-1">
                <TabsList>
                  <TabsTrigger value="light">Claro</TabsTrigger>
                  <TabsTrigger value="dark">Escuro</TabsTrigger>
                  <TabsTrigger value="system">Sistema</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </Card>

        {/* Gestão de dados */}
        <Card className="p-6">
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
            Gerenciamento de dados
          </h3>
          <div className="space-y-2">
            <DataRow
              icon={<Download className="size-5 text-secondary" />}
              title="Exportar dados"
              subtitle="Baixe tudo como JSON ou ZIP com recibos"
              onClick={() => setExportDialog(true)}
            />
            <DataRow
              icon={<Upload className="size-5 text-primary" />}
              title="Importar dados"
              subtitle="Restaure a partir de um backup (.json ou .zip)"
              onClick={() => fileRef.current?.click()}
              loading={importing}
            />
            <DataRow
              icon={<Trash2 className="size-5 text-error" />}
              title="Limpar todos os dados"
              subtitle="Restaura o app para o estado inicial"
              danger
              onClick={() => setConfirmReset(true)}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json,.zip,application/zip,application/x-zip-compressed"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportFile(f)
              e.target.value = ""
            }}
          />
        </Card>
      </div>

      <Card className="mt-6 flex items-start gap-3 bg-surface-container p-6">
        <Info className="size-5 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-primary">Nota de privacidade</p>
          <p className="text-sm text-on-surface-variant">
            O Divida aí é um app 100% local. Nenhum dado é enviado a servidores — suas informações
            financeiras ficam apenas neste dispositivo. Exporte seus dados regularmente para não perder
            informações ao limpar o cache do navegador.
          </p>
        </div>
      </Card>

      {/* Export dialog */}
      <Dialog open={exportDialog} onOpenChange={setExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar dados</DialogTitle>
            <DialogDescription>
              Escolha o formato de exportação. Os recibos ficam armazenados localmente no navegador e
              precisam ser incluídos manualmente no backup se quiser preservá-los.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 px-6 pb-2">
            <ExportOption
              icon={<FileJson className="size-5 text-secondary" />}
              title="Só dados (sem recibos)"
              subtitle="Arquivo .json leve, sem os recibos anexados"
              disabled={exporting}
              onClick={() => doExport("json")}
            />
            <ExportOption
              icon={<FileArchive className="size-5 text-primary" />}
              title="ZIP com recibos"
              subtitle="data.json + pasta receipts/ compactados — recomendado"
              disabled={exporting}
              onClick={() => doExport("zip")}
            />
            <ExportOption
              icon={<Paperclip className="size-5 text-tertiary" />}
              title="JSON com recibos (base64)"
              subtitle="Tudo em um único .json — arquivo maior"
              disabled={exporting}
              onClick={() => doExport("base64")}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExportDialog(false)} disabled={exporting}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Limpar todos os dados?"
        description="Isso apaga todos os eventos, recibos e restaura os dados de exemplo. Esta ação não pode ser desfeita."
        confirmLabel="Limpar"
        destructive
        onConfirm={handleReset}
      />
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  }
  return map[mime] ?? ""
}

function extFromName(name: string): string {
  return name.split(".").pop() ?? ""
}

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    pdf: "application/pdf",
  }
  return map[ext.toLowerCase()] ?? "application/octet-stream"
}

// ── Sub-components ───────────────────────────────────────────────────────────

function DataRow({
  icon,
  title,
  subtitle,
  onClick,
  danger,
  loading,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
  danger?: boolean
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-surface-container disabled:opacity-50"
    >
      {icon}
      <div className="flex-1">
        <p className={danger ? "font-semibold text-error" : "font-semibold"}>{title}</p>
        <p className="text-xs text-on-surface-variant">{subtitle}</p>
      </div>
    </button>
  )
}

function ExportOption({
  icon,
  title,
  subtitle,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl border border-outline-variant p-4 text-left transition-colors hover:bg-surface-container-low disabled:opacity-50"
    >
      {icon}
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-on-surface-variant">{subtitle}</p>
      </div>
    </button>
  )
}
