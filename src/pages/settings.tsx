import { useRef } from "react"
import { Download, Upload, Trash2, Info, Moon, DatabaseBackup } from "lucide-react"
import { PageHeader } from "@/components/layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/store/store"
import { useTheme } from "@/components/theme-provider"
import { currencyOptions } from "@/lib/format"
import { toast } from "sonner"

export function SettingsPage() {
  const { settings, dispatch, exportJSON, importJSON, resetAll } = useStore()
  const { theme, setTheme } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)

  const download = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `conta-certa-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Backup exportado")
  }

  const onImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (importJSON(String(reader.result))) toast.success("Dados importados")
      else toast.error("Arquivo inválido")
    }
    reader.readAsText(file)
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
              subtitle="Baixe tudo como um arquivo .json"
              onClick={download}
            />
            <DataRow
              icon={<Upload className="size-5 text-primary" />}
              title="Importar dados"
              subtitle="Restaure a partir de um backup"
              onClick={() => fileRef.current?.click()}
            />
            <DataRow
              icon={<Trash2 className="size-5 text-error" />}
              title="Limpar todos os dados"
              subtitle="Restaura o app para o estado inicial"
              danger
              onClick={() => {
                if (confirm("Isso apaga todos os eventos e restaura os dados de exemplo. Continuar?")) {
                  resetAll()
                  toast.success("Dados restaurados")
                }
              }}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportFile(f)
              e.target.value = ""
            }}
          />
        </Card>
      </div>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-start gap-3">
          <DatabaseBackup className="size-6 text-primary" />
          <div>
            <p className="font-semibold">Backup manual em JSON</p>
            <p className="text-sm text-on-surface-variant">
              Tire um instantâneo dos eventos e do histórico de acertos. Recomendado antes de limpar o cache do navegador.
            </p>
          </div>
        </div>
        <Button onClick={download}>
          <DatabaseBackup className="size-4" /> Fazer backup agora
        </Button>
      </Card>

      <Card className="mt-6 flex items-start gap-3 bg-surface-container p-6">
        <Info className="size-5 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-primary">Nota de privacidade</p>
          <p className="text-sm text-on-surface-variant">
            O Conta Certa é um app 100% local. Nenhum dado é enviado a servidores — suas informações
            financeiras ficam apenas neste dispositivo. Exporte seus dados regularmente para não perder
            informações ao limpar o cache do navegador.
          </p>
        </div>
      </Card>
    </div>
  )
}

function DataRow({
  icon,
  title,
  subtitle,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-surface-container"
    >
      {icon}
      <div className="flex-1">
        <p className={danger ? "font-semibold text-error" : "font-semibold"}>{title}</p>
        <p className="text-xs text-on-surface-variant">{subtitle}</p>
      </div>
    </button>
  )
}
