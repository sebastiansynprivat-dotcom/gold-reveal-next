## Ziel

Alle Accounts der Plattform **Maloum** sollen rückwirkend die Domain `maloum.com` bekommen. Logins (E-Mail + Passwort) bleiben unverändert.

## Aktueller Stand in der Datenbank

In der Tabelle `accounts` gibt es für Plattform = `Maloum`:

- 163 Einträge mit Domain `malum.com`
- 62 Einträge mit Domain `maloum.com`

(Im Code selbst ist keine Domain hartkodiert — die Domain kommt ausschließlich aus der DB-Spalte `account_domain`.)

## Änderung

Ein einziges Update auf der `accounts`-Tabelle:

```sql
UPDATE public.accounts
SET account_domain = 'maloum.com'
WHERE platform = 'Maloum'
  AND account_domain <> 'maloum.com';
```

- Betrifft **nur** das Feld `account_domain`
- `account_email`, `account_password`, Zuweisungen, Drive-Folder etc. bleiben unangetastet
- Wirkt sofort auch für alle bestehenden Accounts (rückwirkend)

## Frage zur Bestätigung

Deine Nachricht erwähnt sowohl „Maloum.com" als auch „Malum.com". Ich gehe davon aus, dass **alle** Maloum-Accounts künftig auf `maloum.com` laufen sollen (also auch die 163 alten `malum.com`-Einträge auf `maloum.com` umgestellt werden). Falls du stattdessen das Gegenteil willst (alles auf `malum.com`), bitte kurz Bescheid geben — sonst führe ich den Plan wie oben aus.
