import { css } from "lit";

export const dialogStyles = css`
  .template-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .template-dialog-card {
    background: var(--card-background-color, #fff);
    border-radius: 16px;
    padding: 24px;
    min-width: 320px;
    max-width: 440px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  }

  .template-dialog-card h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }

  .template-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .configuration-name-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    font-size: 15px;
    box-sizing: border-box;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color, #212121);
  }

  .configuration-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }

  .configuration-card {
    position: relative;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.15s;
  }

  .configuration-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .configuration-card:focus-visible,
  .configuration-card-delete:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 2px;
  }

  .configuration-card-thumbnail {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 8px;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .configuration-card-thumbnail svg {
    width: 100%;
    height: 100%;
  }

  .configuration-card-info {
    padding: 6px 8px;
  }

  .configuration-card-name {
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .configuration-card-size {
    font-size: 10px;
    color: var(--secondary-text-color, #757575);
  }

  .configuration-card-delete {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.4);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    z-index: 1;
  }

  .configuration-card-delete:hover {
    background: var(--error-color, #f44336);
  }

  .configuration-card-delete ha-icon {
    --mdc-icon-size: 14px;
  }
`;

export const buttonStyles = css`
  .wizard-btn {
    padding: 10px 24px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
  }

  .wizard-btn-primary {
    background: var(--primary-color, #03a9f4);
    color: #fff;
  }

  .wizard-btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .wizard-btn-back {
    background: transparent;
    color: var(--secondary-text-color, #757575);
  }
`;

export const settingStyles = css`
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .setting-group {
    background: var(--card-background-color, #fff);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
  }

  .setting-group h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--primary-text-color, #212121);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    padding: 8px 0;
    gap: 4px;
    border-bottom: 1px solid var(--divider-color, #f0f0f0);
  }

  .setting-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .setting-row label:not(.toggle-switch) {
    font-size: 14px;
    color: var(--primary-text-color, #212121);
    flex: 1;
    min-width: 120px;
  }

  .setting-input-unit {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    flex: 1;
    min-width: 0;
    justify-content: flex-end;
  }

  .setting-range {
    flex: 1;
    min-width: 80px;
    accent-color: var(--primary-color, #03a9f4);
  }

  .setting-value {
    font-size: 14px;
    color: var(--secondary-text-color, #757575);
    font-weight: 500;
    display: inline-block;
    width: 36px;
    text-align: right;
    flex-shrink: 0;
  }

  .setting-unit {
    display: inline-block;
    width: 24px;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    flex-shrink: 0;
  }
`;

export const toggleStyles = css`
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 40px;
    min-width: 40px;
    max-width: 40px;
    height: 22px;
    flex: 0 0 40px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background-color: var(--divider-color, #ccc);
    border-radius: 22px;
    transition: background-color 0.2s;
  }

  .toggle-slider::before {
    content: "";
    position: absolute;
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .toggle-switch input:checked + .toggle-slider {
    background-color: var(--primary-color, #03a9f4);
  }

  .toggle-switch input:checked + .toggle-slider::before {
    transform: translateX(18px);
  }
`;

/** Item-row + remove-button styling shared by the zone and furniture sidebars. */
export const sidebarRowStyles = css`
  .sidebar-item-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sidebar-remove-btn {
    background: none;
    border: none;
    color: var(--secondary-text-color, #757575);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
  }

  .sidebar-remove-btn:hover {
    color: var(--error-color, #f44336);
  }
`;

export const headerStyles = css`
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 20px;
    font-weight: 500;
    margin-bottom: 16px;
    text-align: center;
  }

  .panel-header ha-select {
    --mdc-typography-subtitle1-font-size: 16px;
    --mdc-typography-subtitle1-font-weight: 500;
    min-width: 200px;
  }
`;
