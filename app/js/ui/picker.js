// Sheet shown after pressing "+" on a slot: choose from the list (spare
// rations first, filterable by group) or create a new, still unknown, meal.

import { shortDate, weekdayName } from "../core/dates.js";
import { addMeal, getMealType, picker, sortedGroups } from "../core/planner.js";
import { html, useState } from "../../vendor/preact-htm.js";
import { GroupChips, Sheet, Stepper, colorForGroupId, icon, run, useAppState } from "./common.js";

function expiryText(b) {
  if (b.frozen) return "congelado";
  if (b.daysLeft == null) return "";
  if (b.daysLeft === 0) return "caduca hoy";
  if (b.daysLeft === 1) return "caduca mañana";
  return `aguanta ${b.daysLeft} días`;
}

export function PickerSheet({ date, mealTypeId, onClose }) {
  const state = useAppState();
  const [mode, setMode] = useState("list");
  const [groupId, setGroupId] = useState(null);
  const [q, setQ] = useState("");
  const [scale, setScale] = useState(1);
  const [people, setPeople] = useState(1);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const mealType = getMealType(state, mealTypeId);
  const groups = sortedGroups(state);
  const options = picker(state, { date, mealTypeId, groupId, q });

  const add = (body, message) => {
    if (run((s) => addMeal(s, { date, mealTypeId, servings: people, ...body }), message)) onClose();
  };
  const addRecipe = (r) => {
    const total = Math.max(1, Math.round(r.servings * scale));
    const spare = total - people;
    add({ recipeId: r.id, scale }, spare > 0 ? `Añadido. Quedan ${spare} raciones de sobra.` : "Añadido.");
  };

  return html`<${Sheet} title=${`${mealType.name} · ${weekdayName(date)} ${shortDate(date)}`} onClose=${onClose} tall>
    <div class="segmented" role="tablist">
      <button role="tab" aria-selected=${mode === "list"} class=${mode === "list" ? "active" : ""} onClick=${() => setMode("list")}>
        Elegir de la lista
      </button>
      <button role="tab" aria-selected=${mode === "new"} class=${mode === "new" ? "active" : ""} onClick=${() => setMode("new")}>
        Crear nueva
      </button>
    </div>

    ${mode === "list"
      ? html`
          <label class="search">
            ${icon("search", 18)}
            <input type="search" placeholder="Buscar receta" value=${q} onInput=${(e) => setQ(e.target.value)} />
          </label>
          <${GroupChips} groups=${groups} value=${groupId} onChange=${setGroupId} />
          <div class="picker-options">
            <span>Personas</span>
            <${Stepper} value=${people} onChange=${setPeople} min=${1} max=${12} label="Personas" />
            <span>Cantidad</span>
            <div class="mini-seg">
              ${[1, 2, 3].map(
                (x) => html`<button key=${x} class=${scale === x ? "active" : ""} onClick=${() => setScale(x)}>×${x}</button>`,
              )}
            </div>
          </div>

          ${options.leftovers.length
            ? html`<h3 class="list-title leftovers-title">Raciones sobrantes</h3>
                <ul class="list">
                  ${options.leftovers.map(
                    (b) => html`<li key=${b.id}>
                      <button class="list-item leftover-item" onClick=${() => add({ batchId: b.id }, "Sobras añadidas.")}>
                        <span class="meal-bar" style=${{ background: colorForGroupId(state, b.recipe.groupId) }}></span>
                        <span class="item-text">
                          <span class="item-name">${b.recipe.name}</span>
                          <span class="item-sub">
                            Quedan ${b.remainingServings} · cocinado ${weekdayName(b.cookDate)} ${shortDate(b.cookDate)}
                            ${expiryText(b) ? ` · ${expiryText(b)}` : ""}
                          </span>
                        </span>
                        <span class="badge leftover">${b.remainingServings}</span>
                      </button>
                    </li>`,
                  )}
                </ul>`
            : null}

          <h3 class="list-title">Recetas</h3>
          ${options.recipes.length
            ? html`<ul class="list">
                ${options.recipes.map(
                  (r) => html`<li key=${r.id}>
                    <button class="list-item" onClick=${() => addRecipe(r)}>
                      <span class="meal-bar" style=${{ background: colorForGroupId(state, r.groupId) }}></span>
                      <span class="item-text">
                        <span class="item-name">
                          ${r.favorite ? html`<span class="fav">${icon("star", 14)}</span>` : null}${r.name}
                          ${r.status === "unknown" ? html` <span class="badge muted">por completar</span>` : null}
                        </span>
                        <span class="item-sub">
                          ${[r.groupName, `${r.servings} rac.`, r.timeMinutes ? `${r.timeMinutes} min` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </button>
                  </li>`,
                )}
              </ul>`
            : html`<p class="muted pad">Ninguna receta coincide.</p>`}
        `
      : html`<form
          class="form"
          onSubmit=${(e) => {
            e.preventDefault();
            add(
              { newMeal: { name: newName, groupId: newGroup ? Number(newGroup) : null } },
              "Comida creada. Complétala en Recetas cuando quieras.",
            );
          }}
        >
          <p class="muted">
            La comida se guarda como <strong>desconocida</strong>. Más adelante puedes completar su receta
            (ingredientes, raciones, instrucciones) desde la pestaña Recetas.
          </p>
          <label>Nombre (opcional)
            <input type="text" placeholder="Desconocido" value=${newName} onInput=${(e) => setNewName(e.target.value)} />
          </label>
          <label>Grupo (opcional)
            <select value=${newGroup} onChange=${(e) => setNewGroup(e.target.value)}>
              <option value="">Sin grupo</option>
              ${groups.map((g) => html`<option key=${g.id} value=${g.id}>${g.name}</option>`)}
            </select>
          </label>
          <button class="primary" type="submit">Crear comida</button>
        </form>`}
  </${Sheet}>`;
}
