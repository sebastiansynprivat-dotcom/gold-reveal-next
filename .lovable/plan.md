## Gray out archived accounts in both Einnahmen and Account Management sections

### 1. Einnahmen platform card
In the `modelAccounts.map` block (~L2188-2297), apply `opacity-50 grayscale` to the card root when `acc.archived` is true. Keep all inputs and Selects fully interactive. Add a small "Archiviert" badge next to the platform name.

### 2. Account Management accordion trigger
In the `accountsByPlatform.map` block (~L3365-3390), when **all** accounts in a platform group are archived, apply `opacity-50 grayscale` to the `<AccordionTrigger>` inner container so the header visually matches the archived state. Groups with mixed active/archived accounts remain unchanged.

No data-layer or disabled-state changes. Purely visual.
