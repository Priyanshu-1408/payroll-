const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const port = 3001;

const normalizeHeader = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// function isDateHeader(value) {
//   if (value instanceof Date && !Number.isNaN(value.getTime())) return true;
//   if (typeof value === "number") {
//     // Excel date serials in a reasonable attendance-sheet date range.
//     return value >= 20000 && value <= 80000;
//   }
//   if (typeof value !== "string" || !value.trim()) return false;
//   const text = value.trim();
//   return (
//     /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})$/.test(
//       text,
//     ) && !Number.isNaN(Date.parse(text))
//   );
// }

function isDateHeader(value) {
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }

  if (typeof value === "number") {
    return value >= 20000 && value <= 80000;
  }

  if (typeof value === "string") {
    return !isNaN(Date.parse(value));
  }

  return false;
}

function parseAttendanceSheet(sheet) {
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });
  const required = ["employee id", "name", "designation", "p", "l", "wfh"];
  const headerIndex = matrix.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return required.every((header) => headers.includes(header));
  });

  if (headerIndex < 0) {
    throw new Error(
      "Could not find the Employee ID, Name, Designation, P, L, and WFH headers.",
    );
  }

  const headers = matrix[headerIndex].map(normalizeHeader);
  const columns = Object.fromEntries(
    required.map((header) => [header, headers.indexOf(header)]),
  );
  const wfhColumn = columns.wfh;
  const workingDayCount = matrix[headerIndex]
    .slice(wfhColumn + 1)
    .filter(isDateHeader).length;

  const employees = matrix
    .slice(headerIndex + 1)
    .filter(
      (row) =>
        row[columns["employee id"]] !== "" &&
        row[columns["employee id"]] != null &&
        row[columns.name] !== "" &&
        row[columns.name] != null,
    )
    .map((row) => ({
      employeeId: row[columns["employee id"]],
      name: row[columns.name],
      designation: row[columns.designation] ?? "",
      p: row[columns.p] ?? "",
      l: row[columns.l] ?? "",
      wfh: row[columns.wfh] ?? "",
    }));

  return { workingDayCount, employees };
}

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", message: "Payroll server is running." });
});

app.post("/api/upload", upload.single("file"), (request, response) => {
  if (!request.file) {
    return response
      .status(400)
      .json({ error: "Choose an Excel file to upload." });
  }

  try {
    const workbook = XLSX.read(request.file.buffer, {
      type: "buffer",
      cellDates: true,
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet)
      return response
        .status(400)
        .json({ error: "The workbook has no sheets." });
    const result = parseAttendanceSheet(sheet);
    response.json({ filename: request.file.originalname, ...result });
  } catch (error) {
    response
      .status(400)
      .json({ error: error.message || "Could not read the Excel file." });
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return response
      .status(400)
      .json({ error: "File must be 10 MB or smaller." });
  }
  response.status(400).json({ error: "File upload failed." });
});

app.listen(port, () => {
  console.log(`Payroll server listening at http://localhost:${port}`);
});
