import { css, html, type TemplateResult } from "lit";

export const checkRowStyles = css`
  .check-row {
    display: flex;
    align-items: center;
    gap: var(--epp-space-2, 8px);
    min-height: var(--epp-control-height, 40px);
  }

  .check-row-label {
    color: var(--epp-text, var(--primary-text-color, #212121));
    font-size: var(--epp-font-base, 14px);
    cursor: pointer;
    user-select: none;
  }
`;

export interface CheckRowOptions {
	label: string;
	checked: boolean;
	onToggle: (checked: boolean) => void;
	className?: string;
}

/**
 * An `ha-checkbox` with a clickable label. `ha-formfield` is gone from HA
 * 2026.11. The label stays a `span`: a `<label>` around a form-associated
 * checkbox would toggle it twice.
 */
export function renderCheckRow({
	label,
	checked,
	onToggle,
	className = "",
}: CheckRowOptions): TemplateResult {
	return html`<div class="check-row ${className}">
    <ha-checkbox
      aria-label=${label}
      .checked=${checked}
      @change=${(e: Event) =>
				onToggle((e.currentTarget as HTMLInputElement).checked)}
    ></ha-checkbox>
    <span class="check-row-label" @click=${() => onToggle(!checked)}
      >${label}</span
    >
  </div>`;
}
