// Development settings (ng serve)
export const environment = {
  production: false,
  // The API runs on the same machine as the site, port 3000. Using the page's hostname
  // means it also works when you open the site from a phone on the same Wi-Fi.
  apiUrl: `${location.protocol}//${location.hostname}:3000`,
  // Shows the one-tap demo account buttons on the login page
  showDemoAccounts: true,
};
