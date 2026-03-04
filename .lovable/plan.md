

## Problem

Die Chatter-Zeile im Admin Dashboard hat auf Mobile zu viele Elemente in einer Reihe: Avatar + Name + Account-Badge + 4 Buttons (Target, Refresh, Trash, Send). Das überlappt auf kleinen Bildschirmen.

## Lösung

Die Zeile in **zwei Reihen** aufteilen:
- **Reihe 1**: Avatar + Name/Info + Account-Badge (volle Breite)
- **Reihe 2**: Die 4 Action-Buttons rechtsbündig, mit etwas weniger Padding

So bleibt alles lesbar und nichts überlappt.

### Technische Umsetzung

**Datei:** `src/pages/AdminDashboard.tsx` (Zeilen ~837-895)

Den inneren `div` von einer einzigen Flex-Zeile in ein zweizeiliges Layout umbauen:

```
┌────────────────────────────────────┐
│ 🟡 Max Mustermann     🔑 2 Accs   │
│              🎯  🔄  🗑️  📤      │
└────────────────────────────────────┘
```

- Äußerer Container: `flex flex-col` statt `flex items-center`
- Erste Zeile: Avatar + Name + Badge in einer `flex items-center` Reihe
- Zweite Zeile: Buttons in `flex justify-end gap-1` mit kleinerem Padding

Auf Desktop (ab `sm:`) kann optional alles wieder in einer Zeile bleiben via `sm:flex-row sm:items-center`.

