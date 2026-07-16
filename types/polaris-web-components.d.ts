import type * as React from "react";

type PolarisElementProps = React.HTMLAttributes<HTMLElement> & Record<string, unknown>;

// React 19 moved JSX.IntrinsicElements to live inside the `React` namespace
// itself (React.JSX.IntrinsicElements) — @types/react/jsx-runtime.d.ts's own
// IntrinsicElements just extends that. This file has top-level import/export
// (making it a module, not an ambient script), so `declare namespace React`
// alone stays module-local and never merges with the real ambient `React`
// namespace — it must be wrapped in `declare global` to actually augment it.
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "s-app-nav": PolarisElementProps;
        "s-link": PolarisElementProps;
        "s-page": PolarisElementProps;
        "s-section": PolarisElementProps;
        "s-stack": PolarisElementProps;
        "s-box": PolarisElementProps;
        "s-banner": PolarisElementProps;
        "s-paragraph": PolarisElementProps;
        "s-spinner": PolarisElementProps;
        "s-text-field": PolarisElementProps;
        "s-text-area": PolarisElementProps;
        "s-number-field": PolarisElementProps;
        "s-color-field": PolarisElementProps;
        "s-url-field": PolarisElementProps;
        "s-email-field": PolarisElementProps;
        "s-button": PolarisElementProps;
        "s-button-group": PolarisElementProps;
        "s-heading": PolarisElementProps;
        "s-text": PolarisElementProps;
        "s-thumbnail": PolarisElementProps;
        "s-divider": PolarisElementProps;
        "s-checkbox": PolarisElementProps;
        "s-select": PolarisElementProps;
        "s-option": PolarisElementProps;
        "s-tabs": PolarisElementProps;
        "s-tab-list": PolarisElementProps;
        "s-tab": PolarisElementProps;
        "s-tab-panel": PolarisElementProps;
        "s-table": PolarisElementProps;
        "s-table-header-row": PolarisElementProps;
        "s-table-header": PolarisElementProps;
        "s-table-body": PolarisElementProps;
        "s-table-row": PolarisElementProps;
        "s-table-cell": PolarisElementProps;
        "s-badge": PolarisElementProps;
        "s-grid": PolarisElementProps;
        "s-grid-item": PolarisElementProps;
        "s-clickable": PolarisElementProps;
        "s-popover": PolarisElementProps;
        "s-choice-list": PolarisElementProps;
        "s-choice": PolarisElementProps;
        "s-image": PolarisElementProps;
        "s-unordered-list": PolarisElementProps;
        "s-ordered-list": PolarisElementProps;
        "s-list-item": PolarisElementProps;
        "s-skeleton-paragraph": PolarisElementProps;
      }
    }
  }
}

export {};
