# Git basic instructions

## CLONE FROM SCRATCH

```bash
git clone git@github.com:gavesako/PrateleDhammy.git
```

## PUSH AFTER EDITS

*Eseguire i comandi dalla cartella radice del progetto:*

```bash
git add .
```

```bash
git commit -m "commit message"
```

```bash
git push
```

## PULL LATEST UPDATES

```bash
git pull
```

# Struttura del progetto

```
index.html             pagina unica dell'app (struttura HTML)
css/style.css          stili
js/data.js             dati: elenco testi, gallerie, link, versi del Dhammapada
js/app.js              logica dell'app
texts/*.html           i testi, caricati quando si aprono
img/                   immagini
fonts/                 font (inclusi nel progetto, funzionano offline)
icons/                 icone dell'app
manifest.webmanifest   nome, icona e colori dell'app installata
sw.js                  service worker: uso offline
tools/make-icons.py    genera le icone da un'immagine
```

## Provare in locale

Il doppio clic su `index.html` NON funziona (il browser blocca il caricamento dei testi da `file://`).
Dalla cartella del progetto:

```bash
python3 -m http.server 8000
```

poi aprire <http://localhost:8000>.

## Pubblicare su GitHub Pages (una volta sola)

1. Repository pubblico (Settings → General → Change visibility).
2. Settings → Pages → Source: *Deploy from a branch*, Branch: `main`, cartella `/ (root)` → Save.
3. Dopo 1–2 minuti il sito è su <https://gavesako.github.io/PrateleDhammy/>.

Da lì in poi basta `git push`: il sito si aggiorna in circa un minuto.

## Installare l'app sul telefono

- **Android (Chrome):** aprire il sito → "Installa app" (o menu ⋮ → "Aggiungi a schermata Home").
- **iPhone (Safari):** aprire il sito → Condividi → "Aggiungi alla schermata Home".

## Offline e aggiornamenti

- L'interfaccia viene salvata al primo avvio; ogni testo viene salvato la prima volta che si apre e resta leggibile senza connessione.
- Quando si modifica un testo, CSS o JS e si fa `git push`, i telefoni ricevono la nuova versione al successivo avvio (la vedono al secondo avvio).
- Se si aggiungono/rinominano file nell'elenco `SHELL` di `sw.js`, aumentare `VERSION` in `sw.js` (es. `"v2"`).

## Cambiare l'icona

```bash
python3 tools/make-icons.py percorso/immagine.png
```

L'icona attuale è generata da `icons/source/BuddhaRupa.png`.

Immagine quadrata, almeno 512×512 px. Un PNG con sfondo trasparente (logo) viene messo su sfondo verde con un margine; una foto riempie tutta l'icona. Serve Pillow (`python3 -m pip install Pillow`).
