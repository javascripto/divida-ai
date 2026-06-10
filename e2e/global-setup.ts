import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Minimal 1×1 JFIF stub — Playwright infers MIME from extension (.jpg → image/jpeg)
// so any binary starting with the JFIF SOI marker is enough for the upload filter.
const JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
])

const PDF_CONTENT = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer << /Size 4 /Root 1 0 R >>
startxref
190
%%EOF
`

export default function globalSetup(): void {
  fs.mkdirSync(path.join(__dirname, "fixtures"),    { recursive: true })
  fs.mkdirSync(path.join(__dirname, "screenshots"), { recursive: true })

  const dir = path.join(__dirname, "fixtures")

  const jpg = path.join(dir, "receipt.jpg")
  if (!fs.existsSync(jpg)) fs.writeFileSync(jpg, JPEG_BYTES)

  const pdf = path.join(dir, "receipt.pdf")
  if (!fs.existsSync(pdf)) fs.writeFileSync(pdf, PDF_CONTENT, "utf8")
}
