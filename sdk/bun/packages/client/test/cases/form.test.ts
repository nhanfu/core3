/**
 * Test cases for form components
 *
 * NOT YET RUNNABLE — requires the component implementation + vitest/jest setup.
 * Run: npx vitest run cases/form.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FormPanel,
  TextInput,
  NumberInput,
  SelectInput,
  DateInput,
  TextareaInput,
  CheckboxInput,
} from '@core3/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mount<T extends { mount(el: HTMLElement): void }>(comp: T) {
  const el = document.createElement('div');
  comp.mount(el);
  return { el, comp };
}

function changeInput(el: HTMLElement, value: string) {
  const input = el.querySelector<HTMLInputElement>('input, textarea, select')!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// ─── TextInput ────────────────────────────────────────────────────────────────

describe('TextInput', () => {
  it('renders with the current value from state', () => {
    const { el } = mount(new TextInput('f', { value: 'Hello', error: null }));
    const input = el.querySelector<HTMLInputElement>('input')!;
    expect(input.value).toBe('Hello');
    expect(input.className).toContain('token-form-control');
  });

  it('renders label text', () => {
    const comp = new TextInput('f', { value: '', error: null });
    comp.def = { label: 'Driver Name', required: false };
    const { el } = mount(comp);
    expect(el.querySelector('label')?.textContent).toContain('Driver Name');
  });

  it('marks required fields with * in the label', () => {
    const comp = new TextInput('f', { value: '', error: null });
    comp.def = { label: 'Plate', required: true };
    const { el } = mount(comp);
    expect(el.querySelector('label')?.textContent).toContain('*');
  });

  it('calls setState({ value }) on input event', () => {
    const comp = new TextInput('f', { value: '', error: null });
    const { el } = mount(comp);
    const spy = vi.spyOn(comp, 'setState');
    changeInput(el, 'NEW-VALUE');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ value: 'NEW-VALUE' }), false);
  });

  it('shows error message when state.error is set', () => {
    const { el } = mount(new TextInput('f', { value: '', error: 'Required field' }));
    expect(el.textContent).toContain('Required field');
  });

  it('does not show error container when state.error is null', () => {
    const { el } = mount(new TextInput('f', { value: '', error: null }));
    expect(el.querySelector('.text-red-600')).toBeNull();
  });

  it('input is read-only when readonly=true in def', () => {
    const comp = new TextInput('f', { value: 'ABC', error: null });
    comp.def = { readonly: true };
    const { el } = mount(comp);
    expect(el.querySelector<HTMLInputElement>('input')!.readOnly).toBe(true);
  });
});

// ─── NumberInput ──────────────────────────────────────────────────────────────

describe('NumberInput', () => {
  it('renders with numeric value', () => {
    const { el } = mount(new NumberInput('f', { value: 42, error: null }));
    expect(el.querySelector<HTMLInputElement>('input')!.value).toBe('42');
  });

  it('type="number" on the underlying input', () => {
    const { el } = mount(new NumberInput('f', { value: 0, error: null }));
    expect(el.querySelector('input')?.type).toBe('number');
  });

  it('updates state on change', () => {
    const comp = new NumberInput('f', { value: 0, error: null });
    const { el } = mount(comp);
    const spy = vi.spyOn(comp, 'setState');
    changeInput(el, '99');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ value: 99 }), false);
  });
});

// ─── SelectInput ──────────────────────────────────────────────────────────────

describe('SelectInput', () => {
  const OPTIONS = ['Semi', 'Box Truck', 'Flatbed'];

  it('renders one <option> per option + one blank "all" option', () => {
    const comp = new SelectInput('f', { value: '', open: false, options: OPTIONS });
    const { el } = mount(comp);
    const opts = el.querySelectorAll('option');
    expect(opts.length).toBe(OPTIONS.length + 1); // blank + 3
  });

  it('marks the current value as selected', () => {
    const comp = new SelectInput('f', { value: 'Box Truck', open: false, options: OPTIONS });
    const { el } = mount(comp);
    const sel = el.querySelector<HTMLSelectElement>('select')!;
    expect(sel.value).toBe('Box Truck');
  });

  it('updates state on change', () => {
    const comp = new SelectInput('f', { value: '', open: false, options: OPTIONS });
    const { el } = mount(comp);
    const spy = vi.spyOn(comp, 'setState');
    changeInput(el, 'Semi');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ value: 'Semi' }), false);
  });
});

// ─── FormPanel ────────────────────────────────────────────────────────────────

describe('FormPanel', () => {
  function makePanel() {
    const panel = new FormPanel('fp', {
      values: { plate: 'ABC-123', type: 'Semi', mileage: 85000 },
      errors: {},
      dirty: false,
      saving: false,
    });
    // Attach child inputs
    const plate = panel.createChild(TextInput, { value: 'ABC-123', error: null });
    const type = panel.createChild(SelectInput, { value: 'Semi', open: false, options: ['Semi', 'Box'] });
    return { panel, plate, type };
  }

  it('state.dirty becomes true after first field change', () => {
    const { panel, plate } = makePanel();
    const el = document.createElement('div');
    panel.mount(el);

    plate.setState({ value: 'XYZ-999' }, false);
    panel.setState({ dirty: true }, false); // emitted by input's onChange
    expect(panel.state.dirty).toBe(true);
  });

  it('submit() collects all child input values into one params object', async () => {
    const { panel } = makePanel();
    const params = await panel.collectValues();
    expect(params).toMatchObject({ plate: 'ABC-123', type: 'Semi' });
  });

  it('submit() sets state.saving=true during async submit, false after', async () => {
    const { panel } = makePanel();
    const savingStates: boolean[] = [];
    vi.spyOn(panel, 'setState').mockImplementation((partial) => {
      if ('saving' in partial) savingStates.push(partial.saving as boolean);
    });
    await panel.submit('truck.update', {});
    expect(savingStates).toEqual([true, false]);
  });

  it('submit() with required field empty sets error in child state', async () => {
    const { panel, plate } = makePanel();
    plate.def = { required: true };
    plate.setState({ value: '' }, false); // empty required field
    await panel.submit('truck.update', {});
    expect(plate.state.error).toBeTruthy();
  });

  it('validate() returns false when a required field is empty', () => {
    const { panel, plate } = makePanel();
    plate.def = { required: true };
    plate.setState({ value: '' }, false);
    expect(panel.validate()).toBe(false);
  });
});

// ─── CheckboxInput ────────────────────────────────────────────────────────────

describe('CheckboxInput', () => {
  it('renders a checkbox input', () => {
    const { el } = mount(new CheckboxInput('cb', { value: false }));
    const inp = el.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(inp).not.toBeNull();
  });

  it('is checked when value is true', () => {
    const { el } = mount(new CheckboxInput('cb', { value: true }));
    expect(el.querySelector<HTMLInputElement>('input')!.checked).toBe(true);
  });

  it('toggles state on click', () => {
    const comp = new CheckboxInput('cb', { value: false });
    const { el } = mount(comp);
    const spy = vi.spyOn(comp, 'setState');
    el.querySelector<HTMLInputElement>('input')!.click();
    expect(spy).toHaveBeenCalledWith({ value: true }, false);
  });
});

// ─── DateInput ────────────────────────────────────────────────────────────────

describe('DateInput', () => {
  it('renders a text-based custom date input', () => {
    const { el } = mount(new DateInput('d', { value: '2025-06-01' }));
    expect(el.querySelector('input')?.type).toBe('text');
  });

  it('renders with formatted date value', () => {
    const { el } = mount(new DateInput('d', { value: '2025-06-01' }));
    expect(el.querySelector<HTMLInputElement>('input')!.value).toBe('2025-06-01');
  });
});
