# Comandi per Fermare e Resettare Docker

## Metodo 1: Reset Completo (Consigliato)

```bash
# 1. Ferma Docker Desktop completamente
pkill -9 -f "Docker Desktop"
pkill -9 -f "com.docker.backend"

# 2. Attendi 10 secondi
sleep 10

# 3. Resetta il contesto Docker
docker context use default 2>/dev/null || true
docker context use desktop-linux 2>/dev/null || true

# 4. Riavvia Docker Desktop
open -a Docker

# 5. Attendi che Docker sia pronto (1-2 minuti)
# Controlla l'icona nella menu bar - deve diventare verde

# 6. Verifica che Docker funzioni
docker ps
docker info
```

## Metodo 2: Usa lo Script Automatico

```bash
# Esegui lo script di reset automatico
./scripts/reset-docker.sh
```

## Metodo 3: Reset Manuale da Menu Bar

1. Clicca sull'icona Docker nella menu bar (macOS)
2. Seleziona "Quit Docker Desktop"
3. Attendi 10 secondi
4. Apri Docker Desktop dall'Applicazioni
5. Attendi che l'icona diventi verde (1-2 minuti)

## Verifica Stato Docker

```bash
# Verifica se Docker Desktop è in esecuzione
ps aux | grep -i "docker desktop" | grep -v grep

# Verifica se il daemon Docker risponde
docker info

# Verifica i container in esecuzione
docker ps

# Verifica il contesto Docker attivo
docker context ls
```

## Risoluzione Problemi Comuni

### Problema: "Cannot connect to Docker daemon"

```bash
# 1. Ferma Docker
pkill -9 -f "Docker Desktop"

# 2. Attendi
sleep 10

# 3. Riavvia Docker
open -a Docker

# 4. Attendi 60 secondi e verifica
sleep 60
docker ps
```

### Problema: "ECONNREFUSED backend.sock"

```bash
# 1. Ferma Docker completamente
pkill -9 -f "Docker Desktop"
pkill -9 -f "com.docker"

# 2. Rimuovi il socket (sarà ricreato)
rm -f ~/.docker/run/docker.sock 2>/dev/null || true

# 3. Attendi
sleep 10

# 4. Riavvia Docker
open -a Docker

# 5. Attendi e verifica
sleep 60
docker ps
```

### Problema: Docker Compose non funziona

```bash
# Verifica quale versione di docker-compose hai
docker-compose version || docker compose version

# Se usa docker compose (v2), usa:
docker compose ps

# Se usa docker-compose (v1), usa:
docker-compose ps
```

## Comandi Utili

```bash
# Lista tutti i container (anche fermati)
docker ps -a

# Ferma tutti i container
docker stop $(docker ps -q)

# Rimuovi tutti i container fermati
docker rm $(docker ps -aq)

# Rimuovi tutte le immagini non utilizzate
docker image prune -a

# Reset completo di Docker (ATTENZIONE: rimuove tutto)
docker system prune -a --volumes
```




