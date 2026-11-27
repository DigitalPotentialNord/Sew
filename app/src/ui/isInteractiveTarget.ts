/**
 * #19: Bedienelement-/Text-Fokus-Erkennung für globale Tastaturkürzel und
 * Canvas-Gesten. Konsistent: Alles, was die Leertaste/Eingabetaste zum
 * Aktivieren benutzt oder Text editiert, darf keine globalen Abkürzungen
 * auslösen (Buttons, Links, native Selects, ARIA-Rollen, Dialoge).
 */
export const isInteractiveTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return true;
  if (target.isContentEditable) return true;
  return target.closest('[role="button"], [role="tab"], [role="menu"], [role="listbox"], [role="dialog"], [role="switch"]') !== null;
};
