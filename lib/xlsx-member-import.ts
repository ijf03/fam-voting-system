type ZipEntry = {
  method: number;
  compressedSize: number;
  localOffset: number;
};

export type MemberImportSummary = {
  totalMembers: number;
  eligibleMembers: number;
  sourceFile: string;
  rule: string;
};

const decoder = new TextDecoder("utf-8");

function findEndOfCentralDirectory(bytes: Uint8Array) {
  const start = Math.max(0, bytes.length - 65_557);
  for (let index = bytes.length - 22; index >= start; index -= 1) {
    if (
      bytes[index] === 0x50 &&
      bytes[index + 1] === 0x4b &&
      bytes[index + 2] === 0x05 &&
      bytes[index + 3] === 0x06
    ) {
      return index;
    }
  }
  throw new Error("This does not appear to be a valid XLSX file.");
}

function readZipDirectory(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const end = findEndOfCentralDirectory(bytes);
  const entryCount = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const entries = new Map<string, ZipEntry>();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("The XLSX directory is damaged.");
    }
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    entries.set(name, {
      method: view.getUint16(offset + 10, true),
      compressedSize: view.getUint32(offset + 20, true),
      localOffset: view.getUint32(offset + 42, true),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return { bytes, view, entries };
}

async function unzipText(
  zip: ReturnType<typeof readZipDirectory>,
  filename: string,
) {
  const entry = zip.entries.get(filename);
  if (!entry) return null;
  const nameLength = zip.view.getUint16(entry.localOffset + 26, true);
  const extraLength = zip.view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const compressed = zip.bytes.slice(start, start + entry.compressedSize);

  if (entry.method === 0) return decoder.decode(compressed);
  if (entry.method !== 8 || typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress the selected workbook.");
  }

  const stream = new Blob([compressed]).stream().pipeThrough(
    new DecompressionStream("deflate-raw"),
  );
  return decoder.decode(await new Response(stream).arrayBuffer());
}

function parseXml(xml: string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("The workbook contains invalid XML.");
  }
  return document;
}

function columnIndex(reference: string) {
  const letters = reference.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return result - 1;
}

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function readMemberWorkbook(file: File): Promise<MemberImportSummary> {
  const zip = readZipDirectory(await file.arrayBuffer());
  const sharedXml = await unzipText(zip, "xl/sharedStrings.xml");
  const sharedStrings = sharedXml
    ? Array.from(parseXml(sharedXml).querySelectorAll("si")).map((item) =>
        Array.from(item.querySelectorAll("t"))
          .map((text) => text.textContent ?? "")
          .join(""),
      )
    : [];

  const worksheetNames = Array.from(zip.entries.keys())
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort();

  for (const worksheetName of worksheetNames) {
    const worksheetXml = await unzipText(zip, worksheetName);
    if (!worksheetXml) continue;
    const rows = Array.from(parseXml(worksheetXml).querySelectorAll("sheetData > row")).map(
      (row) => {
        const values: string[] = [];
        for (const cell of Array.from(row.querySelectorAll(":scope > c"))) {
          const index = columnIndex(cell.getAttribute("r") ?? "A1");
          const type = cell.getAttribute("t");
          const raw = cell.querySelector(":scope > v")?.textContent ?? "";
          values[index] =
            type === "s"
              ? sharedStrings[Number(raw)] ?? ""
              : type === "inlineStr"
                ? Array.from(cell.querySelectorAll("is t"))
                    .map((text) => text.textContent ?? "")
                    .join("")
                : raw;
        }
        return values;
      },
    );

    const headerIndex = rows.findIndex((row) => {
      const headers = row.map(normalise);
      return headers.includes("last name") && headers.includes("study location");
    });
    if (headerIndex < 0) continue;

    const headers = rows[headerIndex].map(normalise);
    const lastName = headers.indexOf("last name");
    const firstName = headers.indexOf("first name");
    const campus = headers.indexOf("study location");
    const status = headers.indexOf("status");
    if ([lastName, firstName, campus, status].some((index) => index < 0)) continue;

    const members = rows.slice(headerIndex + 1).filter(
      (row) => String(row[firstName] ?? "").trim() || String(row[lastName] ?? "").trim(),
    );
    const eligibleMembers = members.filter(
      (row) =>
        String(row[campus] ?? "").trim().toUpperCase() === "CLAYTON" &&
        String(row[status] ?? "").trim().toUpperCase() === "ENROLLED",
    ).length;

    if (!members.length) continue;
    return {
      totalMembers: members.length,
      eligibleMembers,
      sourceFile: file.name,
      rule: "Clayton campus and enrolled status",
    };
  }

  throw new Error(
    "No member list was found. Use the MSA member export or the FAM attendance workbook.",
  );
}
