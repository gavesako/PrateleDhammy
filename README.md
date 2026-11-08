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

## Installare l'app sul telefono

- **Android (Chrome):** aprire il sito → "Installa app" (o menu ⋮ → "Aggiungi a schermata Home").
- **iPhone (Safari):** aprire il sito → Condividi → "Aggiungi alla schermata Home".

## Offline e aggiornamenti

- Al primo avvio l'app scarica tutti i testi (con le loro immagini e l'indice di ricerca, circa 7 MB) e li rende leggibili senza connessione. Nella pagina "Texty" compare l'avanzamento.
- L'elenco dei testi da scaricare viene da `HAS` in `js/data.js`: un testo nuovo aggiunto lì e in `texts/` viene scaricato dai telefoni al successivo avvio.
- Su iPhone l'app installata sulla schermata Home ha una memoria separata da Safari: scarica i testi al suo primo avvio.
- Non serve disinstallare l'app per aggiornarla. Dopo un `git push`:
  - interfaccia (HTML, CSS, JS): il telefono la scarica in sottofondo al primo avvio e la mostra dall'avvio successivo;
  - testi nuovi: scaricati al primo avvio successivo;
  - testi modificati: il telefono ricontrolla i testi salvati una volta al giorno (scarica solo quelli cambiati).
- Se si aggiungono/rinominano file nell'elenco `SHELL` di `sw.js`, aumentare `VERSION` in `sw.js` (es. `"v2"`).

## Cambiare l'icona

```bash
python3 tools/make-icons.py percorso/immagine.png
```

L'icona attuale è generata da `icons/source/BuddhaRupa.png`.

Immagine quadrata, almeno 512×512 px. Un PNG con sfondo trasparente (logo) viene messo su sfondo verde con un margine; una foto riempie tutta l'icona. Serve Pillow (`python3 -m pip install Pillow`).
