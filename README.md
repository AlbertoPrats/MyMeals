# MyMeals

A meal-prep app that runs entirely on your iPhone. It needs no Mac, no App Store, no account and no server, and costs nothing.

It's a web app that you install to the Home Screen. It opens full screen like a normal app and works offline, and all data stays on the phone.

## Installing it on the iPhone

1. Open the app's link in **Safari**. Once it's published, the link is `https://<your-user>.github.io/<repo>/`.
2. Tap **Share** ▸ **Add to Home Screen**.
3. Open it from the new icon. From then on it works without internet.

To share it, send the link. Each person gets their own private copy of the data on their own phone.

> **Back up your data from time to time** (Ajustes ▸ Guardar copia, save it to Files or iCloud Drive). If you delete the app's icon, iOS deletes its data too.

## What it does

- **Semana** (main page): a week strip at the top, and the selected day's meals below, grouped by slot (Comida, Cena…).
  - **"+" on a slot** opens two options:
    - **Elegir de la lista:** search, filter by group, choose how many people and ×1/×2/×3 quantity. **Spare rations appear first.**
    - **Crear nueva:** creates a meal marked "por completar", to be filled in later from Recetas.
  - **Floating orb:** appears when there are spare rations, for example 3 left after cooking a 4-serving chili. Tap it to see them, freeze them or discard them. It pulses when something expires within a day.
  - **Tapping a meal** shows the batch (servings, how many are left, until when it keeps). You can freeze it, change the quantity, change the number of people, mark it as eaten, move it to another day or slot, or remove it.
- **Preparación**: create a meal-prep period of as many days as you want, optionally with one cooking day.
  - **Plan:** the days and their meals. **Autocompletar** fills the gaps with spare rations and balanced recipes.
  - **Cocinar:** what to cook and when.
  - **Compra:** the combined shopping list, with Swedish product names, tick boxes and a Compartir button.
- **Recetas**: the 37 recipes from `recetas.md`, filterable by group. Each has an ingredient list that scales to any number of servings, instructions and nutrition. You can create, edit, favourite and complete recipes.
- **Ajustes**: daily slots (add Desayuno, reorder), "always at home" ingredients, backup and restore, and reset.

### Extra features, and why

| Feature | Why |
|---|---|
| Expiry from "Conservación" ("4 días en nevera") | Spare rations past their fridge life stop being suggested, and you get a warning if you plan them too late. |
| Freezing | Removes the expiry for dishes that "se congelan bien", so a 6-serving lasagna isn't wasted. |
| The shopping list counts **cooked batches, not meals** | The chili is bought once, not once per leftover. Amounts are added up and converted (g → kg). |
| Swedish product names in the list | They come from `recetas.md` (kikärtor, krossade tomater…) and help at Lidl, Willys or ICA. |
| "Always at home" + tick boxes | Salt and water drop to the bottom, and you can tick items off in the shop. |
| One cooking day | Cook everything on Sunday. Expiry is counted from that day. |
| Autocompletar | Uses spare rations first, then picks recipes to meet the weekly frequency in `recetas.md` (legumbres 3–4, pescado 2–3…). One big batch can't take over a whole food group. |
| Balance per group | Shows meals per group against those targets for the period. |
| Calories per day | Uses the nutrition data in `recetas.md`. |
| Backup | Saves everything to one file, which is also how you move data to another phone. |

## Publishing it (free, with GitHub Pages)

1. Create a repository on GitHub and push this folder to it (branch `main`).
2. In the repository, go to **Settings ▸ Pages ▸ Source** and choose **GitHub Actions**.
3. Each push runs the tests and publishes the `app/` folder. The link appears in **Actions** and in **Settings ▸ Pages**.

### Security checklist (public repository)

- Turn on **two-factor authentication** on GitHub. Whoever controls the account can push code that reaches every installed phone.
- Commit with GitHub's **private noreply email**, not your personal one (GitHub ▸ Settings ▸ Emails, then `git config user.email <id>+<user>@users.noreply.github.com`).
- Don't give anyone else write access, and only merge pull requests whose code you've read. Pull requests can't publish.
- Never commit backups (`mymeals-*.json` is already ignored by git).
- The workflow gives publishing rights only to the publish job, pins every action to an exact commit, and doesn't keep the GitHub token after checkout. When updating an action, replace both the commit hash and the version comment.

**To change recipes**, edit `recetas.md`. You can do it directly on github.com with the pencil icon. When the app is published again, it adds or updates those recipes on every phone the next time it opens. Recipes you edited in the app are not overwritten.

## Development

You need Node 22.

```bash
npm install
npm run serve            # http://localhost:8080
npm test                 # logic tests (parser, planning, shopping list, autofill)
npx playwright install chromium webkit
npm run test:e2e         # drives the real app at iPhone size (WebKit by default)
npm run build:recipes    # recetas.md -> app/data/recipes.json
node tools/make-icons.mjs
```

### Layout

```
recetas.md                 recipes (source)
app/                       the app: published as-is, no build step
  index.html, sw.js        page and service worker (offline cache)
  data/recipes.json        generated from recetas.md
  js/core/                 logic with no UI: parser, planner, shopping, autofill, state
  js/ui/                   screens (Preact + htm, vendored in app/vendor/)
  js/store.js              saves to the phone (IndexedDB)
tests/core/                logic tests (node --test)
tests/e2e/                 browser tests (Playwright)
tools/                     recipe build, icons, dev server
```

**How it works.** Every planned meal takes servings from a **batch** (one cooking of a recipe). Planning the 4-serving chili creates a batch of 4: that meal uses 1 and the other 3 are spare rations. The orb, the "+" list and the shopping list all read from those batches. The app refuses to plan more servings than were cooked, or to eat a dish before the slot where it is cooked.
