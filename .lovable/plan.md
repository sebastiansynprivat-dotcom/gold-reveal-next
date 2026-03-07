

## Plan: Account-Suche auf Ordner-Ebene (Freie Accounts)

### Was
Eine Suchleiste auf der Ordner-Übersichtsseite im "Freie Accounts"-Dialog hinzufügen. Wenn der User einen Suchbegriff eingibt, werden die Ordner gefiltert -- es werden nur Ordner angezeigt, die mindestens einen passenden Account enthalten. Die Ordner-Badges aktualisieren sich entsprechend (zeigen nur Treffer-Anzahl).

### Wo
`src/pages/AdminDashboard.tsx` -- im Block `{!openFolder ? (` (Zeile ~4453), vor den Stats/Ordnern.

### Technische Umsetzung

1. **Suchfeld einfügen** zwischen den Stats (Zeile ~4456) und dem "Ordner"-Label (Zeile ~4462). Gleicher Style wie die bestehende Account-Suche (Search-Icon + Input).

2. **Filter-Logik**: Wenn `manualAccountSearch` nicht leer ist, die `namedFolders`-Liste und die Unsortiert-Karte filtern -- nur Ordner anzeigen, deren Accounts (email/password/domain) den Suchbegriff matchen. Die Badge-Zahlen auf der Ordner-Karte zeigen dann nur die Treffer.

3. **State wiederverwenden**: Der bestehende `manualAccountSearch`-State wird für beide Ebenen genutzt (Ordner-Übersicht und Ordner-Innenansicht). Er wird beim Dialog-Schließen bereits zurückgesetzt.

4. **Ordner-Klick bei Suche**: Wenn ein User bei aktiver Suche einen Ordner öffnet, bleibt der Suchbegriff erhalten, sodass die Account-Liste im Ordner direkt gefiltert ist.

