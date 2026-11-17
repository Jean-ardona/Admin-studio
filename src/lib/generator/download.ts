/**
 * Browser-only helper: triggers a download of the given ZIP bytes.
 * Kept separate from `packageProject`, which stays pure.
 */
export function downloadZip(bytes: Uint8Array, fileName = "admin-studio-project.zip"): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
