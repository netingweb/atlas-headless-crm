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

**Relazioni:**

- Può avere multiple `contacts` associati (relazione inversa)
- Può avere multiple `notes`
- Può avere multiple `tasks`
- Può essere collegata a `opportunities`

### 3. Note

Appunti e note relative a companies o contacts.

**Campi:**

- `title` (string, optional) - Titolo della nota
- `content` (text, required) - Contenuto della nota
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
