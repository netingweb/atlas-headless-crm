# Postman Collection - Atlas CRM Headless API

Collection completa per testare tutti gli endpoint dell'API Atlas CRM Headless.

## Importazione

1. Apri Postman
2. Clicca su **Import**
3. Seleziona i file:
   - `CRM-Atlas.postman_collection.json`
   - `CRM-Atlas.postman_environment.json`
4. Seleziona l'ambiente "Atlas CRM Headless - Local"

## Setup Iniziale

1. **Seleziona l'ambiente**: "Atlas CRM Headless - Local" nel dropdown in alto a destra
2. **Esegui il Login**: Vai in "Authentication" → "Login"
   - Il token verrà salvato automaticamente nella variabile `auth_token`
3. **Verifica le variabili**: Assicurati che `base_url` sia `http://localhost:3000`

## Variabili d'Ambiente

- `base_url` - URL base dell'API (default: http://localhost:3000)
- `tenant_id` - ID del tenant (default: demo)
- `unit_id` - ID dell'unità (default: sales)
- `auth_token` - Token JWT (salvato automaticamente dopo login)
- `lead_id` - ID di un lead (da impostare manualmente dopo creazione)
- `opportunity_id` - ID di un'opportunità (da impostare manualmente dopo creazione)

## Ordine Consigliato di Test

### 1. Health Check

- Health Check
- Readiness Check
- Liveness Check

### 2. Autenticazione

- Login (salva automaticamente il token)

### 3. Leads

- Create Lead
- List All Leads
- Get Lead by ID (usa l'ID dalla risposta di Create)
- Update Lead
- Delete Lead

### 4. Opportunities

- Create Opportunity
- List All Opportunities
- Get Opportunity by ID
- Update Opportunity
- Delete Opportunity

### 5. Ricerca

- Text Search - Leads
- Text Search - Opportunities
- Semantic Search - Leads (richiede API key OpenAI/Jina)
- Semantic Search - Opportunities

## Dati di Test

### Lead di Esempio

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "company": "Acme Corporation",
  "status": "new",
  "notes": "Interested in our enterprise solution"
}
```

### Opportunity di Esempio

```json
{
  "title": "Enterprise License Deal",
  "value": 50000,
  "stage": "proposal",
  "description": "Large enterprise customer interested in annual license"
}
```

## Script Automatici

### Pre-request Script (opzionale)

Puoi aggiungere questo script nelle impostazioni della collection per auto-login:

```javascript
// Auto-login se il token non è presente o è scaduto
if (!pm.environment.get('auth_token')) {
  pm.sendRequest(
    {
      url: pm.environment.get('base_url') + '/api/auth/login',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          tenant_id: pm.environment.get('tenant_id'),
          email: pm.environment.get('admin_email'),
          password: pm.environment.get('admin_password'),
        }),
      },
    },
    function (err, res) {
      if (!err && res.code === 200) {
        const jsonData = res.json();
        pm.environment.set('auth_token', jsonData.token);
      }
    }
  );
}
```

## Troubleshooting

### Token non salvato

- Verifica che lo script di test nel Login sia presente
- Controlla la console di Postman per errori

### 401 Unauthorized

- Esegui di nuovo il Login per ottenere un nuovo token
- Verifica che il token sia presente nella variabile `auth_token`

### 404 Not Found

- Verifica che l'API sia in esecuzione su `http://localhost:3000`
- Controlla che il tenant e unit siano corretti

### 400 Bad Request

- Verifica che i dati JSON siano validi
- Controlla che tutti i campi required siano presenti
