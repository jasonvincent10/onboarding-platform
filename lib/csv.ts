// lib/csv.ts
// Minimal CSV building with RFC 4180 escaping. No dependencies.

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(",");
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines: string[] = [csvRow(headers)];
  for (const row of rows) {
    lines.push(csvRow(row));
  }
  return lines.join("\r\n") + "\r\n";
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="' + filename + '"',
      "Cache-Control": "no-store",
    },
  });
}
