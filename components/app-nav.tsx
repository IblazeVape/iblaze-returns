// components/app-nav.tsx

/**
 * Registers the app's sidebar navigation in Shopify admin. `<s-app-nav>`
 * renders no visible UI of its own — it must be present in every page's DOM
 * (including loading/error states) for Shopify to keep showing "Settings"
 * and "Dashboard" as sibling entries under the app's name in the sidebar.
 */
export function AppNav() {
  return (
    <s-app-nav>
      <s-link href="/app">Settings</s-link>
      <s-link href="/app/returns">Dashboard</s-link>
    </s-app-nav>
  );
}
