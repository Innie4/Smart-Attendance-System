/**
 * Client-side report exports.
 *
 * The real server streams these with ReportLab; in the frontend-only build the
 * files are produced in the browser so the download buttons behave exactly the
 * same way to the user.
 */

function escapeCsv(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildCsv(courseCode, rows, sessionYear) {
  const header = [
    'Matric Number',
    'Full Name',
    'Sessions Attended',
    'Sessions Held',
    'Attendance %',
    'NUC Compliant',
  ]
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(
      [
        escapeCsv(row.matric_number),
        escapeCsv(row.full_name),
        row.sessions_attended,
        row.sessions_held,
        row.attendance_percentage,
        row.is_compliant ? 'Yes' : 'No',
      ].join(',')
    )
  }
  lines.push('')
  lines.push(`Session,${escapeCsv(sessionYear)}`)
  return lines.join('\n')
}

// A PDF is a small text-based container, so a valid single-page document can be
// written directly. Each string must not contain the delimiters.
function pdfEscape(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

export function buildPdf(courseCode, courseTitle, rows, threshold, sessionYear) {
  const content = []
  let y = 780

  const line = (text, size = 10, font = 'F1') => {
    content.push(`BT /${font} ${size} Tf 56 ${y} Td (${pdfEscape(text)}) Tj ET`)
    y -= size + 6
  }

  line('Smart Attendance - Compliance Report', 16, 'F2')
  line(`${courseCode}  ${courseTitle}`, 12, 'F2')
  line(`Session: ${sessionYear}`, 10)
  line(`NUC minimum attendance: ${threshold}%`, 10)
  y -= 6
  line('Matric Number    Name                          Att   Held   %     Status', 10, 'F2')
  y -= 4

  for (const row of rows) {
    if (y < 70) break
    const name = String(row.full_name).slice(0, 28).padEnd(29, ' ')
    line(
      `${String(row.matric_number).padEnd(16, ' ')}${name}${String(row.sessions_attended).padStart(4, ' ')}${String(
        row.sessions_held
      ).padStart(7, ' ')}${String(row.attendance_percentage).padStart(7, ' ')}   ${row.is_compliant ? 'OK' : 'AT RISK'}`,
      9
    )
  }

  const stream = content.join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((body, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })
  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return pdf
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
