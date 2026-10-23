import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Service-account keys are usually stored with escaped newlines in env vars.
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  // Public origin of the admin panel, used to build absolute notification links.
  adminPanelUrl: process.env.ADMIN_PANEL_URL,
}));
