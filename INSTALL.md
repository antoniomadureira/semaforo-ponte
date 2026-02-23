# Manual de Instalação - Semáforo Ponte CGIU

## 1. Configuração do Firebase
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Ative o **Cloud Firestore** em modo de produção.
3. Configure as **Security Rules**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /registos_ponte/{document=**} {
         allow read: if true;
         allow write: if true; // No futuro, restringir a IP estático do CGIU
       }
     }
   }