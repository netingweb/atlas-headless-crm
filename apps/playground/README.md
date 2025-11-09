# CRM Atlas Playground

Playground PWA client for testing and demonstrating CRM Atlas Headless CRM functionality.

## Features

- 🔐 Authentication with JWT
- 📊 Dashboard with KPI cards
- 📝 CRUD operations for all entities
- 🔍 Global search across all entities
- 🤖 AI Assistant with LangGraph integration
- ⚙️ Settings for MCP tools and AI configuration
- 📱 Progressive Web App (PWA) support

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev:playground

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Environment Variables

Create a `.env` file in the playground directory:

```env
VITE_API_URL=http://localhost:3000/api
```

## Project Structure

```
apps/playground/
├── src/
│   ├── components/     # React components
│   ├── lib/            # Utilities and API clients
│   ├── pages/          # Page components
│   ├── stores/         # Zustand stores
│   └── hooks/          # Custom React hooks
├── public/             # Static assets
└── package.json
```

## API Integration

The playground connects to the CRM Atlas API running on `http://localhost:3000` by default.

Make sure the API server is running before starting the playground:

```bash
# In the root directory
pnpm dev
```

## Technologies

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Zustand
- React Query
- React Router
- LangGraph (for AI integration)
