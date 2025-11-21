# Modello Dati Atlas CRM Headless

## Struttura delle Entità

### 1. Contact (ex Lead)

Rappresenta un contatto/persona nel CRM.

**Campi:**

- `name` (string, required) - Nome del contatto
- `email` (email, required) - Email del contatto
- `phone` (string, optional) - Numero di telefono
- `source` (string, optional) - Fonte del contatto (dictionary: `contact_source`)
- `role` (string, optional) - Ruolo del contatto (dictionary: `contact_role`)
- `status` (string, optional) - Stato del contatto (dictionary: `contact_status`)
- `labels` (string[], optional, multiple) - Etichette assegnate al contatto (enum: `vip`, `prospect`, `customer`, `partner`, `supplier`)
- `company_id` (reference → company, optional) - Relazione con l'azienda

**Relazioni:**

- Può essere associato a una `company`
- Può avere multiple `notes`
- Può avere multiple `tasks`
- Può essere collegato a `opportunities`

### 2. Company

Rappresenta un'azienda/cliente.

**Campi:**

- `name` (string, required) - Nome dell'azienda
- `email` (email, required) - Email principale dell'azienda
- `phone` (string, optional) - Telefono principale
- `website` (url, optional) - Sito web
- `size` (string, optional) - Dimensione aziendale (dictionary: `company_size`)
- `industry` (string, optional) - Settore di appartenenza (dictionary: `company_industry`)
- `address` (text, optional) - Indirizzo completo
- `key_contact_ids` (reference[], optional, multiple) - Contatti chiave associati all’azienda

**Relazioni:**

- Può avere multiple `contacts` associati (relazione inversa)
- Può avere multiple `notes`
- Può avere multiple `tasks`
- Può essere collegata a `opportunities`

### 3. Note

Appunti e note relative a companies o contacts.

**Campi:**

- `title` (string, required) - Titolo della nota
- `content` (text, required) - Contenuto della nota
- `status` (string, required) - Stato della nota (enum: "to do", "pending", "on going", "done", "canceled", "archived"), default: "to do"
- `expiration_date_time` (datetime, required) - Data e ora di scadenza della nota
- `company_id` (reference → company, optional) - Relazione con l'azienda
- `contact_id` (reference → contact, optional) - Relazione con il contatto

**Relazioni:**

- Può essere associata a una `company` OPPURE a un `contact` (non entrambi obbligatori)

### 4. Task

Attività e compiti da svolgere.

**Campi:**

- `title` (string, required) - Titolo del task
- `description` (text, optional) - Descrizione dettagliata
- `due_date` (date, optional) - Data di scadenza
- `type` (string, optional) - Tipo di task (dictionary: `task_type`)
- `status` (string, optional) - Stato del task (dictionary: `task_status`)
- `company_id` (reference → company, optional) - Relazione con l'azienda
- `contact_id` (reference → contact, optional) - Relazione con il contatto

**Relazioni:**

- Può essere associato a una `company` e/o un `contact` (o combinazioni)
- Nota: I "leads" non sono un'entità separata - sono contatti con uno status specifico (es. "new", "pre_qualification")

### 5. Opportunity

Opportunità di vendita.

**Campi:**

- `title` (string, required) - Titolo dell'opportunità
- `value` (number, optional) - Valore dell'opportunità
- `stage` (string, optional) - Fase dell'opportunità (dictionary: `opportunity_stage`)
- `description` (text, optional) - Descrizione
- `company_id` (reference → company, optional) - Relazione con l'azienda
- `contact_id` (reference → contact, optional) - Relazione con il contatto principale

**Relazioni:**

- Associata a una `company` e un `contact`

## Tipi di Campo Supportati

Il sistema supporta diversi tipi di campo per definire le proprietà delle entità. Ogni campo può avere le seguenti proprietà:

- `name` (string, required) - Nome del campo
- `type` (FieldType, required) - Tipo del campo (vedi tipi supportati sotto)
- `required` (boolean, default: false) - Se il campo è obbligatorio
- `indexed` (boolean, default: false) - Se il campo deve essere indicizzato per ricerche/filtri
- `searchable` (boolean, default: false) - Se il campo è ricercabile tramite full-text search
- `embeddable` (boolean, default: false) - Se il campo deve essere utilizzato per semantic search
- `default` (any, optional) - Valore di default per il campo
- `validation` (object, optional) - Regole di validazione aggiuntive (es. enum, min, max)
- `reference_entity` (string, optional) - Per campi di tipo `reference`, specifica l'entità referenziata
- `multiple` (boolean, default: false) - Se `true`, il campo accetta array di valori (es. enum multipli o reference multiple)

### Tipi di Campo Disponibili

#### `string`

Campo di testo semplice, limitato in lunghezza.

**Esempio:**

```json
{
  "name": "name",
  "type": "string",
  "required": true,
  "indexed": true,
  "searchable": true
}
```

#### `text`

Campo di testo lungo, adatto per descrizioni e contenuti estesi.

**Esempio:**

```json
{
  "name": "description",
  "type": "text",
  "required": false,
  "indexed": false,
  "searchable": true,
  "embeddable": true
}
```

#### `number`

Campo numerico (intero o decimale).

**Esempio:**

```json
{
  "name": "value",
  "type": "number",
  "required": false,
  "indexed": true,
  "searchable": false
}
```

#### `boolean`

Campo booleano (true/false).

**Esempio:**

```json
{
  "name": "is_active",
  "type": "boolean",
  "required": false,
  "indexed": true,
  "searchable": false
}
```

#### `email`

Campo email con validazione automatica del formato.

**Esempio:**

```json
{
  "name": "email",
  "type": "email",
  "required": true,
  "indexed": true,
  "searchable": true
}
```

#### `url`

Campo URL con validazione automatica del formato.

**Esempio:**

```json
{
  "name": "website",
  "type": "url",
  "required": false,
  "indexed": true,
  "searchable": false
}
```

#### `date`

Campo per date senza ora. Formato: `YYYY-MM-DD` (ISO 8601 date).

**Caratteristiche:**

- **Formato**: `YYYY-MM-DD` (es. `2024-12-25`)
- **Validazione**: Pattern `^\\d{4}-\\d{2}-\\d{2}$`
- **UI**: Input HTML5 `type="date"`
- **Storage**: Stringa ISO date in MongoDB
- **Indexing**: Convertito in timestamp `int64` per Typesense

**Quando usare:**

- Date di scadenza senza ora specifica
- Date di nascita
- Date di inizio/fine periodo
- Qualsiasi campo dove l'ora non è rilevante

**Esempio:**

```json
{
  "name": "due_date",
  "type": "date",
  "required": false,
  "indexed": true,
  "searchable": false,
  "embeddable": false
}
```

**Esempio di valore:**

```json
{
  "due_date": "2024-12-25"
}
```

#### `datetime`

Campo per date con ora. Formato: ISO 8601 datetime (`YYYY-MM-DDTHH:mm:ss.sssZ` o `YYYY-MM-DDTHH:mm:ss`).

**Caratteristiche:**

- **Formato**: ISO 8601 datetime (es. `2024-12-25T14:30:00.000Z` o `2024-12-25T14:30:00`)
- **Validazione**: Formato `date-time` (ISO 8601 completo)
- **UI**: Input HTML5 `type="datetime-local"` con conversione automatica a ISO 8601
- **Storage**: Stringa ISO datetime in MongoDB
- **Indexing**: Convertito in timestamp `int64` per Typesense

**Quando usare:**

- Timestamp precisi con ora
- Scadenze con ora specifica
- Eventi schedulati
- Log di attività con timestamp
- Qualsiasi campo dove l'ora è importante

**Esempio:**

```json
{
  "name": "expiration_date_time",
  "type": "datetime",
  "required": true,
  "indexed": true,
  "searchable": false,
  "embeddable": false
}
```

**Esempio di valore:**

```json
{
  "expiration_date_time": "2024-12-25T14:30:00.000Z"
}
```

**Nota sulla conversione UI:**
Il campo `datetime` viene visualizzato come `datetime-local` nell'interfaccia utente, che utilizza il formato `YYYY-MM-DDTHH:mm` (senza timezone). Il sistema converte automaticamente questo valore in formato ISO 8601 completo (con timezone) quando viene salvato.

#### `json`

Campo per dati JSON strutturati.

**Esempio:**

```json
{
  "name": "metadata",
  "type": "json",
  "required": false,
  "indexed": false,
  "searchable": false
}
```

#### `reference`

Campo di riferimento a un'altra entità. Richiede `reference_entity` per specificare l'entità target.

**Esempio:**

```json
{
  "name": "company_id",
  "type": "reference",
  "required": false,
  "indexed": true,
  "searchable": false,
  "embeddable": false,
  "reference_entity": "company"
}
```

### Confronto tra `date` e `datetime`

| Caratteristica  | `date`                    | `datetime`                 |
| --------------- | ------------------------- | -------------------------- |
| **Formato**     | `YYYY-MM-DD`              | `YYYY-MM-DDTHH:mm:ss.sssZ` |
| **Include ora** | ❌ No                     | ✅ Sì                      |
| **UI Input**    | `type="date"`             | `type="datetime-local"`    |
| **Use case**    | Scadenze, date di nascita | Timestamp precisi, eventi  |
| **Esempio**     | `2024-12-25`              | `2024-12-25T14:30:00.000Z` |

### Validazione con Enum

Per campi di tipo `string`, puoi definire valori consentiti usando `validation.enum`:

```json
{
  "name": "status",
  "type": "string",
  "required": true,
  "indexed": true,
  "searchable": false,
  "embeddable": false,
  "default": "to do",
  "validation": {
    "enum": ["to do", "pending", "on going", "done", "canceled", "archived"]
  }
}
```

### Valori di Default

Puoi definire valori di default per qualsiasi tipo di campo:

```json
{
  "name": "status",
  "type": "string",
  "required": true,
  "default": "to do"
}
```

Per campi `date` e `datetime`, il default può essere una stringa nel formato appropriato:

```json
{
  "name": "created_at",
  "type": "datetime",
  "required": true,
  "default": "2024-01-01T00:00:00.000Z"
}
```

## Dizionari (Dictionaries)

### contact_source

- website, referral, social_media, email_campaign, trade_show, cold_call, partner, other

### contact_role

- decision_maker, influencer, end_user, technical_contact, financial_contact, executive, manager, other

### contact_status

- new, contacted, qualified, converted, lost, nurturing

### company_size

- startup (1-10), small (11-50), medium (51-200), large (201-1000), enterprise (1000+)

### company_industry

- technology, finance, healthcare, retail, manufacturing, consulting, education, real_estate, hospitality, other

### task_type

- call, email, meeting, follow_up, proposal, demo, quote, contract, other

### task_status

- not_started, in_progress, completed, cancelled, deferred

### opportunity_stage

- prospecting, qualification, proposal, negotiation, closed_won, closed_lost

## Esempi di Utilizzo

### Creare un Company

```json
POST /api/demo/sales/company
{
  "name": "Acme Corporation",
  "email": "info@acme.com",
  "phone": "+1-555-0123",
  "website": "https://acme.com",
  "size": "medium",
  "industry": "technology",
  "address": "123 Main St, San Francisco, CA 94105"
}
```

### Creare un Contact associato a Company

```json
POST /api/demo/sales/contact
{
  "name": "John Doe",
  "email": "john.doe@acme.com",
  "phone": "+1-555-0124",
  "source": "website",
  "role": "decision_maker",
  "status": "qualified",
  "company_id": "<company_id_dalla_risposta_precedente>"
}
```

### Creare una Note per un Contact

```json
POST /api/demo/sales/note
{
  "title": "Prima chiamata",
  "content": "Contatto interessato alla soluzione enterprise. Budget approvato.",
  "status": "done",
  "expiration_date_time": "2024-12-31T23:59:59.000Z",
  "contact_id": "<contact_id>"
}
```

### Creare un Task per una Company

```json
POST /api/demo/sales/task
{
  "title": "Inviare proposta commerciale",
  "description": "Preparare e inviare proposta per licenza enterprise",
  "due_date": "2024-12-15",
  "type": "proposal",
  "status": "not_started",
  "company_id": "<company_id>",
  "contact_id": "<contact_id>"
}
```

## Query con Relazioni

Per cercare contacts di una specifica company:

```json
POST /api/demo/sales/search/text
{
  "q": "",
  "entity": "contact",
  "filter_by": "company_id:<company_id>",
  "per_page": 50
}
```

Per cercare tasks in scadenza:

```json
POST /api/demo/sales/search/text
{
  "q": "",
  "entity": "task",
  "filter_by": "status:not_started AND due_date:[2024-01-01 TO 2024-12-31]",
  "per_page": 20
}
```
