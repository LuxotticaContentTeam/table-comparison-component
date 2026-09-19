# Handoff — table-comparison-component

Documento di ripresa lavori. Il **README.md** è la guida al progetto (comandi,
schema JSON, deploy passo passo): questo file è complementare e contiene quello
che il README non dice — le decisioni prese in conversazione, cosa è stato
provato e scartato, e le trappole già pagate una volta.

Ultimo aggiornamento: 20 settembre 2026 (quarta sessione).

---

## 1. Stato

| | |
| --- | --- |
| Nome | `table-comparison-component` — il typo `tabel` è stato corretto ovunque, repo GitHub compresa |
| Branch | `develop`, pushato. Su `master` c'è solo l'Initial commit |
| Commit | tre: il build iniziale, le otto lingue, il passaggio al servizio prodotto documentato |
| Build | verde. `VARIANT=SGH npm run build` produce `dist/fragment.html` (~8 KB) |
| Versione | `0.0.1` |
| Brand | solo `SGH` in `projectConfig.json` |
| Asset | `https://media.sunglasshut.com/table-comparison-component/` — icone in `img/SGH/` |

Il modulo è **funzionalmente e visivamente completo** e non ha più segnaposto di
configurazione: dopo il build non sopravvive nessun `TODO_`, nessun `[PATH]`,
nessun token non sostituito in `dist/` o `release/`. Manca solo **un dato**: i
codici prodotto veri. Vedi [§6](#6-cosa-manca).

La regola del commit unico è decaduta dalla seconda sessione: ora si fa un
commit per lavoro, e si pusha normalmente su `develop`.

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
GET /wcs/resources/store/{storeId}/productInfo?partNumbers={upc1,upc2,…}&langId={langId}
```

È il servizio **documentato** da SGH: "New Prod Service (2026)" in
[`LuxotticaContentTeam/product-services-doc`](https://github.com/LuxotticaContentTeam/product-services-doc)
→ `sunglasshut/product-service.md`. Relativa → same-origin → nessun problema di
CORS.

Chiave = **UPC**, tutti i prodotti in **una sola chiamata**, prezzi già risolti.

**Verificato su produzione e su stage**: `www.sunglasshut.com` e
`stage.sunglasshut.com`, store `10152`, i due UPC che il modulo spedisce → 200
su entrambe, stessa risposta, stessi prezzi `USD`, URL PDP `/us/…`. (Stage era
irraggiungibile il giorno della migrazione — da qui il dubbio, ora chiuso: il
servizio è deployato anche lì.) Questo chiude anche la domanda
sullo store id: **10152 è lo store US anche in produzione**, quindi il valore
autorato nel JSON è giusto e non serve leggerlo da `ct_data`.

Campi letti: `prices.offerPrice` / `prices.listPrice` (stringhe, convertite),
`prices.currency` (codice ISO, quello che vuole `Intl`), `pdpURL`, `images[]`
ordinate per `sequence` con il loro `alt`, `brand` + `name` come fallback del
nome.

**Lo slug del `pdpURL` è diverso da quello del vecchio endpoint** — torna
`/us/ray-ban/rw4006-…` invece di `/us/ray-ban-meta-gen-1/rw4006-…` — ma **c'è un
redirect automatico**, verificato in browser. Non è un problema e si lascia così.

#### Cosa c'era prima, e perché è sparito

Il modulo nasceva su `/wcs/resources/store/{storeId}/products/{productId}`, che
**non** è l'endpoint documentato. Era chiavato per product id, e su SGH non
esisteva nessun lookup per UPC: `/products/<upc>` rispondeva 200 con `{}` vuoto,
mentre `/products/byUpc`, `/customProductInfo/byPartNumbers` (quello di
persol.com), `/productview/byPartNumber`, `/bySearchTerm` e `/byIds` davano 404.
Da lì venivano due pezzi di codice ora eliminati:

- `resolveProductId`, che scaricava la PDP e leggeva `product-id="…"` dal
  markup — ~170 KB di HTML in più per prodotto;
- una chiamata per colonna invece di una sola.

⚠️ Nel repo dei servizi **l'endpoint giusto non era fra quelli provati**: la
pista era stata cercata a mano invece che nella documentazione. Se serve un
servizio prodotto per un altro brand, **guardare prima lì**.

La risposta contiene `catentryId`, che **è** il vecchio product id: comodo per
debuggare, non lo legge nessuno.

### 5.2 Quale prezzo — ora è quello ovvio

L'endpoint documentato torna **una coppia di numeri già risolta**:
`listPrice` è il prezzo da cui si misura, `offerPrice` è quello che si paga, e
lo sconto è semplicemente `offerPrice < listPrice`. L'unica accortezza è che
arrivano come **stringhe** (`"224.00"`), quindi `pickPrices()` le converte prima
di confrontarle o formattarle.

`currencySymbol` si ignora di proposito: il lato del simbolo e i separatori sono
affari del locale, e `Intl.NumberFormat` li sa già. Si usa `currency`, il codice
ISO.

**Non c'è il badge sconto.** L'endpoint non porta nessuna stringa tipo
"30% off", quindi una promo rende offerta + listino barrato e basta. È una
rinuncia decisa, non una dimenticanza.

#### La regola vecchia, per capire cosa si è buttato

Il vecchio endpoint tornava **cinque price list grezze** per prodotto e
bisognava ridurle a mano: ignorare `RxPriceList*` (è la montatura **con lenti da
vista**, prodotto diverso e spesso più economico), prendere il `listPrice` più
alto fra le rimanenti, e onorare una promozione **solo se la sua finestra di
date era aperta**. Quest'ultimo era il punto che si sbagliava: su `rb3548n` la
lista `Extended Sites Catalog Asset Store` quotava 191 → 153 **con date vuote**
mentre la PDP mostrava $191 secco, e onorarla avrebbe pubblicizzato uno sconto
del 20% inesistente.

Tutta quella logica è stata cancellata, non disattivata. Se un giorno i prezzi
non tornassero più con le PDP, il posto da guardare è `pickPrices()`, che ora è
lungo dieci righe.

### 5.3 Prodotti di test già risolti

Il modulo ora cerca per **UPC**: è l'unico campo che serve. `productId` resta
nel JSON come riferimento incrociato e non lo legge nessuno.

| Nome | UPC | Note |
| --- | --- | --- |
| Ray-Ban Meta Wayfarer **Gen 1** | `8056597988377` | nel JSON come segnaposto di Gen 3 |
| Ray-Ban Meta Headliner **Gen 1** | `8056597988391` | nel JSON come segnaposto di Gen 2 |
| Ray-Ban Hexagonal | `8053672689679` | |
| Tiffany TF4214U | `8056597916660` | aveva uno sconto |
| Jimmy Choo JC4011 | `8056262230008` | aveva uno sconto |
| Giorgio Armani AR8146 | `8056597415514` | aveva uno sconto |

⚠️ I due nel JSON sono **Gen 1**, non Gen 3 / Gen 2: la risposta li chiama
`Ray-Ban Meta (Gen 1) Wayfarer` e `… Headliner`, ed entrambi sono
`isOutOfStock: true`. È il motivo per cui il prezzo esce piatto (224/224 e
247/247) e non si vede nessun barrato.

Gli sconti degli ultimi tre erano misurati sul vecchio endpoint e sulle sue
price list: **da riverificare** su `productInfo` prima di usarli come casi di
prova di un barrato.

### 5.4 Repo di riferimento consultate

| Repo | Dove | Cosa ci ho trovato |
| --- | --- | --- |
| `4-card-section-module` | `/Users/tommo/Sites/4-card-section-module` | Toolchain, `bootstrap.js`, `info_store.js` SGH, pattern del fragment. **Fonte della pipeline.** |
| `RTR-cross-hp` | `/Users/tommo/Desktop/RTR-cross-hp` (clonata a mano) | Il pattern Oakley `searchproducts/upc/` — **non** vale per SGH. La variante SGH lì dentro non chiama nessuna API. |
| `PO_xlsv` | `/Users/tommo/Sites/PO_xlsv` | Il pattern WCS `/wcs/resources/store/{storeId}/customProductInfo/byPartNumbers/`. Non è deployato su SGH. |
| **`product-services-doc`** | `LuxotticaContentTeam/product-services-doc` | ⭐ **La fonte da consultare per prima.** Un file per brand con l'endpoint prodotto documentato, parametri ed esempio di risposta. `sunglasshut/product-service.md` è quello che il modulo usa adesso. Contiene anche `middle-layer.md` (manifest 3D per UPC) e le varianti di Oakley, Ray-Ban, Persol, LensCrafters, Costa, Glasses, Target Optical. |

`gh` non è installato su questa macchina: i repo privati dell'org si clonano con
`git clone git@github-lux:LuxotticaContentTeam/<repo>.git`, che funziona.

---

### 5.5 Il numero di colori non esiste come dato

Cercato, non trovato. Il servizio prodotto SGH torna `frameColor`, `lensColor` e
`localizedColorLabel` della **singola variante** che sta descrivendo, e nessun
conteggio dei sibling. Le chiavi complete della risposta sono: `active`,
`brand`, `category`, `catentryId`, `color`, `currency`, `frameColor`, `images`,
`isOutOfStock`, `lensColor`, `localizedColorLabel`, `moco`, `model`, `name`,
`pdpURL`, `prices`, `productName`, `seoCurrency`, `upc`.

Nel repo dei servizi un conteggio **esiste**, ma su un altro brand:
`availableColors` nella risposta di `/ajaxSearchDisplayView` di glasses.com. I
due path equivalenti provati su sunglasshut rispondono con l'html della
homepage, non con json:

```
/ajaxSearchDisplayView?storeId=10152&…&partNumbers=<upc>   -> 200, ma html
/AjaxPartNumberView?storeId=10152&…&partNumbers=<upc>      -> 404
```

Quindi `products[].meta` ("3 Colors") resta autorato a mano. Renderlo dinamico
non è una modifica al modulo: è trovare un servizio SGH che quel numero lo
restituisca. Vedi §6.3.

## 6. Cosa manca

### Bloccante — uno solo

1. **Codici prodotto veri.** Il testo nel JSON è quello reale del Figma (Gen 3
   vs Gen 2) ma gli UPC autorati risolvono a due Ray-Ban Meta **Gen 1**.
   Sostituirli è ora una modifica a **un campo solo**: `upc` su ciascuno dei due
   oggetti in `comparison.products`, nient'altro. `productId` e `pdpUrl` restano
   come riferimenti e non li legge nessuno.

   Dopo la sostituzione: rifare il confronto numerico di
   `_meta.valuesMatchSource` **non** serve (i valori sono copy, non prodotto),
   ma vale la pena aprire una volta le due CTA in pagina, perché il `pdpURL` lo
   decide lo storefront.

È l'unica cosa che separa il modulo da una pagina live.

### In attesa di una decisione, non di codice

2. **Niente badge sconto.** L'endpoint documentato non porta nessuna stringa
   tipo "30% off", quindi una promo rende offerta + listino barrato e basta.
   Riaverlo vuol dire trovare un altro servizio che lo restituisca.
3. **Il numero di colori è autorato.** `products[].meta` ("3 Colors") è scritto
   a mano perché il servizio prodotto SGH torna `frameColor` / `lensColor` della
   singola variante e nessun conteggio dei sibling. Renderlo dinamico vuol dire
   una seconda chiamata a un altro servizio: un `availableColors` esiste su
   `/ajaxSearchDisplayView` di glasses.com, ma l'equivalente SGH non risponde in
   json (§5.5).

### Chiuse

- **Le due SVG sono caricate.** `img/SGH/badge-photo.svg` e
  `img/SGH/chevron-down.svg` rispondono 200 su `media.sunglasshut.com`.
- **Non esiste una pipeline di deploy in uso.** I file di release si caricano a
  mano via SFTP su
  `sshacs@luxottica-media.sftp.upload.akamai.com/756788/sunglasshut/table-comparison-component/`.
  I due workflow in `.github/workflows/` restano lì inutilizzati: se un giorno
  qualcuno li lancia, prima vanno verificati secret e variabili.
- **Store id di produzione, slug del `pdpURL`, endpoint su stage, nome del
  placement analytics, colore dello switch da spento**: tutti confermati, vedi
  §5 e §7.

### Pulizia fatta

Sei cose superflue trovate girando la repo. Cinque rimosse, una lasciata apposta.

**Il bundle del variant era spedito due volte.** `main.js` importa il variant
come `@currentVariant@` e la transform aliasify lo risolve in fase di bundle,
quindi `variants/SGH/main.js` è già dentro il bundle principale.
`script.task.js` lo costruiva **anche** come bundle browserify a sé, e
`concatScripts` lo incollava al release: due copie di `info_store`, una delle
quali non referenziata da nessuno e che girava a vuoto a ogni caricamento. In
dev lo stesso file veniva iniettato come `<script>` in più. Il js spedito è
passato da **40.962 a 39.619 byte (−1.343, −3,3%)** e ora contiene
`documentElement` una volta sola invece di due.

Rimossi anche: l'export `main` a vuoto da `variants/SGH/main.js` e dal template
da cui si scaffoldano i variant nuovi; `map`, `clamp` e `isMobile` da
`utils.js`, importati da nessuno; il task `vendors` con il suo `vendor.js`
(liste vuote e `bower_components/` inesistente, quindi logava solo "No vendors
selected") insieme al cablaggio `dist_vendors` ormai inutile in `_config.js`,
`inject-css-js` e `buildEspot`; e **14 devDependencies** che nessuno richiede,
da 55 a 41.

⚠️ **Tre sono state tenute apposta**, perché un grep ingenuo non le vede:

| Pacchetto | Perché resta |
| --- | --- |
| `gulp-filter` | usato come `$.filter()` via `gulp-load-plugins` in `style.task.js` — **l'ho rimosso per errore e il build è morto** con `TypeError: $.filter is not a function` |
| `postcss` | peer dependency di `gulp-postcss` |
| `cross-env` | usato negli `scripts` di `package.json`, non in un sorgente |

La lezione: per i plugin caricati da `gulp-load-plugins` bisogna cercare la
forma **camelCase** (`gulp-svg-sprite` → `$.svgSprite()`), non il nome del
pacchetto.

Lasciati stare: `CSS_URL`, `JSON_URL` e `MOBILE_COLUMNS` sono esportati ma letti
solo dentro il loro file. Togliere la parola `export` non cambia niente di
quello che viene spedito, quindi restano.

Verificato **pulito** nello stesso giro: nessuna classe CSS orfana (35 classi
`ct_comparison*`, tutte prodotte da js o fragment), nessun file js mai
importato, e i tre `.woff2` non sono morti — `_local.scss` li carica dentro
`@if ($env == "development")`, perché in produzione li fornisce lo storefront.

### Scelte consapevoli, non buchi

4. **Lingue: otto.** `en-us`, `en`, `fr`, `fr-ca`, `es`, `es-mx`, `de`, `nl` —
   lo stesso set che SGH spedisce in `4-card-section-module` per questa
   campagna. Trascritte dai frame Figma per locale (§9); `es-mx` non ha un frame
   suo e riusa `es`, come richiesto. `getTrad` prova country → lang → prefisso →
   `en-us` → `en`, quindi un mercato senza chiave propria rende inglese, non
   bianco. L'unico divieto resta la **stringa vuota**: i primi tre passi
   matchano la chiave, non il contenuto, quindi un `fr-ca` vuoto rende bianco
   invece di cadere su `fr`. `comparison.api.store` è l'eccezione voluta: non
   ricade mai sull'inglese, perché uno store id sbagliato è peggio di uno store
   id assente.

   Ogni locale è trascritto da **due** frame suoi: il comparatore e l'intro
   (titolo + sottotitolo). Gli id sono in `_meta.translationStatus`.

   ⚠️ **Una sola chiave non ha un frame**: `comparison.selectLabel`, la label
   sopra il picker prodotto su mobile — i frame coprono intro e tabella, e
   quel controllo non sta in nessuno dei due. Lo stesso per
   `products[].family` e `products[].shortName`, che alimentano solo quella
   tendina. Restano provvisori.

   ⚠️ **Le due colonne sono tenute allineate**: una riga che in `en-us` è uguale
   per Gen 3 e Gen 2 è uguale anche in ogni altra lingua. I frame non lo
   facevano — divergevano su 29 righe — e le colonne stanno affiancate, quindi
   si vedeva. Le differenze vere (6 microfoni contro 5, 9 ore contro 8,
   `flash storage`) sono intatte. **Se si modifica una riga condivisa in una
   colonna va modificata anche nell'altra**: sta scritto in
   `_meta.columnConsistency`.

   Le traduzioni sono lavoro del copy team, ma **qualche valore si è perso per
   strada**: `es` dava 5 ore al case del Gen 3 dove l'originale dice 9, `fr-ca`
   scriveva "cinq" dove l'originale ha "5-mic". Per questo ogni riga è
   verificata **numericamente** contro il frame originale `1020:42173` — 497
   righe sulle sette lingue tradotte, zero discrepanze. Il metodo è in
   `_meta.valuesMatchSource`: **va rifatto dopo ogni modifica alla copy**.
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
| Un `gulp serve` rimasto aperto da una sessione precedente | Il nuovo dev server prende la porta successiva (348, 349, 350…), ma `inject-css-js` inietta gli asset con prefisso **hardcoded** `http://localhost:347`: la pagina si apre e resta sullo skeleton per sempre, senza un solo errore in console | `lsof -i -sTCP:LISTEN -n -P \| grep node`, poi `pkill -9 -f "gulp serve"`. `kill` semplice non basta, gulp non muore. Il sintomo si riconosce dal `<script src>` nell'html che punta a una porta diversa da quella su cui si sta navigando |
| Verificare il modulo in una tab Chrome non in primo piano | `visibilityState: "hidden"`, l'IntersectionObserver non scatta e il modulo resta sullo skeleton | È il lazy loading, non un bug. Portare la tab in primo piano, oppure lanciare l'evento a mano: `window.dispatchEvent(new CustomEvent("#ct_cm--table-comparison-component__loadData"))` |

### Procedura per provare con 3+ prodotti

Il JSON reale ne ha 2. Per testare selettori e colonne multiple:

```bash
cp src/json/variants/SGH/json.json /tmp/json.real.json
# sostituire con un JSON di prova
# ... test ...
cp /tmp/json.real.json src/json/variants/SGH/json.json   # ripristinare SEMPRE
```

Il watcher segue `src/json/variants/`, quindi si può scambiare il file a `npm
run dev` acceso e la pagina si ricarica da sola.

⚠️ **L'`id` di ogni prodotto deve essere unico**, anche quando i prodotti sono
lo stesso articolo ripetuto: `comparisonState` indicizza per `id`, e due id
uguali rompono sia le colonne che le tendine. L'UPC invece può ripetersi senza
problemi — `getProducts` deduplica prima della chiamata e poi distribuisce la
stessa risposta a tutte le colonne che l'hanno chiesta, quindi resta **una sola
richiesta**.

Comportamento atteso, misurato sullo stato del modulo:

| | 3 prodotti | 4 prodotti |
| --- | --- | --- |
| Desktop > 1024px | 3 colonne, `--ct-columns: 3`, nessuna tendina | 4 colonne, `--ct-columns: 4` |
| ≤ 1024px | 2 colonne + tendina | 2 colonne + tendina |
| opzioni offerte | il prodotto non a schermo | i due non a schermo |
| toggle "only differences" | **assente** | **assente** |

Il toggle sparisce di proposito: con tre prodotti una riga può essere uguale per
A e B e diversa per C, quindi "nascondi le righe uguali" non ha una risposta
sola — ed è quello che mostra anche il frame Figma a 3 prodotti. Selezionare in
una tendina un prodotto già presente nell'altra colonna viene **rifiutato**,
altrimenti la tabella confronterebbe un prodotto con se stesso.

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
- L'API corregge anche un `pdpUrl` scritto a mano ormai obsoleto. Con
  l'endpoint attuale lo slug che torna è `/us/ray-ban/…`, diverso da quello del
  prodotto (`/us/ray-ban-meta/…`): **c'è un redirect automatico**, verificato in
  browser, quindi si lascia così.
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

Aggiunto nella terza sessione:

- **Otto lingue** nel JSON, trascritte dai frame Figma per locale. Risoluzione
  simulata su dieci mercati attraverso `getTrad`: **960 stringhe, nessuna
  vuota**, e un mercato non elencato (`it-IT`) cade su inglese come deve.
- **Endpoint prodotto migrato** su quello documentato, verificato contro il
  payload reale di produzione: una `fetch` invece di due, prezzo/`pdpURL`/
  packshot risolti, uno sconto simulato che barra correttamente, lo stesso UPC
  distribuito su quattro colonne da **una sola** richiesta, e sei percorsi di
  degradazione (`products[]` vuoto, 404, `fetch` che lancia, nessuno store id,
  prodotto senza `upc`, UPC sconosciuto) che tornano tutti `{}` lasciando la
  tabella sul contenuto autorato.
- **Store id di produzione confermato**: `10152` su `www.sunglasshut.com`
  risponde con prezzi `USD` e URL `/us/`. Non serve più leggerlo da `ct_data`.
- **Colonne e tendine con 3 e 4 prodotti** verificate simulando
  `comparisonState` sui file di prova: conteggio colonne, opzioni offerte,
  toggle assente, e il rifiuto di selezionare un prodotto già in colonna.
- **Confronto degli artefatti fra due build** (worktree sul commit precedente):
  dopo la migrazione dell'endpoint cambiano solo `main__0.0.1.min.js` e
  `json__0.0.1.json`; CSS, `fragment.html` e `index.html` sono byte per byte
  identici, quindi CoreMedia non si tocca. Del JSON cambiano 4 chiavi su 67, e
  sono **tutte** campi di documentazione (`_meta.*`, `api._store`): nessuna
  copy, nessun UPC.

Difetto trovato e corretto nella stessa sessione: `reduceProduct` componeva il
nome come `brand + name`, che su Gucci è giusto (`Gucci GG1463S`) ma sulle linee
co-branded raddoppiava il marchio (`Ray-Ban Ray-Ban Meta (Gen 1) Wayfarer`). Ora
il brand si antepone solo se non è già in testa al nome.

Verifiche della pulizia (quarta tornata):

- `npm install` da zero con `node_modules` e `package-lock.json` cancellati,
  poi build di produzione **verde**.
- Il js di release è ora **byte per byte** uguale a `dist/js/main.min.js`:
  `concatScripts` concatena un file solo. `dist/js/SGH/` non viene più prodotto.
- Nel bundle: `documentElement` e `no lang attribute` compaiono **una volta**
  (erano due), e restano presenti `productInfo`, `partNumbers`,
  `ct_cm--table-comparison-component`, `X_ProductComparisonPlacement`,
  `media.sunglasshut.com`.
- In dev l'html iniettato ha **un solo** `<script>` e due `<link>`: niente più
  `SGH/main.js`.
- **Modulo aperto in Chrome sul dev server** e verificato vivo: skeleton
  sostituito, 2 colonne, `--ct-columns: 2`, 9 righe di label, toggle presente,
  `3 Colors` / `4 Colors`, prezzi `Starting from $224.00` e `$247.00` dall'API,
  CTA su `/us/ray-ban/rw4006-…` e `/us/ray-ban/rw4009-…`, e i due global
  `ct_cm__tableComparisonComponent` / `…Config` sul `window`.

Aggiunto nella quarta tornata, sulla copy:

- **Titoli e sottotitoli** presi dai frame intro per locale, che prima mancavano
  (`en` 1093:44580, `nl` 1249:27015, `de` 1249:62482, `es` 1249:53652, `fr`
  1249:71312, `fr-ca` 1249:35992). Quattro su sei erano diversi da quelli
  provvisori: `de` "Technische Details" e non "Technische Highlights", `nl`
  "Technologische hoogtepunten", `es` "Características técnicas destacadas",
  `fr` "Caractéristiques techniques".
- **`Dom` → `Sol`** in `es` e `es-mx`: il frame spagnolo aveva tradotto così il
  tipo di lente "Sun". `Lunettes de soleil` in francese e `Sonnenbrillen` in
  tedesco **restano**, per decisione presa.
- **29 righe allineate fra le due colonne** con la regola dell'`en-us`, più 18
  sostituzioni per le incoerenze di notazione che l'allineamento ha fatto
  emergere dentro la stessa lingua (`fr` e `es` scrivevano "à 120 fps" e poi
  "30fps"; `fr-ca` scriveva "images par seconde" per esteso e poi "30fps", e
  "1000+ photos" sopra "Plus de 100 vidéos").
- Ricontrollato dopo: **960 stringhe su dieci mercati, nessuna vuota**, e zero
  righe ancora divergenti fra le colonne dove l'`en-us` le ha uguali.
- **Le due SVG sono già caricate** e rispondono 200 su
  `media.sunglasshut.com/table-comparison-component/img/SGH/`. Non era un punto
  aperto, lo era solo nella mia lista.

Aggiunto sulla verifica dei valori:

- **`en-us` confrontato riga per riga col frame originale `1020:42173`**:
  identico, label di riga e annotazioni `Don't show in differences` comprese.
- **497 righe confrontate sulle sette lingue tradotte**, estraendo i valori
  numerici di ogni riga e confrontandoli con la riga `en-us` allo stesso indice.
  Normalizzati virgola decimale e separatore delle migliaia, così `5,5` vale
  `5.5` e `1 000` vale `1000`. Trovata **una** discrepanza (`fr-ca` scriveva
  "cinq" invece di `5`), corretta. Ora zero.
- Verificato anche il caso opposto: una riga che l'originale tiene **distinta**
  fra Gen 3 e Gen 2 è distinta in ogni lingua, e una che tiene **uguale** è
  uguale ovunque.

---

## 11. Dove siamo arrivati

Alla fine della quarta sessione il modulo è completo e verificato. Quello che
resta non è codice.

| | Stato |
| --- | --- |
| Codice | niente in sospeso |
| Copy | otto lingue, tutte trascritte dai frame per locale, valori verificati contro l'originale |
| Chiamata prodotto | sul servizio documentato, verificata su produzione e stage |
| Build | verde, `release/SGH/0.0.1/` |
| Branch | `develop`, allineato al remote |

**Aperto: uno.** I due UPC veri (§6.1).

**In attesa di una decisione: due.** Badge sconto e numero di colori (§6.2,
§6.3). Entrambi dipendono da cosa restituisce il servizio prodotto, non da come
è scritto il modulo.

Se riprendi da qui, i tre file da leggere in quest'ordine sono: questo per le
decisioni e le trappole, il README per comandi e schema JSON, e
`_meta` dentro `src/json/variants/SGH/json.json` per la provenienza di ogni
stringa — `translationStatus` per i node id dei frame, `figmaDeviations` per le
otto correzioni fatte a mano, `columnConsistency` e `valuesMatchSource` per le
due regole da rispettare quando si tocca la copy.
