# Utenti Disponibili nel Sistema

## Utenti Predefiniti

### Utente Admin (Creato automaticamente)

- **Email**: `admin@demo.local`
- **Password**: `changeme`
- **Tenant**: `demo`
- **Unit**: `sales`
- **Ruolo**: `admin`
- **Scopes**: `crm:read`, `crm:write`, `crm:delete`, `workflows:manage`, `workflows:execute`
- **Permessi**: Accesso completo a tutte le funzionalità, inclusa la gestione e l'esecuzione dei workflow

Questo utente viene creato automaticamente quando esegui lo script di seed:

```bash
pnpm seed
```

## Ruoli Disponibili

Il sistema definisce 3 ruoli nel file `config/demo/permissions.json`:

### 1. Admin

- **Scopes**: `crm:read`, `crm:write`, `crm:delete`, `workflows:manage`, `workflows:execute`
- **Descrizione**: Accesso completo a tutte le operazioni CRUD e gestione completa dei workflow

### 2. Sales Manager

- **Scopes**: `crm:read`, `crm:write`
- **Descrizione**: Può leggere e modificare entità, ma non può eliminarle

### 3. Sales Rep

- **Scopes**: `crm:read`
- **Descrizione**: Può solo leggere entità, non può modificarle o eliminarle

## Creare Nuovi Utenti

### Metodo 1: Tramite API (Richiede autenticazione admin)

```bash
# Prima fai login come admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "demo",
    "email": "admin@demo.local",
    "password": "changeme"
  }'

# Usa il token per creare un nuovo utente
curl -X POST http://localhost:3000/api/auth/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tenant_id": "demo",
    "unit_id": "sales",
    "email": "manager@demo.local",
    "password": "password123",
    "roles": ["sales_manager"],
    "scopes": ["crm:read", "crm:write"]
  }'
```

### Metodo 2: Aggiornare lo script seed.ts

Puoi modificare `scripts/seed.ts` per creare utenti aggiuntivi durante il seed:

```typescript
// Aggiungi dopo la creazione dell'admin user
const salesManagerUser = {
  tenant_id: defaultTenant,
  unit_id: 'sales',
  email: 'manager@demo.local',
  passwordHash: await hashPassword('password123'),
  roles: ['sales_manager'],
  scopes: ['crm:read', 'crm:write'],
  created_at: new Date(),
  updated_at: new Date(),
};

await db
  .collection('users')
  .replaceOne({ tenant_id: defaultTenant, email: 'manager@demo.local' }, salesManagerUser, {
    upsert: true,
  });

const salesRepUser = {
  tenant_id: defaultTenant,
  unit_id: 'sales',
  email: 'rep@demo.local',
  passwordHash: await hashPassword('password123'),
  roles: ['sales_rep'],
  scopes: ['crm:read'],
  created_at: new Date(),
  updated_at: new Date(),
};

await db
  .collection('users')
  .replaceOne({ tenant_id: defaultTenant, email: 'rep@demo.local' }, salesRepUser, {
    upsert: true,
  });
```

### Metodo 3: Tramite MongoDB direttamente

```javascript
// Connetti a MongoDB
use crm_atlas

// Crea un nuovo utente
db.users.insertOne({
  tenant_id: "demo",
  unit_id: "sales",
  email: "manager@demo.local",
  passwordHash: "<hash della password>", // Usa hashPassword da @crm-atlas/auth
  roles: ["sales_manager"],
  scopes: ["crm:read", "crm:write"],
  created_at: new Date(),
  updated_at: new Date()
})
```

## Utenti di Esempio Consigliati

Per testare il sistema di permessi, si consiglia di creare:

1. **admin@demo.local** (già esistente)
   - Ruolo: admin
   - Accesso completo

2. **manager@demo.local**
   - Ruolo: sales_manager
   - Può leggere e scrivere, non può eliminare

3. **rep@demo.local**
   - Ruolo: sales_rep
   - Può solo leggere

## Verificare Utenti Esistenti

Puoi verificare gli utenti nel database MongoDB:

```bash
# Connetti a MongoDB
docker-compose exec mongo mongosh crm_atlas

# Lista tutti gli utenti
db.users.find().pretty()

# Cerca utenti per tenant
db.users.find({ tenant_id: "demo" }).pretty()

# Cerca utenti per ruolo
db.users.find({ roles: "admin" }).pretty()
```

## Note Importanti

- Le password vengono hashate usando `bcrypt` prima di essere salvate
- Gli scopes possono essere assegnati direttamente all'utente o ereditati dai ruoli
- Se un utente ha sia scopes diretti che ruoli, vengono combinati
- Il sistema verifica i permessi sia lato backend (ScopesGuard) che lato frontend (filtraggio UI)
