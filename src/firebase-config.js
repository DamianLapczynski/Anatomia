// Konfiguracja projektu Firebase (Konsola Firebase → Ustawienia projektu → Twoje aplikacje → Konfiguracja SDK).
// Te wartości są publiczne z założenia – dostęp do danych chronią reguły Firestore (firestore.rules), nie klucz.
// Dopóki config jest pusty, aplikacja działa normalnie, a postęp zapisuje się tylko w przeglądarce.
export const firebaseConfig = null;
/* przykład:
export const firebaseConfig = {
  apiKey: '…', authDomain: 'twoj-projekt.firebaseapp.com', projectId: 'twoj-projekt',
  storageBucket: 'twoj-projekt.firebasestorage.app', messagingSenderId: '…', appId: '…',
};
*/
