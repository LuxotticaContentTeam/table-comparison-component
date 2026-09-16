# Handoff — table-comparison-component

Documento di ripresa lavori. Il **README.md** è la guida al progetto (comandi,
schema JSON, deploy passo passo): questo file è complementare e contiene quello
che il README non dice — le decisioni prese in conversazione, cosa è stato
provato e scartato, e le trappole già pagate una volta.

Ultimo aggiornamento: 17 settembre 2026 (seconda sessione).

---

## 1. Stato

| | |
| --- | --- |
| Nome | `table-comparison-component` — il typo `tabel` è stato corretto ovunque, repo GitHub compresa |
| Branch | `develop`, pushato. Su `master` c'è solo l'Initial commit |
| Commit | "Build the product comparison table module" — **uno solo**, come richiesto |
| Build | verde. `VARIANT=SGH npm run build` produce `dist/fragment.html` (~8 KB) |
| Versione | `0.0.1` |
| Brand | solo `SGH` in `projectConfig.json` |
| Asset | `https://media.sunglasshut.com/table-comparison-component/` — icone in `img/SGH/` |

Il modulo è **funzionalmente e visivamente completo** e non ha più segnaposto di
configurazione: dopo il build non sopravvive nessun `TODO_`, nessun `[PATH]`,
nessun token non sostituito in `dist/` o `release/`. Manca solo **un dato**: i
codici prodotto veri. Vedi [§6](#6-cosa-manca).

Se ci sono modifiche nuove: la regola è **un commit solo**, quindi si fa
`git commit --amend`, non un secondo commit. Il branch è già sul remote, quindi
dopo un amend serve `git push --force-with-lease`.

---

## 2. Cosa fa il modulo

Tabella di comparazione fra 2 o più prodotti, per landing page, generica su
brand e numero di prodotti.

- **Desktop** (≥1025px): una colonna per prodotto. N prodotti nel JSON → N
  colonne. Zero codice da toccare.
- **Compatto** (<1025px): sempre 2 colonne. Con 3+ prodotti compare sopra ogni
  colonna un selettore che permette di scambiare il prodotto.
- **Toggle "Only show differences"**: presente **solo** con esattamente 2
  prodotti. Nasconde le righe marcate `hideWhenOnlyDifferences` nel JSON.
- **Lazy**: CSS e JSON partono solo quando la sezione entra in viewport.
- Prezzo, immagine e link PDP arrivano dal sito, non dal JSON.

Output identico per forma a `4-card-section-module`: `fragment.html` con il
solo CSS critico + uno `<script src>`; il bundle si tira dietro CSS completo e
JSON dall'asset host.

---

## 3. Come riprendere

```bash
cd /Users/tommo/Sites/table-comparison-component
git branch --show-current          # deve dire: develop
npm ci                             # se node_modules non c'è

# sviluppo con prezzi reali: servono DUE processi
npm run proxy                      # CORS proxy su :8080 — senza, niente prezzi in locale
VARIANT=SGH LANGUAGE=en-us npm run dev   # BrowserSync su :347

# build di produzione
VARIANT=SGH npm run build
VARIANT=SGH RELEASE=yes npm run build    # scrive anche release/SGH/0.0.1/
```

Il proxy serve perché in locale non esiste il dominio del negozio: il modulo
passa da `http://localhost:8080/https://stage.sunglasshut.com/...` usando
`comparison.api.devOrigin` nel JSON. In produzione la chiamata è relativa e
same-origin, il proxy non c'entra nulla.

---

## 4. Mappa dei file

### Scritti per questo modulo

| File | Cosa fa |
| --- | --- |
| `src/js/contents.js` | Orchestratore. Svuota lo skeleton e costruisce intro, header prodotti, toggle, righe. Applica i dati prodotto quando arrivano. |
| `src/js/modules/comparisonState.js` | Stato: quali prodotti sono a schermo, filtro attivo, device. Espone `columns`, `visibleRows`, `available`, `select()`, `toggleOnlyDifferences()`, `setDevice()`. Non conosce il DOM. |
| `src/js/modules/productApi.js` | Prezzo, link PDP, packshot dal negozio. Contiene la regola sul prezzo (§5.2) e il fallback UPC→productId. |
| `src/js/modules/productSelector.js` | Il selettore compatto: listbox custom con trigger (eyebrow + nome + chevron), tastiera, click esterno. |
| `src/scss/components/_comparison-table.scss` | Layout e stile condivisi. Una sola griglia CSS. |
| `src/scss/variants/SGH/_variables.scss` | **Tutti** i token di design SGH. Un altro brand = una copia di questo file. |
| `src/scss/critical.scss` | Solo geometria, finisce inlined dentro `fragment.html`. |
| `src/views/main/main.pug` | Skeleton generico (2 colonne × 5 righe). |
| `src/json/variants/SGH/json.json` | Contenuti: titoli, righe, prodotti, celle. |
| `src/static/images/SGH/badge-photo.svg` | Icona del badge "CAMERA + AUDIO", esportata da Figma. |
| `src/static/images/SGH/chevron-down.svg` | Chevron del selettore, esportata da Figma. |
| `src/views/main/SGH/live/live.html` | Tag script della pagina di preview. Scritto con i token `@assetPath@` / `@buildVersion@`, non a mano. |

### Presi da `4-card-section-module` senza modifiche

`src/js/main.js`, `src/js/modules/{bootstrap,lazy,stateManager,utils,analytics}.js`,
`src/js/variants/SGH/info_store.js`, tutta la cartella `tasks/`, `gulpfile.js`,
`utils/`, i workflow `.github/`.

Modifiche ai file ereditati, tutte e tre volute:

| File | Cosa è cambiato e perché |
| --- | --- |
| `stateManager.js` | Conserva anche `breakpoints`, non solo il `device` calcolato: il resize handler deve ricalcolare il device e gli servono le soglie. |
| `views.task.js` | `exportViews` sostituisce `@assetPath@` e `@buildVersion@` dentro `live/live.html`. Prima quel file aveva `[PATH]` / `[VERSION]` scritti a mano, da ricordarsi a ogni release — e quando non te ne ricordavi non se ne accorgeva nessuno. |
| `script.task.js` + `_config.js` | Rimossa la sostituzione `@confPath@` e la config `productionConf` / `developmentConf` che la alimentava: nessun sorgente ha mai letto quel token. Vedi §7.12. |

`main.js` non è più identico all'originale: il prefisso analytics è nostro
(§7.11).

---

## 5. Fatti verificati sul campo

Questa è la parte che costa di più riscoprire. **Non fidarsi della memoria,
questi sono stati misurati.**

### 5.1 La chiamata prodotto su Sunglass Hut

```
GET /wcs/resources/store/{storeId}/products/{productId}?langId={langId}
```

Relativa → same-origin → nessun problema di CORS. Su SGH US:
`storeId 10152`, `catalogId 20602`, `langId -1`, valuta USD. Tutti disponibili
in `window.ct_data`, che su SGH esiste ed è popolato.

**Non esiste un lookup per UPC.** Provati e falliti tutti:

| Provato | Esito |
| --- | --- |
| `/products/<upc>` | 200 ma `{}` vuoto — non dà errore, è la trappola |
| `/products/byUpc/<upc>`, `/products/upc/<upc>`, `/products?upc=` | 404 |
| `/customProductInfo/byPartNumbers/<lista>` (è quello che usa persol.com) | 404, non deployato su SGH |
| `/productview/byPartNumber`, `/bySearchTerm`, `/byIds` | 404 |
| ricerca del sito per UPC | 404 |
| URL PDP con slug finto (`/us/ray-ban/xxx-<upc>`) | 404 — lo slug è significativo |

Quindi un prodotto nel JSON deve avere **`productId`** (una sola chiamata,
strada veloce) oppure **`pdpUrl`** (il modulo scarica la PDP e legge
`product-id="…"` dal markup, ~170 KB in più per prodotto).

Per ricavare un `productId` da un URL PDP:

```bash
curl -s "https://stage.sunglasshut.com/us/ray-ban/rb3548n-8053672689679" \
  | grep -oE 'product-id="[0-9]+"' | head -1
```

Gli id non hanno forma uniforme: `732332` e `3074457345618661580` sono
entrambi reali. Trattarli come stringhe opache.

### 5.2 Quale prezzo — la regola non è quella ovvia

Ogni prodotto ha **più price list** e prenderne una a caso mette un numero
plausibile e sbagliato su una pagina live. La regola, in `pickPrices()`:

1. Ignorare `RxPriceList*` — è il prezzo della montatura **con lenti da vista**,
   prodotto diverso, spesso più basso.
2. Il prezzo di listino è il `listPrice` più alto fra le rimanenti.
3. Una promozione conta **solo se la sua finestra di date è aperta adesso**.
   Una price list senza `startDate`/`endDate` **non** è una promozione.
4. Niente promo attiva → un numero solo.

Il punto 3 è quello che si sbaglia, e non è un'ipotesi: su `rb3548n` la lista
`Extended Sites Catalog Asset Store` quota 191 → 153 **con date vuote**, e la
PDP mostra $191 secco. Onorarla avrebbe pubblicizzato uno sconto del 20%
inesistente.

Regola ricavata da quattro PDP e poi confermata prevedendone una quinta:

| prodotto | il modulo rende | la PDP mostra |
| --- | --- | --- |
| `rb3548n` | `$191.00` | `$191.00` |
| `tf4214u` | `$244.50` / `$489.00` / 50% off | identico |
| `jc4011` | `$293.30` / `$419.00` / 30% off | identico |
| `ar8146` | `$270.90` / `$387.00` / 30% off | identico |

Se un giorno i prezzi non tornano più: si ri-deriva questa funzione **contro le
PDP vere**, non contro il payload da solo.

### 5.3 Prodotti di test già risolti

Utili per provare senza aspettare i codici veri.

| Nome | productId | UPC | pdpUrl (stage) |
| --- | --- | --- | --- |
| Ray-Ban Meta Wayfarer | `3074457345618661050` | `8056597988377` | `/us/ray-ban-meta-gen-1/rw4006-8056597988377` |
| Ray-Ban Meta Headliner | `3074457345618661055` | `8056597988391` | `/us/ray-ban-meta-gen-1/rw4009-8056597988391` |
| Ray-Ban Hexagonal | `732332` | `8053672689679` | `/us/ray-ban/rb3548n-8053672689679` |
| Tiffany TF4214U (50% off) | `3074457345618661580` | `8056597916660` | `/us/tiffany-co/tf4214u-8056597916660` |
| Jimmy Choo JC4011 (30% off) | `3074457345618751322` | `8056262230008` | `/us/jimmy-choo/jc4011-8056262230008` |
| Giorgio Armani AR8146 (30% off) | `3074457345618539864` | `8056597415514` | `/us/giorgio-armani/ar8146-8056597415514` |

I primi due sono quelli attualmente nel JSON, come **segnaposto** per Gen 3 e
Gen 2. Gli altri servono per provare sconti e casi con 3+ prodotti.

### 5.4 Repo di riferimento consultate

| Repo | Dove | Cosa ci ho trovato |
| --- | --- | --- |
| `4-card-section-module` | `/Users/tommo/Sites/4-card-section-module` | Toolchain, `bootstrap.js`, `info_store.js` SGH, pattern del fragment. **Fonte della pipeline.** |
| `RTR-cross-hp` | `/Users/tommo/Desktop/RTR-cross-hp` (clonata a mano) | Il pattern Oakley `searchproducts/upc/` — **non** vale per SGH. La variante SGH lì dentro non chiama nessuna API. |
| `PO_xlsv` | `/Users/tommo/Sites/PO_xlsv` | Il pattern WCS `/wcs/resources/store/{storeId}/customProductInfo/byPartNumbers/` — è da qui che è partita la pista giusta. |

`gh` non è installato su questa macchina e `LuxotticaContentTeam/RTR-cross-hp`
è privata: da API GitHub risponde 404.

---

## 6. Cosa manca

### Bloccante — uno solo

1. **Codici prodotto veri.** Il testo nel JSON è quello reale del Figma (Gen 3
   vs Gen 2) ma `productId` / `upc` / `pdpUrl` puntano a due Ray-Ban Meta di
   stage. Sostituire i due oggetti in `comparison.products`. Come si ricava un
   `productId` da un URL PDP: §5.1.

### A carico di chi pubblica, non del codice

2. **Caricare i due SVG** in `<base>/img/SGH/`. Non stanno nella cartella di
   release e non sono versionati: si caricano una volta e basta. Sono già
   pronti in `src/static/images/SGH/`.
3. **I workflow di deploy non hanno mai girato.** Servono secret
   (`ID_RSA`, `ID_RSA_PUB`, `CACHE_CLIENT_TOKEN`, `CACHE_CLIENT_SECRET`,
   `CACHE_ACCESS_TOKEN`, `CACHE_BASE_URI`) e variabili (`SOURCE_FOLDER`,
   `DEST_FOLDER_PROD`, `PROD_URL`) a livello di repo o di org. Verificare che
   esistano e che puntino dove serve prima di lanciarli.

### Scelte consapevoli, non buchi

4. **Lingue: `en-us` e `en`.** Non è un lavoro da finire prima di andare
   online. `getTrad` prova country → lang → prefisso → `en-us` → `en`, quindi un
   mercato senza copy propria rende inglese, non bianco. Aggiungere una lingua =
   aggiungere la sua chiave accanto a `en-us`, nient'altro. L'unico divieto
   resta la **stringa vuota**: i primi tre passi matchano la chiave, non il
   contenuto, quindi un `fr-ca` vuoto rende bianco invece di cadere su `fr`.
   `comparison.api.store` è l'eccezione voluta: non ricade mai sull'inglese,
   perché uno store id sbagliato è peggio di uno store id assente.
5. **Stato "off" dello switch.** Figma lo esporta solo acceso. Il colore da
   spento (`$color-switch-off`) l'ho scelto io: è l'unico valore inventato.
6. **Stato "aperto" del selettore.** Disegnato solo chiuso. La lista riusa
   bordo, raggio e tipografia del trigger.
7. **Il nome placement analytics è nostro.** `X_ProductComparisonPlacement` è
   stato scelto per leggersi bene in un report, non assegnato dal team
   analytics. Se un giorno ne assegnano uno è una riga in `main.js`; gli id dei
   singoli elementi non si spostano.

## 7. Decisioni prese, e perché

Le non ovvie, quelle che senza contesto verrebbero "corrette" per sbaglio.

1. **`cells` è un oggetto con chiave = id riga, non un array.** Un array
   posizionale obbliga a riordinare tutti i prodotti quando una riga si sposta,
   e un prodotto con una cella in meno fa slittare tutto in silenzio.
2. **`hideWhenOnlyDifferences` sta sulla riga, non sulla cella.** La riga è per
   definizione la stessa domanda posta a tutti: la risposta è una. Metterlo per
   prodotto permette stati contraddittori.
3. **Il toggle esiste solo con 2 prodotti.** Non è solo quello che mostra il
   design: con 3 prodotti una riga può essere uguale per A e B e diversa per C,
   quindi un flag scritto una volta per riga sarebbe sbagliato per almeno una
   coppia. È la tua osservazione, ed è corretta.
4. **Il selettore è una listbox, non un `<select>`.** Un select nativo deve
   portarsi dentro il proprio valore selezionato, altrimenti non ha niente da
   mostrare — quindi il prodotto in colonna finirebbe sempre nella sua stessa
   lista, contro la regola. Con il prodotto corrente come etichetta del trigger,
   la lista contiene esattamente i prodotti non in colonna.
5. **La lista delle opzioni è una sola, derivata a ogni render.** Non una per
   tendina. È per questo che cambiando una colonna cambiano **entrambe**: due
   liste memorizzate potrebbero divergere, una derivata no.
6. **Lo skeleton è generico e NON è generato dal JSON.** Se lo fosse,
   aggiungere un prodotto cambierebbe l'HTML e costringerebbe a ri-incollare il
   fragment in CoreMedia. Così il JSON resta l'unico file da ricaricare.
7. **Il CSS è SGH a ogni numero di prodotti.** Dei file LC ho preso solo la
   struttura che il Figma SGH non disegna. Nessun valore LC spedisce.
8. **Il tablet va col layout compatto.** Il design copre 1440 e 375. A 768px
   quattro colonne darebbero ~180px l'una, e il breakpoint del CSS
   (`max-width: $tab-max`) traccia già la linea nello stesso punto.
9. **Le celle accettano una stringa o un array di righe.** L'array è il caso
   comune: ogni riga diventa un `<p>`, così il testo va a capo dove è stato
   scritto e non dove finisce la colonna.
10. **`ct_data` si legge solo per `storeId`/`langID`, mai per la lingua.** Per
    la lingua vale `<html lang>`, che è server-rendered. `ct_data` arriva
    secondi dopo su cold load.
11. **Il prefisso analytics non è quello del boilerplate.**
    `X_@projectName@Placement` risolve nel nome della repo: avrebbe messo
    `table-comparison-component` — trattini, e la parola "component" — in ogni
    riga del report. Nessun nome era stato assegnato, quindi la regola adottata
    è che l'id si legga per quello che è: `X_ProductComparisonPlacement`. La
    metà prodotto degli id è il `products[].id` del JSON, così una riga del
    report punta dritta a un oggetto del file di contenuto, senza tabelle di
    conversione in mezzo.
12. **`productionConf` è stata rimossa, non lasciata lì.** Il boilerplate la
    dichiarava e la sostituiva come `@confPath@`, ma nessun sorgente ha mai
    letto quel token — l'URL del JSON si costruisce da `productionAsset` come
    ogni altro URL runtime. Una config che sembra significare qualcosa e non
    significa niente costa più di una config assente: il prossimo che la trova
    ci mette mezz'ora a capire che è morta.
13. **Le icone restano relative con la cartella brand.** `SGH/chevron-down.svg`
    più `productionImage` che finisce in `img/`, invece di URL assoluti nel
    JSON. Così il valore nel JSON è identico in dev e in produzione, ed è
    l'ambiente a cambiare — e un secondo brand aggiunge la sua cartella accanto
    senza toccare niente. Gli URL assoluti restano comunque supportati
    (`isSelfContainedUrl`), che è come `4-card-section-module` punta alle
    cartelle di campagna.

---

## 8. Trappole già pagate

Costano tempo se le si ricalpesta.

| Trappola | Cosa succede | Cosa fare |
| --- | --- | --- |
| `resize_window` del browser | Dice "success" ma `innerWidth` non cambia su questa macchina | Testare il responsive dentro un **iframe** largo 390px: le media query rispondono al viewport dell'iframe |
| `innerText` su elementi fuori schermo | Torna stringa vuota — il container ha `content-visibility: auto` | Usare `textContent` per verificare il DOM |
| Object spread nei literal | `Parsing error: Unexpected token ..` → **build fallita**, exit 7 | L'eslint del boilerplate non lo accetta. Usare `Object.assign`. Lo spread di **array** invece va bene |
| Immagini controllate subito dopo il render | `naturalWidth` 0, sembrano rotte | Sono solo in caricamento. Ricontrollare dopo qualche secondo |
| Figma MCP | L'autorizzazione OAuth scade | Rifare `authenticate`, aprire il link, poi `get_design_context` |
| Caricare `get_metadata` sull'intera pagina Figma | Supera il limite di token e finisce su file | Chiedere metadata di un nodo specifico, o processare il file con `jq`/python |
| Build due volte con la stessa `version` | La seconda sovrascrive `release/SGH/0.0.1/` | Bumpare `package.json > version` prima di una release che deve sopravvivere |
| Modificare `critical.scss` e ricaricare solo gli asset | Il fragment già in CoreMedia continua a vincere | Il critical CSS è **inlined**: va ri-incollato il fragment |
| Scrivere i nomi dei token (`@assetPath@`, `@buildVersion@`) nei commenti di `live/live.html` | La sostituzione è un replace di stringa: riscrive anche la prosa, e il commento finisce nella pagina di preview con dentro l'URL | Nel commento parlarne a parole, senza scriverli |
| Controllare `naturalWidth` delle immagini a pagina appena caricata in una tab in background | Zero su tutte, sembrano rotte: sono `loading="lazy"` dentro un container `content-visibility: auto` e non partono proprio | Verificare il path con `fetch()` (status 200) e la decodifica con un `new Image()` fuori dalla pagina |
| Ricaricare la pagina di dev dopo aver cambiato `projectName` | Chrome serve la copia in cache e il vecchio id continua ad apparire | Navigare con un query param nuovo (`?cb=1`); `curl` sul dev server dice cosa viene servito davvero |

### Procedura per provare con 3+ prodotti

Il JSON reale ne ha 2. Per testare selettori e colonne multiple:

```bash
cp src/json/variants/SGH/json.json /tmp/json.real.json
# aggiungere un terzo prodotto (copiare un oggetto esistente e cambiare
# id, name, shortName, productId, upc, pdpUrl)
# ... test ...
cp /tmp/json.real.json src/json/variants/SGH/json.json   # ripristinare SEMPRE
```

---

## 9. Riferimenti Figma

| Cosa | File | Nodo |
| --- | --- | --- |
| Desktop 2 prodotti | `SGH - RB META APEROL` (`qP9YNquHyjNhP5S34X0JRJ`) | `1020:42173` |
| Mobile 2 prodotti | idem | `1020:47170` |
| Titolo desktop | idem | `1020:36519` |
| Desktop 3 prodotti (solo struttura) | `LC_RBM Aperol - Luna` (`Y9LE2pZ4Rkt2BvxxaJj8U0`) | `5720:35673` |
| Selettore compatto (solo struttura) | idem | `5720:35891` |

I flag `hideWhenOnlyDifferences` nel JSON vengono dalle annotazioni
"Don't show in differences" del designer sul nodo desktop SGH: righe nascoste =
Meta AI, Lenses, Connectivity, Water resistance, Compatible apps.

### Incongruenze nel Figma, normalizzate a favore del desktop

- Il mobile chiama **VIDEO** la riga che il desktop chiama **MEMORY**, stesso
  contenuto.
- I nomi prodotto differiscono fra i frame: "Ray-Ban | Meta Gen 3" su desktop,
  "Ray-Ban Meta Wayfarer Gen 3" su mobile.
- Il peso è "133 gr" su desktop e "133g" su mobile.

---

## 10. Cosa è già stato verificato

Da non rifare salvo regressioni.

- Tabella costruita solo dal JSON: 2 prodotti → 2 colonne; aggiunto un terzo →
  3 colonne e 3 celle per riga su desktop, senza toccare il codice.
- Prezzi, packshot e link PDP combaciano con le PDP live su 4 prodotti.
- L'API corregge anche un `pdpUrl` scritto a mano ormai obsoleto
  (`/us/ray-ban-meta/` → `/us/ray-ban-meta-gen-1/`).
- Selettori: con Gen 3 | Gen 2 a schermo ogni lista contiene **solo** Gen 2
  Optics; scegliendolo, entrambe passano a contenere solo Gen 3 e la tendina si
  chiude. Apertura, click esterno, Esc, frecce e `aria-expanded` funzionano.
- Toggle: presente solo con 2 prodotti, nasconde esattamente le 5 righe
  annotate.
- Desktop fedele a `1020:42173`. Compatto misurato in viewport da 390px fedele a
  `1020:47170`: due colonne da 171px, niente packshot, label a tutta riga
  allineata a sinistra, padding celle 8px, CTA a tutta larghezza.
- `npm run build` verde, `fragment.html` ~8 KB.

Aggiunto nella seconda sessione, dopo aver messo URL asset, id analytics e nome
progetto:

- `VARIANT=SGH RELEASE=yes npm run build` verde e **nessun segnaposto
  sopravvive** in `dist/` né in `release/`: né `TODO_`, né `[PATH]`/`[VERSION]`,
  né token non sostituiti. Il container si chiama
  `ct_cm--table-comparison-component` e il `<script src>` del fragment punta a
  `https://media.sunglasshut.com/table-comparison-component/main__0.0.1.min.js`.
- Modulo verificato contro il negozio vero via `npm run proxy`: 9 righe, 2
  colonne, `Starting from $224.00` / `$247.00`, e le due CTA sui path canonici
  `/us/ray-ban-meta-gen-1/…` che torna l'API — non su quelli obsoleti scritti
  nel JSON.
- Icone e packshot verificati con `fetch` (200) e con un `new Image()`: SVG
  16×16, packshot 1920×960. In pagina restano `complete: false` a lungo, che è
  la trappola del lazy loading in §8, non un path rotto.
- Con un terzo prodotto aggiunto in via temporanea e la pagina misurata in un
  iframe da 390px: 2 colonne su 3 prodotti, un selettore per colonna, ogni lista
  contiene solo il prodotto non a schermo, toggle assente. JSON reale
  ripristinato subito dopo.
- Analytics: eventi osservati sul `tealium_data2track` dell'iframe —
  `X_ProductComparisonPlacement_OpenProductSelector_1 | Gen3` e poi
  `X_ProductComparisonPlacement_SelectProduct_rb-hexagonal | Hexagonal`, con la
  colonna che cambia e entrambe le liste che passano a offrire Gen 3.

Difetto trovato e corretto nella stessa sessione: il trigger del selettore non
aveva `data-tracking-description` e spingeva `data_description: undefined` — il
modulo analytics protegge il valore, non elimina la chiave.
