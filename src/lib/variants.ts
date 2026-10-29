// Variant selection for the product page (pure, unit-tested).
// Real catalog data mixes variants with and without a size/colour (e.g. one
// colour has size "Standard", others have no size). An empty option on a
// variant means "not applicable", so it must not block the selection.

export type SelectableVariant = { size: string | null; color: string | null; stock: number };

export function resolveVariant<V extends SelectableVariant>(
  active: readonly V[],
  size: string | null,
  color: string | null,
) {
  const hasSizes = active.some((v) => v.size != null);
  const hasColors = active.some((v) => v.color != null);

  // Is the option still required given the other current choice?
  const forColor = color ? active.filter((v) => v.color === color || v.color == null) : active;
  const forSize = size ? active.filter((v) => v.size === size || v.size == null) : active;
  const needsSize = hasSizes && !size && !forColor.some((v) => v.size == null);
  const needsColor = hasColors && !color && !forSize.some((v) => v.color == null);

  const candidates = active.filter(
    (v) => (v.size == null || v.size === size) && (v.color == null || v.color === color),
  );
  // Prefer the most specific match (both options set over one over none).
  const specificity = (v: V) => (v.size != null ? 1 : 0) + (v.color != null ? 1 : 0);
  const variant = needsSize || needsColor ? undefined : [...candidates].sort((a, b) => specificity(b) - specificity(a))[0];

  return { variant, needsSize, needsColor };
}

/** Whether choosing size `s` can lead to an in-stock variant with the current colour. */
export function sizeAvailable(active: readonly SelectableVariant[], s: string, color: string | null) {
  return active.some(
    (v) => (v.size === s || v.size == null) && (color ? v.color === color || v.color == null : true) && v.stock > 0,
  );
}
