// Production settings (ng build). Set apiUrl to where the backend is deployed.
export const environment = {
  production: true,
  apiUrl: `${location.protocol}//${location.hostname}:3000`,
  showDemoAccounts: false,
};
