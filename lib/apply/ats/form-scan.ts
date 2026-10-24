/**
 * Turns a live application form into FormQuestion[] the answer engine can read,
 * plus a handle per question so fill.ts can find the same control again.
 *
 * The scan runs inside the page (one evaluate) because label resolution needs
 * the real DOM: label[for], wrapping labels, aria-labelledby, fieldset legends
 * and — for sites like Lever and Ashby whose labels are sibling <div>s — the
 * nearest question container's own text. Doing that through hundreds of
 * Playwright round-trips would be slow and racy against React re-renders.
 *
 * What is deliberately NOT a question:
 *  - hidden, disabled, aria-hidden and honeypot inputs. Greenhouse's
 *    react-select keeps an aria-hidden `required` input next to every combobox
 *    purely for native validation; filling it would do nothing and scanning it
 *    would double every question.
 *  - search boxes (the phone widget's country search on Greenhouse).
 * File, radio and checkbox inputs are exempt from the visibility test, because
 * every ATS we checked hides the native control and styles a sibling instead.
 *
 * Adapted in part from averatec0773/offeros, Apache-2.0 (the field selector and
 * the Workday listbox-button note in recipes.ts).
 */
import type { Frame, Page } from 'playwright';
import type { FieldKind, FieldOption, FormQuestion } from '@/lib/apply/types';

export type FormScope = Page | Frame;

export interface FieldHandle {
  questionId: string;
  kind: FieldKind;
  label: string;
  /** Primary control. For radio/checkbox groups, the first member. */
  selector: string;
  /** Choice kinds: option value → selector of the control to click. */
  optionSelectors: Record<string, string>;
}

export interface ScanResult {
  questions: FormQuestion[];
  handles: Map<string, FieldHandle>;
}

export interface ScanOptions {
  /** CSS selector of the form root; the whole document when absent or not found. */
  rootSelector?: string | null;
  /** Controls inside elements matching this selector are ignored. */
  excludeSelector?: string | null;
  /** Open option-less comboboxes once to read their listbox. Default true. */
  openComboboxes?: boolean;
}

/** Shape returned from the in-page scan (JSON-serialisable). */
interface RawField {
  id: string;
  label: string;
  kind: FieldKind;
  options: FieldOption[];
  required: boolean;
  maxLength?: number;
  multiple?: boolean;
  selector: string;
  optionSelectors: Record<string, string>;
}

const LABEL_MAX = 500;

/**
 * tsx/esbuild with keepNames wraps functions in `__name(...)`, a helper that
 * does not exist inside the page, so every page.evaluate(fn) would throw.
 * Defining a no-op once per document keeps typed evaluate callbacks usable
 * however this module is compiled. Sent as a string so it is never transpiled.
 */
export async function ensurePageHelpers(scope: FormScope): Promise<void> {
  await scope.evaluate('globalThis.__name = globalThis.__name || ((f) => f); undefined');
}

export async function scanForm(scope: FormScope, opts: ScanOptions = {}): Promise<ScanResult> {
  await ensurePageHelpers(scope);
  const raw = await scope.evaluate(inPageScan, {
    rootSelector: opts.rootSelector ?? null,
    excludeSelector: opts.excludeSelector ?? null,
    labelMax: LABEL_MAX,
  });

  if (opts.openComboboxes !== false) {
    for (const field of raw) {
      if (field.kind !== 'combobox' || field.options.length > 0) continue;
      field.options = await readComboboxOptions(scope, field.selector);
    }
  }

  const questions: FormQuestion[] = [];
  const handles = new Map<string, FieldHandle>();
  for (const f of raw) {
    const question: FormQuestion = {
      id: f.id,
      label: f.label,
      kind: f.kind,
      options: f.options,
      required: f.required,
    };
    if (f.maxLength !== undefined) question.maxLength = f.maxLength;
    if (f.multiple !== undefined) question.multiple = f.multiple;
    questions.push(question);
    handles.set(f.id, {
      questionId: f.id,
      kind: f.kind,
      label: f.label,
      selector: f.selector,
      optionSelectors: f.optionSelectors,
    });
  }
  return { questions, handles };
}

/**
 * Opens a combobox, reads the visible options, closes it again. Async
 * autocompletes (location pickers) show nothing until typed into, so an
 * empty result is normal and fill.ts then types the answer instead.
 */
async function readComboboxOptions(scope: FormScope, selector: string): Promise<FieldOption[]> {
  const control = scope.locator(selector).first();
  try {
    await control.click({ timeout: 2000 });
    const options = scope.locator('[role="option"]:visible');
    let appeared = await options
      .first()
      .waitFor({ state: 'visible', timeout: 1200 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) {
      // react-select also opens on ArrowDown; a click that landed during
      // hydration is otherwise lost.
      await control.press('ArrowDown').catch(() => undefined);
      appeared = await options
        .first()
        .waitFor({ state: 'visible', timeout: 800 })
        .then(() => true)
        .catch(() => false);
    }
    if (!appeared) return [];
    const texts = await options.allInnerTexts();
    const seen = new Set<string>();
    const result: FieldOption[] = [];
    for (const text of texts) {
      const label = text.replace(/\s+/g, ' ').trim();
      if (!label || seen.has(label) || /^no options$/i.test(label)) continue;
      seen.add(label);
      result.push({ label, value: label });
    }
    return result;
  } catch {
    return [];
  } finally {
    await control.press('Escape').catch(() => undefined);
  }
}

/**
 * Runs inside the page. Must stay self-contained: no imports, no closures over
 * module scope. Nested helpers are fine (see ensurePageHelpers).
 */
function inPageScan(args: {
  rootSelector: string | null;
  excludeSelector: string | null;
  labelMax: number;
}): RawField[] {
  const rootEl: ParentNode =
    (args.rootSelector ? document.querySelector(args.rootSelector) : null) ?? document;

  const CONTROL_SELECTOR =
    'input, select, textarea, [role="combobox"], button[aria-haspopup="listbox"]';
  const HONEYPOT = /honeypot|hp[-_]?field|leave (this )?(field )?(blank|empty)|do[-_ ]?not[-_ ]?fill|\bbot[-_]?field\b/i;
  const ASTERISK = /[*✱]|\(required\)/;

  // Collect through open shadow roots too (SmartRecruiters and Workday use web components).
  function deepQueryAll(root: ParentNode, selector: string): Element[] {
    const out: Element[] = [];
    const visit = (node: ParentNode): void => {
      node.querySelectorAll(selector).forEach((el) => out.push(el));
      node.querySelectorAll('*').forEach((el) => {
        const shadow = (el as HTMLElement).shadowRoot;
        if (shadow) visit(shadow);
      });
    };
    visit(root);
    return out;
  }

  function clean(text: string | null | undefined): string {
    return (text ?? '').replace(/\s+/g, ' ').trim();
  }

  function stripRequiredMarks(text: string): string {
    return clean(text.replace(/[*✱]/g, ' ').replace(/\(required\)/gi, ' ')).slice(0, args.labelMax);
  }

  function textWithoutControls(el: Element | null): string {
    if (!el) return '';
    const clone = el.cloneNode(true) as Element;
    clone
      .querySelectorAll('input, select, textarea, button, script, style, svg, [aria-hidden="true"], [role="listbox"]')
      .forEach((n) => n.remove());
    return clean(clone.textContent);
  }

  function isRendered(el: Element): boolean {
    const withApi = el as Element & { checkVisibility?: (o?: object) => boolean };
    if (typeof withApi.checkVisibility === 'function') {
      if (!withApi.checkVisibility({ visibilityProperty: true })) return false;
    } else {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    const rect = el.getBoundingClientRect();
    // Classic honeypot: parked far off-screen.
    if (rect.right < -500 || rect.bottom < -500) return false;
    return true;
  }

  function rootOf(el: Element): Document | ShadowRoot {
    const r = el.getRootNode();
    return r instanceof ShadowRoot ? r : document;
  }

  function byId(el: Element, id: string): Element | null {
    const root = rootOf(el);
    return root.getElementById ? root.getElementById(id) : document.getElementById(id);
  }

  function labelFor(el: Element): Element | null {
    const id = el.getAttribute('id');
    if (!id) return null;
    try {
      return rootOf(el).querySelector(`label[for="${CSS.escape(id)}"]`);
    } catch {
      return null;
    }
  }

  function ariaLabelledBy(el: Element): string {
    const ids = el.getAttribute('aria-labelledby');
    if (!ids) return '';
    return clean(
      ids
        .split(/\s+/)
        .map((id) => textWithoutControls(byId(el, id)))
        .filter(Boolean)
        .join(' ')
    );
  }

  /** Wrapping <label>: prefer its first child that does not hold the control (Lever). */
  function wrappingLabelText(el: Element): { text: string; node: Element | null } {
    const label = el.closest('label');
    if (!label) return { text: '', node: null };
    for (const child of Array.from(label.children)) {
      if (child.contains(el)) continue;
      if (child.matches('input, select, textarea, button')) continue;
      const t = textWithoutControls(child);
      if (t) return { text: t, node: child };
    }
    return { text: textWithoutControls(label), node: label };
  }

  const QUESTION_TEXT_SELECTOR =
    'legend, label, [class*="label"], [class*="title"], [class*="question"], h1, h2, h3, h4, h5, h6, p';

  /** Nearest question container: walk up, take the first text child that holds none of `members`. */
  function containerText(members: Element[]): { text: string; node: Element | null } {
    let current: Element | null = members[0].parentElement;
    for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
      if (!members.every((m) => current!.contains(m))) continue;
      for (const child of Array.from(current.children)) {
        if (members.some((m) => child.contains(m))) continue;
        // A sibling holding its own controls is another question, not ours.
        if (child.querySelector('input, select, textarea, [role="combobox"]')) continue;
        if (!child.matches(QUESTION_TEXT_SELECTOR) && !child.querySelector(QUESTION_TEXT_SELECTOR)) continue;
        const t = textWithoutControls(child);
        if (t) return { text: t, node: child };
      }
      if (current.matches('form, [role="form"], body')) break;
    }
    return { text: '', node: null };
  }

  // Label text that names a button, not the question. Greenhouse gives the
  // resume input a visually-hidden label[for] reading "Attach"; the real
  // question ("Resume/CV") is on the surrounding role=group.
  const BUTTONISH = /^(attach|upload|upload file|browse|choose (a )?file|select (a )?file|enter manually)$/i;

  function resolveLabel(el: Element): { text: string; node: Element | null } {
    if ((el.getAttribute('type') ?? '').toLowerCase() === 'file') {
      const group = el.closest('[role="group"][aria-labelledby]');
      if (group) {
        const t = ariaLabelledBy(group);
        const firstId = (group.getAttribute('aria-labelledby') ?? '').split(/\s+/)[0];
        if (t && !BUTTONISH.test(t)) return { text: t, node: firstId ? byId(el, firstId) : null };
      }
    }
    const forLabel = labelFor(el);
    if (forLabel) {
      const t = textWithoutControls(forLabel);
      if (t && !BUTTONISH.test(t)) return { text: t, node: forLabel };
    }
    const labelledBy = ariaLabelledBy(el);
    if (labelledBy) return { text: labelledBy, node: null };
    const wrapped = wrappingLabelText(el);
    if (wrapped.text) return wrapped;
    const aria = clean(el.getAttribute('aria-label'));
    if (aria) return { text: aria, node: null };
    const fieldset = el.closest('fieldset');
    const legend = fieldset?.querySelector('legend');
    if (legend && textWithoutControls(legend)) return { text: textWithoutControls(legend), node: legend };
    const near = containerText([el]);
    if (near.text) return near;
    const placeholder = clean(el.getAttribute('placeholder'));
    if (placeholder && !/^(type here|start typing|select)\.*$/i.test(placeholder)) {
      return { text: placeholder, node: null };
    }
    return { text: '', node: null };
  }

  function optionLabel(el: Element): string {
    const forLabel = labelFor(el);
    if (forLabel && textWithoutControls(forLabel)) return textWithoutControls(forLabel);
    const wrapping = el.closest('label');
    if (wrapping && textWithoutControls(wrapping)) return textWithoutControls(wrapping);
    const aria = clean(el.getAttribute('aria-label'));
    if (aria) return aria;
    const next = el.nextElementSibling;
    if (next && textWithoutControls(next)) return textWithoutControls(next);
    return '';
  }

  function isRequired(el: Element, labelInfo: { text: string; node: Element | null }): boolean {
    if ((el as HTMLInputElement).required) return true;
    if (el.getAttribute('aria-required') === 'true') return true;
    if (el.closest('[aria-required="true"]')) return true;
    const node = labelInfo.node;
    if (node) {
      if (ASTERISK.test(node.textContent ?? '')) return true;
      if (/(^|[\s_-])required([\s_-]|$)/i.test(node.getAttribute('class') ?? '')) return true;
      if (node.querySelector('.required, [class*="required"]')) return true;
    }
    return false;
  }

  let marker = 0;
  function selectorFor(el: Element): string {
    const id = el.getAttribute('id');
    if (id) {
      try {
        const sel = `#${CSS.escape(id)}`;
        if (rootOf(el).querySelectorAll(sel).length === 1) return sel;
      } catch {
        /* fall through to a marker */
      }
    }
    const existing = el.getAttribute('data-hw-field');
    if (existing) return `[data-hw-field="${existing}"]`;
    marker += 1;
    const tag = `hw${marker}`;
    el.setAttribute('data-hw-field', tag);
    return `[data-hw-field="${tag}"]`;
  }

  function kindOf(el: Element): FieldKind | null {
    const tag = el.tagName.toLowerCase();
    if (tag === 'select') return 'select';
    if (tag === 'textarea') return 'textarea';
    if (el.getAttribute('role') === 'combobox' || el.getAttribute('aria-haspopup') === 'listbox') {
      return 'combobox';
    }
    if (tag !== 'input') return null;
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();
    switch (type) {
      case 'hidden':
      case 'submit':
      case 'button':
      case 'reset':
      case 'image':
      case 'search':
      case 'password':
        return null;
      case 'email':
      case 'tel':
      case 'url':
      case 'number':
      case 'date':
      case 'file':
      case 'radio':
      case 'checkbox':
        return type;
      default:
        return 'text';
    }
  }

  const exclude = args.excludeSelector;
  const used = new Set<Element>();
  const ids = new Set<string>();
  const fields: RawField[] = [];

  function uniqueId(base: string): string {
    let id = base || `field-${fields.length + 1}`;
    let n = 2;
    while (ids.has(id)) id = `${base}-${n++}`;
    ids.add(id);
    return id;
  }

  // Button choice groups (Ashby yes/no): ≥2 aria-pressed buttons in one container.
  const pressedButtons = deepQueryAll(rootEl, 'button[aria-pressed]');
  const groupContainers = new Set<Element>();
  for (const btn of pressedButtons) {
    const parent = btn.parentElement;
    if (!parent || groupContainers.has(parent)) continue;
    if (exclude && btn.closest(exclude)) continue;
    const buttons = Array.from(parent.querySelectorAll(':scope > button[aria-pressed]'));
    if (buttons.length < 2 || !isRendered(parent)) continue;
    groupContainers.add(parent);
    parent.querySelectorAll('input').forEach((i) => used.add(i));
    const labelInfo = containerText([parent]);
    const hiddenInput = parent.querySelector('input');
    const options: FieldOption[] = [];
    const optionSelectors: Record<string, string> = {};
    for (const b of buttons) {
      const label = clean(b.textContent);
      if (!label) continue;
      options.push({ label, value: label });
      optionSelectors[label] = selectorFor(b);
    }
    const required =
      isRequired(parent, labelInfo) || (hiddenInput ? isRequired(hiddenInput, labelInfo) : false);
    fields.push({
      id: uniqueId(hiddenInput?.getAttribute('name') ?? `choice-${fields.length + 1}`),
      label: stripRequiredMarks(labelInfo.text),
      kind: 'radio',
      options,
      required,
      selector: optionSelectors[options[0]?.value ?? ''] ?? selectorFor(parent),
      optionSelectors,
    });
  }

  const controls = deepQueryAll(rootEl, CONTROL_SELECTOR);
  for (const el of controls) {
    if (used.has(el)) continue;
    const kind = kindOf(el);
    if (!kind) continue;
    if (exclude && el.closest(exclude)) continue;
    if ((el as HTMLInputElement).disabled) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (kind !== 'combobox' && (el as HTMLInputElement).readOnly) continue;

    const nameAttr = el.getAttribute('name') ?? '';
    const idAttr = el.getAttribute('id') ?? '';
    const cls = el.getAttribute('class') ?? '';
    if (HONEYPOT.test(`${nameAttr} ${idAttr} ${cls}`)) continue;

    const hiddenNative = kind === 'file' || kind === 'radio' || kind === 'checkbox';
    const visibilityProbe = hiddenNative ? el.parentElement ?? el : el;
    if (!isRendered(visibilityProbe)) continue;

    if (kind === 'radio' || kind === 'checkbox') {
      // Group by shared name, or by a shared fieldset (Ashby names each checkbox after its option).
      let members: Element[] = [];
      if (nameAttr) {
        members = controls.filter(
          (c) =>
            c.tagName.toLowerCase() === 'input' &&
            (c.getAttribute('type') ?? '').toLowerCase() === kind &&
            c.getAttribute('name') === nameAttr &&
            rootOf(c) === rootOf(el)
        );
      }
      if (members.length < 2) {
        const fieldset = el.closest('fieldset');
        if (fieldset) {
          const inSet = Array.from(fieldset.querySelectorAll(`input[type="${kind}"]`));
          if (inSet.length >= 2) members = inSet;
        }
      }
      if (members.length < 2) members = [el];
      members.forEach((m) => used.add(m));

      const options: FieldOption[] = [];
      const optionSelectors: Record<string, string> = {};
      for (const m of members) {
        const text = optionLabel(m);
        const rawValue = m.getAttribute('value');
        const value = rawValue && rawValue !== 'on' ? rawValue : text || rawValue || 'on';
        const label = text || value;
        if (optionSelectors[value]) continue;
        options.push({ label, value });
        optionSelectors[value] = selectorFor(m);
      }

      const isGroup = members.length > 1;
      let labelInfo: { text: string; node: Element | null };
      if (isGroup) {
        const fieldset = el.closest('fieldset');
        const legend = fieldset?.querySelector('legend');
        const groupEl = el.closest('[role="group"], [role="radiogroup"]');
        const groupLabel = groupEl ? ariaLabelledBy(groupEl) : '';
        if (legend && textWithoutControls(legend)) {
          labelInfo = { text: textWithoutControls(legend), node: legend };
        } else if (groupLabel) {
          labelInfo = { text: groupLabel, node: null };
        } else {
          labelInfo = containerText(members);
        }
      } else {
        // A lone checkbox ("I consent to ...") carries its question in its own label.
        const own = optionLabel(el);
        labelInfo = own ? { text: own, node: el.closest('label') } : containerText(members);
      }
      const required = members.some((m) => isRequired(m, labelInfo));
      fields.push({
        id: uniqueId(nameAttr || idAttr || `${kind}-${fields.length + 1}`),
        label: stripRequiredMarks(labelInfo.text),
        kind,
        options,
        required,
        multiple: kind === 'checkbox' ? isGroup : undefined,
        selector: optionSelectors[options[0].value],
        optionSelectors,
      });
      continue;
    }

    used.add(el);
    const labelInfo = resolveLabel(el);
    const label = stripRequiredMarks(labelInfo.text || nameAttr || idAttr);
    let options: FieldOption[] = [];
    let multiple: boolean | undefined;
    if (kind === 'select') {
      const select = el as HTMLSelectElement;
      options = Array.from(select.options)
        .filter((o) => o.value !== '' && !o.disabled)
        .map((o) => ({ label: clean(o.textContent) || o.value, value: o.value }));
      multiple = select.multiple || undefined;
    }
    const maxAttr = el.getAttribute('maxlength');
    const maxLength = maxAttr && /^\d+$/.test(maxAttr) ? Number(maxAttr) : undefined;
    fields.push({
      id: uniqueId(idAttr || nameAttr || `${kind}-${fields.length + 1}`),
      label,
      kind,
      options,
      required: isRequired(el, labelInfo),
      maxLength: maxLength && maxLength > 0 ? maxLength : undefined,
      multiple,
      selector: selectorFor(el),
      optionSelectors: {},
    });
  }

  // Drop undefined keys so the result is plain JSON.
  return fields.map((f) => {
    const copy: RawField = { ...f };
    if (copy.maxLength === undefined) delete copy.maxLength;
    if (copy.multiple === undefined) delete copy.multiple;
    return copy;
  });
}
