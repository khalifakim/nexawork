/**
 * Trigger a direct file download from the browser (no preview modal).
 *
 * Used for attachments on comments, canaux and conversations — those are user
 * uploads that should download immediately when clicked, not open the GED
 * preview overlay (which is reserved for `@@@document` mentions referencing a
 * document already in the workspace library).
 *
 * The mock generates a small placeholder blob so the browser has something to
 * write to disk; when the backend is wired in, replace the blob with the
 * response of the download endpoint.
 */
export function downloadAttachedFile(name: string, size?: number): void {
  const label = size != null ? `${name} (${size} octets)` : name;
  const blob = new Blob([`Contenu simulé du fichier joint « ${label} ».`], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
