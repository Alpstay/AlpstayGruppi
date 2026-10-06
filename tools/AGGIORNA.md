# Aggiornamento quotidiano dei dati La Scatola (app Gestione gruppi)

Procedura per l'attività pianificata che ogni mattina prepara `scatola.json`, il file che la pagina
online legge da sola per aggiornare i gruppi. La **chiave** che cifra il file NON è in questo
repository (è pubblico): viene data nel testo dell'attività pianificata.

## Come funziona

La Scatola si interroga solo con lo strumento `query_curated_view` del connettore, quindi il lavoro è
diviso in due: il programma `tools/scatola-feed.mjs` decide ogni volta quale interrogazione serve e ne
stampa gli argomenti; tu la esegui e richiami il programma. Il programma legge le risposte da solo
(dal registro della sessione o dal file in cui il sistema le salva quando sono grandi), controlla che
siano complete e scrive il file cifrato.

## Regole

- Gli ID ricevuti da Slope / La Scatola non si modificano mai. Per questo **le risposte non si
  ricopiano a mano**: non salvarle tu in un file, non riassumerle, non riscriverle. Ci pensa il programma.
- Gli argomenti stampati dal programma si copiano **identici** nella chiamata allo strumento
  (stessi filtri, stesso cursore, stesso `limit`). Non aggiungere e non togliere nulla.
- Il repository è pubblico: si pubblica solo `scatola.json` (cifrato). Nessun dato di prenotazioni o
  ospiti va in altri file, nel messaggio di commit o nel riepilogo. La chiave non va scritta in nessun file.
- Non modificare `index.html` né i file in `tools/`.
- Se il programma risponde `ERRORE`, non pubblicare: riporta il messaggio nel riepilogo. La pagina
  online continua a usare i dati dell'ultimo aggiornamento riuscito e avvisa se sono vecchi.

## Passi

1. Dalla cartella del repository:
   `node tools/scatola-feed.mjs start "<CHIAVE>"`
2. Esegui `node tools/scatola-feed.mjs next` e fai quello che dice:
   - `CHIAMA … {argomenti}`: chiama `query_curated_view` del connettore La Scatola con quegli argomenti,
     poi riesegui `next`. Se lo strumento dà errore, riesegui `next`: ripropone la stessa chiamata
     (dopo tre errori di fila si ferma da solo).
   - `PRONTO`: il file `scatola.json` è scritto e verificato. Vai al passo 3.
   - `ERRORE`: fermati e riporta il messaggio.
   Servono di solito 30–40 chiamate (la prima volta circa 70). Non fermarti a metà.
3. Pubblica: `git add scatola.json`, commit `Dati La Scatola <AAAA-MM-GG>`, `git push origin HEAD:main`.
   Se il push è rifiutato (errore 403) non insistere: scrivilo nel riepilogo.
4. Riepilogo breve in italiano: pubblicato sì/no, e le righe `RIEPILOGO` stampate dal programma
   (non contengono dati personali).

## Note

- Il programma trova da solo il registro della sessione (`~/.claude/projects/…/*.jsonl`). Se dice che
  non lo trova, passa il percorso a `start` con `--transcript <file>`.
- Se La Scatola cambia i dati durante la lettura dei soggiorni il programma chiede di rileggerli da
  capo: è normale, basta seguire le sue indicazioni.
- `node tools/scatola-feed.mjs verify scatola.json "<CHIAVE>"` controlla un file già scritto.
- Il programma è generato dai sorgenti TypeScript dell'app (`scripts/scatola-feed-cli.ts`): non si
  modifica a mano.
