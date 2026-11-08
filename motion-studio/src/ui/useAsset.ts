import type { ElementPropsMap, ElementType, SceneElement } from '../engine/schema';
import { findPreset, resolveTarget, useStore } from '../store/store';
import { insertElement } from '../pages/editor/InsertPanel';

/** Insert an element into whatever scene/clip is open in the editor, then jump there. */
export function insertIntoOpenTarget<T extends ElementType>(type: T, props: Partial<ElementPropsMap[T]>, name: string, patch?: (e: SceneElement) => void) {
  const st = useStore.getState();
  const ctx = resolveTarget(st, st.ui.target);
  if (!ctx) { st.toast('Open a scene or motion clip first', 'err'); return false; }
  const format = ctx.formats.find((f) => f.id === st.ui.formatId) ?? ctx.formats[0];
  insertElement(type, { scene: ctx.scene, formats: ctx.formats, format, preset: findPreset(st, ctx.presetId), props, name, patch });
  st.ui$({ page: ctx.clip ? 'motion' : 'scene' });
  st.toast(`Added “${name}” to ${ctx.label}`);
  return true;
}

export function openTargetLabel() {
  const st = useStore.getState();
  return resolveTarget(st, st.ui.target)?.label ?? null;
}
