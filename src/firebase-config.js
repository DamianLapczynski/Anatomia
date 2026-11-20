// Konfiguracja projektu Firebase (Konsola Firebase → Ustawienia projektu → Twoje aplikacje → Konfiguracja SDK).
// Te wartości są publiczne z założenia – dostęp do danych chronią reguły Firestore (firestore.rules), nie klucz.
const PROJECT = 'anatomia-3d-6b134';
/** Aplikacja działa na Firebase Hosting (anatomia-3d-6b134.web.app) – logowanie w tej samej domenie, działa też w Safari i w aplikacji z ekranu głównego. */
export const onFirebaseHosting = typeof location !== 'undefined' && (location.hostname === `${PROJECT}.web.app` || location.hostname === `${PROJECT}.firebaseapp.com`);
export const HOSTING_URL = `https://${PROJECT}.web.app/`;
export const firebaseConfig = {
  apiKey: 'AIzaSyBlpX6da1VQRDp7ilwMcGPpLTj4yRPBCBQ',
  authDomain: onFirebaseHosting ? location.hostname : `${PROJECT}.firebaseapp.com`,
  projectId: PROJECT,
  storageBucket: `${PROJECT}.firebasestorage.app`,
  messagingSenderId: '862786944462',
  appId: '1:862786944462:web:0ccb771c70641344307f9f',
};
