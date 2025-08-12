// lib/drive.ts
import { google, drive_v3 } from "googleapis";

function getServiceAccountJson(): any {
  const raw = process.env.GDRIVE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing env GDRIVE_SERVICE_ACCOUNT_JSON");
  // Accept raw JSON or base64
  if (raw.trim().startsWith("{")) return JSON.parse(raw);
  const decoded = Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded);
}

export function getDriveClient() {
  const credentials = getServiceAccountJson();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

export async function listDrivePdfs(folderId: string) {
  const drive = getDriveClient();
  const out: Array<{ id: string; name: string; modifiedTime?: string; size?: number }> = [];
  let pageToken: string | undefined = undefined;

  do {
    // Avoid the TS “res implicitly any” by giving the data a type
    const resp = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
      fields: "nextPageToken, files(id, name, modifiedTime, size)",
      pageSize: 1000,
      pageToken,
    });
    const data = resp.data as drive_v3.Schema$FileList;

    (data.files || []).forEach((f) =>
      out.push({
        id: f.id!,
        name: f.name!,
        modifiedTime: f.modifiedTime!,
        size: Number(f.size || 0),
      })
    );
    pageToken = data.nextPageToken || undefined;
  } while (pageToken);

  return out;
}

export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();
  const resp = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(resp.data as ArrayBuffer);
}

export function guessTitleFromFilename(name: string): { id: string; title: string } {
  const base = name.replace(/\.pdf$/i, "");
  // remove common noise words
  const cleaned = base
    .replace(/\b(rulebook|rules|manual|english|en|uk|v\d+|\d+e|edition|expansion|player aid|reference|how to play)\b/gi, " ")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const title = cleaned.length ? cleaned : base;
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return { id, title };
}
