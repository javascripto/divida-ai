import { test, expect, type Page } from "@playwright/test"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES   = path.join(__dirname, "fixtures")
const SHOTS_DIR  = path.join(__dirname, "screenshots")

// ── helpers ───────────────────────────────────────────────────────────────────

/** Tira screenshot nomeado e salva em e2e/screenshots/. */
async function shot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SHOTS_DIR, `${name}.png`),
    fullPage: true,
  })
}

async function clearState(page: Page) {
  await page.evaluate(async () => {
    localStorage.clear()
    await new Promise<void>((res) => {
      const req = indexedDB.deleteDatabase("divida-ai-receipts")
      req.onsuccess = req.onerror = () => res()
    })
  })
  await page.reload()
  await page.waitForURL("/")
}

async function createEvent(page: Page, name: string, type: string): Promise<string> {
  await page.getByRole("button", { name: /Criar evento/i }).first().click()
  await page.getByLabel("Nome do evento").fill(name)
  await page.getByRole("dialog").getByRole("button", { name: type, exact: true }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click()
  await page.waitForURL(/\/event\//)
  return page.url().match(/\/event\/([^/?#]+)/)?.[1] ?? ""
}

async function addParticipant(page: Page, name: string) {
  await page.getByRole("button", { name: /Adicionar participante/i }).click()
  await page.getByRole("dialog").getByLabel("Nome").fill(name)
  await page.getByRole("dialog").getByRole("button", { name: "Adicionar" }).click()
  await page.getByRole("dialog").waitFor({ state: "hidden" })
}

// ── DESKTOP ───────────────────────────────────────────────────────────────────

test.describe("Desktop — Jornada completa", () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test("fluxo completo", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])

    let event1Id = ""
    let event2Id = ""
    let exportedJsonPath = ""

    await page.goto("/")
    await clearState(page)
    await expect(page.getByText("Nenhum evento ainda.")).toBeVisible()
    await shot(page, "desktop-01-estado-inicial")

    // ── 1. Criar Evento 1 ────────────────────────────────────────────────────
    await test.step("Criar Evento 1: Viagem ao Rio", async () => {
      await page.getByRole("button", { name: /Criar evento/i }).first().click()
      await page.getByLabel("Nome do evento").fill("Viagem ao Rio")
      await page.getByRole("dialog").getByRole("button", { name: "Viagem", exact: true }).click()
      await expect(page.getByRole("button", { name: "Viagem", exact: true })).toHaveAttribute("aria-pressed", "true")
      await shot(page, "desktop-02-form-evento1")
      await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click()
      await page.waitForURL(/\/event\//)
      event1Id = page.url().match(/\/event\/([^/?#]+)/)?.[1] ?? ""
      await expect(page.getByText("Viagem ao Rio")).toBeVisible()
      await shot(page, "desktop-03-dashboard-evento1")
    })

    // ── 2. Participantes ─────────────────────────────────────────────────────
    await test.step("Adicionar 3 participantes ao Evento 1", async () => {
      await page.goto(`/event/${event1Id}/participants`)
      for (const nome of ["Alice", "Bruno", "Carlos"]) {
        await addParticipant(page, nome)
        await expect(page.getByText(nome).first()).toBeVisible()
      }
      await shot(page, "desktop-04-participantes-evento1")
    })

    // ── 3. Despesa Hotel + recibo JPEG ───────────────────────────────────────
    await test.step("Despesa Hotel com recibo imagem", async () => {
      await page.goto(`/event/${event1Id}/expenses/new`)
      await page.getByLabel("Descrição").fill("Hotel")
      await page.getByLabel(/Valor/).fill("300")

      await page.locator('input[type="file"][accept*="image/jpeg"]')
        .setInputFiles(path.join(FIXTURES, "receipt.jpg"))
      await expect(page.getByText("receipt.jpg")).toBeVisible()
      await shot(page, "desktop-05-form-despesa-hotel-recibo")

      await page.getByRole("button", { name: /Salvar despesa/i }).click()
      await page.waitForURL(/\/expenses$/)
      await expect(page.getByText("Hotel")).toBeVisible()
      await shot(page, "desktop-06-lista-despesas-hotel")
    })

    // ── 4. Despesa Jantar + recibo PDF ───────────────────────────────────────
    await test.step("Despesa Jantar com recibo PDF", async () => {
      await page.goto(`/event/${event1Id}/expenses/new`)
      await page.getByLabel("Descrição").fill("Jantar")
      await page.getByLabel(/Valor/).fill("120")

      await page.locator('input[type="file"][accept*="image/jpeg"]')
        .setInputFiles(path.join(FIXTURES, "receipt.pdf"))
      await expect(page.getByText("receipt.pdf")).toBeVisible()
      await shot(page, "desktop-07-form-despesa-jantar-pdf")

      await page.getByRole("button", { name: /Salvar despesa/i }).click()
      await page.waitForURL(/\/expenses$/)
      await shot(page, "desktop-08-lista-despesas-jantar")
    })

    // ── 5. Despesa Transporte ─────────────────────────────────────────────────
    await test.step("Despesa Transporte (sem recibo)", async () => {
      await page.goto(`/event/${event1Id}/expenses/new`)
      await page.getByLabel("Descrição").fill("Transporte")
      await page.getByLabel(/Valor/).fill("60")
      await page.getByRole("button", { name: /Salvar despesa/i }).click()
      await page.waitForURL(/\/expenses$/)
      await expect(page.getByText("Transporte")).toBeVisible()
      await shot(page, "desktop-09-lista-3-despesas")
    })

    // ── 6. Acertos: ver, copiar ───────────────────────────────────────────────
    await test.step("Ver acertos e copiar texto", async () => {
      await page.goto(`/event/${event1Id}/settlements`)
      await expect(page.getByText("Não há nada a acertar")).not.toBeVisible()
      await shot(page, "desktop-10-acertos-pendentes")

      await page.getByRole("button", { name: /Copiar detalhes/i }).click()
      await expect(page.getByText(/Detalhes copiados/i)).toBeVisible({ timeout: 4_000 })
      const clip = await page.evaluate(() => navigator.clipboard.readText())
      expect(clip).toContain("Viagem ao Rio")
      expect(clip).toContain("Hotel")
      await shot(page, "desktop-11-acertos-copiados")
    })

    // ── 7. Marcar pago e reverter ─────────────────────────────────────────────
    await test.step("Marcar acerto como pago e reverter", async () => {
      await page.goto(`/event/${event1Id}/settlements`)

      await page.getByRole("button", { name: "Marcar como pago" }).first().click()
      await expect(page.getByText("Pago").first()).toBeVisible()
      await shot(page, "desktop-12-acerto-pago")

      await page.getByRole("button", { name: /Reverter/i }).first().click()
      await expect(page.getByText("Pendente").first()).toBeVisible()
      await shot(page, "desktop-13-acerto-revertido")
    })

    // ── 8. Editar Evento 1 ────────────────────────────────────────────────────
    await test.step("Editar nome e tipo do Evento 1", async () => {
      await page.goto("/")
      await page.getByRole("button", { name: /^Editar$/i }).first().click()
      const nameInput = page.getByRole("dialog").getByLabel("Nome do evento")
      await nameInput.clear()
      await nameInput.fill("Viagem ao Rio 2024")
      await page.getByRole("dialog").getByRole("button", { name: "Festa", exact: true }).click()
      await shot(page, "desktop-14-form-edicao-evento")
      await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click()
      await expect(page.getByText("Viagem ao Rio 2024")).toBeVisible()
      await expect(page.getByLabel("Tipo: Festa")).toBeVisible()
      await shot(page, "desktop-15-evento-renomeado")
    })

    // ── 9. Editar despesa ─────────────────────────────────────────────────────
    await test.step("Editar valor da despesa Hotel", async () => {
      await page.goto(`/event/${event1Id}/expenses`)
      // Ordem: [Transporte(0), Jantar(1), Hotel(2)]
      await page.getByRole("button", { name: "Editar despesa" }).nth(2).click({ force: true })
      await page.waitForURL(/\/edit/)
      const amountInput = page.getByLabel(/Valor/)
      await amountInput.clear()
      await amountInput.fill("350")
      await shot(page, "desktop-16-edicao-despesa-hotel")
      await page.getByRole("button", { name: /Salvar despesa/i }).click()
      await page.waitForURL(/\/expenses$/)
      await expect(page.getByText("R$ 350,00")).toBeVisible()
      await shot(page, "desktop-17-despesa-hotel-atualizada")
    })

    // ── 10. Excluir Transporte ────────────────────────────────────────────────
    await test.step("Excluir despesa Transporte", async () => {
      await page.goto(`/event/${event1Id}/expenses`)
      await page.getByRole("button", { name: "Excluir despesa" }).first().click({ force: true })
      await expect(page.getByText("Transporte")).not.toBeVisible({ timeout: 4_000 })
      await shot(page, "desktop-18-transporte-excluido")
    })

    // ── 11. Criar Evento 2 ────────────────────────────────────────────────────
    await test.step("Criar Evento 2: Churrasco do Pedro", async () => {
      await page.goto("/")
      event2Id = await createEvent(page, "Churrasco do Pedro", "Churrasco")
      await shot(page, "desktop-19-dashboard-evento2")
    })

    // ── 12. 5 participantes no Evento 2 ──────────────────────────────────────
    await test.step("Adicionar 5 participantes ao Evento 2", async () => {
      await page.goto(`/event/${event2Id}/participants`)
      for (const nome of ["Pedro", "Ana", "Marcos", "Julia", "Rafael"]) {
        await addParticipant(page, nome)
      }
      await expect(page.getByText("Pedro", { exact: true }).first()).toBeVisible()
      await expect(page.getByText("Rafael", { exact: true })).toBeVisible()
      await shot(page, "desktop-20-participantes-evento2")
    })

    // ── 13. 3 despesas no Evento 2 ───────────────────────────────────────────
    await test.step("Adicionar 3 despesas ao Evento 2", async () => {
      for (const [desc, valor] of [
        ["Carne", "200"],
        ["Bebidas", "80"],
        ["Carvão", "30"],
      ]) {
        await page.goto(`/event/${event2Id}/expenses/new`)
        await page.getByLabel("Descrição").fill(desc)
        await page.getByLabel(/Valor/).fill(valor)
        await page.getByRole("button", { name: /Salvar despesa/i }).click()
        await page.waitForURL(/\/expenses$/)
        await expect(page.getByText(desc)).toBeVisible()
      }
      await shot(page, "desktop-21-despesas-evento2")
    })

    // ── 14. Quitar todos os acertos do Evento 2 ───────────────────────────────
    await test.step("Quitar todos os acertos do Evento 2", async () => {
      await page.goto(`/event/${event2Id}/settlements`)
      const count = await page.getByRole("button", { name: "Marcar como pago" }).count()
      expect(count).toBeGreaterThan(0)
      for (let i = 0; i < count; i++) {
        await page.getByRole("button", { name: "Marcar como pago" }).first().click()
        await page.waitForTimeout(200)
      }
      await expect(page.getByText("Tudo certo! Todos os pagamentos foram quitados.")).toBeVisible()
      await shot(page, "desktop-22-evento2-quitado")
    })

    // ── 15. Alternar entre eventos ────────────────────────────────────────────
    await test.step("Alternar entre os dois eventos", async () => {
      await page.goto("/")
      await expect(page.getByText("Viagem ao Rio 2024")).toBeVisible()
      await expect(page.getByText("Churrasco do Pedro")).toBeVisible()
      await expect(page.getByLabel("Tipo: Festa")).toBeVisible()
      await expect(page.getByLabel("Tipo: Churrasco")).toBeVisible()
      await shot(page, "desktop-23-lista-dois-eventos")

      await page.locator("button", { hasText: /Abrir/ }).nth(0).click()
      await expect(page).toHaveURL(new RegExp(`/event/${event2Id}`))
      await shot(page, "desktop-24-evento2-aberto")

      await page.goto("/")
      await page.locator("button", { hasText: /Abrir/ }).nth(1).click()
      await expect(page).toHaveURL(new RegExp(`/event/${event1Id}`))
      await shot(page, "desktop-25-evento1-aberto")
    })

    // ── 16. Tema: Escuro → Claro → Sistema ───────────────────────────────────
    await test.step("Alternar tema: Escuro → Claro → Sistema", async () => {
      await page.goto("/settings")
      await shot(page, "desktop-26-settings")

      await page.getByRole("tab", { name: "Escuro" }).click()
      await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 2_000 })
      await shot(page, "desktop-27-tema-escuro")

      await page.getByRole("tab", { name: "Claro" }).click()
      await expect(page.locator("html")).toHaveClass(/light/, { timeout: 2_000 })
      await shot(page, "desktop-28-tema-claro")

      await page.getByRole("tab", { name: "Sistema" }).click()
      await expect(page.getByRole("tab", { name: "Sistema" })).toHaveAttribute("data-state", "active")
      await shot(page, "desktop-29-tema-sistema")
    })

    // ── 17. Exportar JSON ─────────────────────────────────────────────────────
    await test.step("Exportar dados como JSON", async () => {
      await page.goto("/settings")
      await page.getByText("Exportar dados").click()
      await expect(page.getByRole("dialog")).toBeVisible()
      await shot(page, "desktop-30-dialog-exportar")

      const downloadPromise = page.waitForEvent("download")
      await page.getByText("Só dados (sem recibos)").click()
      const download = await downloadPromise

      exportedJsonPath = path.join(os.tmpdir(), download.suggestedFilename())
      await download.saveAs(exportedJsonPath)
      expect(exportedJsonPath).toBeTruthy()
    })

    // ── 18. Limpar dados ──────────────────────────────────────────────────────
    await test.step("Limpar todos os dados", async () => {
      await page.goto("/settings")
      await page.getByText("Limpar todos os dados").click()
      await expect(page.getByRole("dialog")).toBeVisible()
      await shot(page, "desktop-31-confirmar-limpar")
      await page.getByRole("dialog").getByRole("button", { name: "Limpar" }).click()
      await expect(page.getByText(/Dados restaurados/i)).toBeVisible({ timeout: 4_000 })

      await page.goto("/")
      await expect(page.getByText("Nenhum evento ainda.")).toBeVisible()
      await shot(page, "desktop-32-dados-limpos")
    })

    // ── 19. Importar dados ────────────────────────────────────────────────────
    await test.step("Importar dados do JSON exportado", async () => {
      await page.goto("/settings")

      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByText("Importar dados").click(),
      ])
      await fileChooser.setFiles(exportedJsonPath)
      await expect(page.getByText(/Dados importados/i)).toBeVisible({ timeout: 6_000 })

      await page.goto("/")
      await expect(page.getByText("Viagem ao Rio 2024")).toBeVisible()
      await expect(page.getByText("Churrasco do Pedro")).toBeVisible()
      await shot(page, "desktop-33-dados-importados")
    })

    // ── 20. Excluir Evento 2 ──────────────────────────────────────────────────
    await test.step("Excluir Evento 2 e verificar que Evento 1 permanece", async () => {
      await page.goto("/")
      await page.getByRole("button", { name: /Excluir/i }).first().click()
      await expect(page.getByRole("dialog")).toBeVisible()
      await shot(page, "desktop-34-confirmar-excluir-evento")
      await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click()

      await expect(page.getByText("Churrasco do Pedro")).not.toBeVisible({ timeout: 4_000 })
      await expect(page.getByText("Viagem ao Rio 2024")).toBeVisible()
      await shot(page, "desktop-35-apenas-evento1-restante")
    })
  })
})

// ── MOBILE ────────────────────────────────────────────────────────────────────

test.describe("Mobile — Navegação e fluxo básico", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("cria evento, participantes, despesa e vê acertos no mobile", async ({ page }) => {
    await page.goto("/")
    await clearState(page)
    await shot(page, "mobile-01-estado-inicial")

    const bottomNav = page.locator("nav.fixed")
    await expect(bottomNav).toBeVisible()

    let eventId = ""

    await test.step("Criar evento no mobile", async () => {
      eventId = await createEvent(page, "Rolê mobile", "Passeio")
      await expect(page.getByText("Rolê mobile")).toBeVisible()
      await page.goto("/")
      await expect(page.getByLabel("Tipo: Passeio")).toBeVisible()
      await page.goto(`/event/${eventId}`)
      await shot(page, "mobile-02-dashboard-evento")
    })

    await test.step("Participantes via bottom nav", async () => {
      await page.goto(`/event/${eventId}/participants`)
      for (const nome of ["Leo", "Mari", "João"]) {
        await addParticipant(page, nome)
      }
      await expect(page.getByText("Leo")).toBeVisible()
      await shot(page, "mobile-03-participantes")
    })

    await test.step("Adicionar despesa pelo botão do header mobile", async () => {
      await page.goto(`/event/${eventId}/participants`)
      await page.locator("header button", { hasText: /Despesa/i }).click()
      await page.waitForURL(/expenses\/new/)
      await shot(page, "mobile-04-form-despesa")

      await page.getByLabel("Descrição").fill("Almoço")
      await page.getByLabel(/Valor/).fill("90")
      await page.getByRole("button", { name: /Salvar despesa/i }).click()
      await page.waitForURL(/\/expenses$/)
      await expect(page.getByText("Almoço")).toBeVisible()
      await shot(page, "mobile-05-lista-despesas")
    })

    await test.step("Navegar para Acertos via bottom nav", async () => {
      await bottomNav.getByRole("link", { name: "Acertos" }).click()
      await expect(page).toHaveURL(/\/settlements/)
      await expect(page.getByRole("button", { name: "Marcar como pago" }).first()).toBeVisible()
      await shot(page, "mobile-06-acertos")
    })

    await test.step("Alternar tema no mobile", async () => {
      await bottomNav.getByRole("link", { name: "Configurações" }).click()
      await expect(page).toHaveURL("/settings")
      await shot(page, "mobile-07-settings")

      await page.getByRole("tab", { name: "Escuro" }).click()
      await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 2_000 })
      await shot(page, "mobile-08-tema-escuro")

      await page.getByRole("tab", { name: "Claro" }).click()
      await expect(page.locator("html")).toHaveClass(/light/, { timeout: 2_000 })
      await shot(page, "mobile-09-tema-claro")

      await page.getByRole("tab", { name: "Sistema" }).click()
      await shot(page, "mobile-10-tema-sistema")
    })
  })
})
