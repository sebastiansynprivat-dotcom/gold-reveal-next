## Plan: Loot-Box Meilenstein-Rewards + Hot-Streak Flammen-Effekt + Streak unter Status. Bitte fpr beide punkte eine demo version einbauen 

Drei Features in einem Schritt:

### 1. Loot-Box / Mystery-Reward bei Meilensteinen

**Neue Komponente: `src/components/LootBoxReward.tsx**`

- Definierte Meilensteine: 500€, 1000€, 1500€, 2000€, 3000€, 50000€ Monatsumsatz (die bestehenden Bonus Stufen wo die Leute dann noch eine Box öffnen können)
- Reward wird zufällig bei Erreichen vergeben und in `localStorage` gespeichert (einmal pro Meilenstein pro Monat)
- **Animation**: Goldene Box erscheint als Dialog, wackelt/schüttelt sich, dann "explodiert" sie auf mit Confetti + der Badge/Titel wird revealed und die neue Prozent Stufe die frei geschaltet wurde
- Framer Motion: Box schüttelt (rotate keyframes), dann scale-up + fade des Rewards
- Props: `monthlyRevenue: number` – prüft gegen gespeicherte bereits freigeschaltete Meilensteine

**Integration in Dashboard.tsx:**

- Öffnet sich automatisch wenn der Meilenstein erreicht wurde, der User muss dann nur auf die Box klicken das sie sich öffnet.

### 2. Hot-Streak Flammen-Effekt

**Änderungen in `src/pages/Dashboard.tsx` + `src/index.css`:**

- Streak-Tage aus dem StreakTracker lesen (gleiche localStorage-Logik `streak_data`)
- Bei 3+ konsekutiven Tagen: Das gesamte `<main>` bekommt eine CSS-Klasse `hot-streak-N` (N = Streak-Tage, gedeckelt bei 7)
- **CSS-Effekt in `index.css**`:
  - `hot-streak-3`: Subtiler goldener `box-shadow` am äußeren Rand (inset glow)
  - `hot-streak-5`: Intensiverer Glow + leichtes Pulsieren
  - `hot-streak-7`: Maximaler Glow + animierter conic-gradient Rand (ähnlich `gold-gradient-border-animated`)
- Die Intensität steigt mit jedem Tag: opacity/spread des Glows skaliert linear

### 3. Streak-Anzeige unter den Status-Karten

**Änderungen in `src/pages/Dashboard.tsx`:**

- Direkt nach dem "Status"-Card (Zeile ~592 mobile, ~625 desktop) eine kompakte Streak-Anzeige einfügen
- Zeigt: 🔥-Icon + aktuelle Streak-Anzahl + "/7 Tage" als kleine goldene Zeile
- Kein separater StreakTracker-Import nötig – einfach die localStorage-Daten auslesen mit einer kleinen Helper-Funktion
- Design: `glass-card-subtle` mit Flammen-Icon, col-span-2 (mobile) bzw. col-span-4 (desktop), kompakt (py-2)

### Technische Details

**LootBoxReward.tsx Struktur:**

```
- MILESTONES = [500, 1000, 1500, 2000, 3000, 5000]
- REWARDS = ["Hustle King 👑", "Cash Machine 💰", ...]
- localStorage key: "lootbox_unlocked_YYYY-MM"
- Dialog mit 3 Phasen: Box-Shake → Box-Open → Reveal mit Confetti
```

**Hot-Streak CSS:**

```css
.hot-streak-active {
  box-shadow: inset 0 0 Xpx hsl(43 56% 52% / Y);
  /* X und Y skalieren mit streak-level via CSS custom property */
}
```

- Streak-Level wird als `--streak-level` CSS variable gesetzt, Glow-Intensität berechnet sich daraus

**Streak-Lesung:**

- Wiederverwendung der gleichen `getConsecutiveDays()` Logik aus StreakTracker, extrahiert als shared utility oder inline dupliziert (klein genug)

### Dateien die geändert/erstellt werden


| Datei                              | Aktion                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `src/components/LootBoxReward.tsx` | Neu erstellen                                                           |
| `src/pages/Dashboard.tsx`          | LootBox einbinden, Hot-Streak Klasse auf main, Streak-Info unter Status |
| `src/index.css`                    | Hot-Streak Glow-Klassen hinzufügen                                      |
