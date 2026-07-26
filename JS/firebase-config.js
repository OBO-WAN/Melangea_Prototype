const firebaseConfig = {
  apiKey: "AIzaSyDukA-CZ3eJneTOajslMoDx-E8rWbFkrxw",
  authDomain: "newsletter-35ff2.firebaseapp.com",
  projectId: "newsletter-35ff2",
  storageBucket: "newsletter-35ff2.firebasestorage.app",
  messagingSenderId: "649210069998",
  appId: "1:649210069998:web:e63de8aa2e76b60ffe84ff",
};

const recaptchaEnterpriseSiteKey = "6Lci5WUtAAAAAAIRK7JE9XEeByacGATn2wJPxLAm";

let servicesPromise;

export function getFirestoreServices() {
  if (!servicesPromise) {
    servicesPromise = Promise.all([
      import("https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.12.1/firebase-app-check.js"),
      import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"),
    ]).then(([firebaseApp, appCheck, firestore]) => {
      const app = firebaseApp.initializeApp(firebaseConfig);

      appCheck.initializeAppCheck(app, {
        provider: new appCheck.ReCaptchaEnterpriseProvider(recaptchaEnterpriseSiteKey),
        isTokenAutoRefreshEnabled: true,
      });

      return {
        db: firestore.getFirestore(app),
        addDoc: firestore.addDoc,
        collection: firestore.collection,
        serverTimestamp: firestore.serverTimestamp,
      };
    });
  }

  return servicesPromise;
}
