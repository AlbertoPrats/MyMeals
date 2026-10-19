// Recipes tab: list, detail and editor.

import { ingredientLines } from "../core/parser.js";
import { deleteRecipe, getRecipe, groupName, saveRecipe, scaledIngredients, sortedGroups } from "../core/planner.js";
import { formatAmount } from "../core/shopping.js";
import { html, useState } from "../../vendor/preact-htm.js";
import { EmptyState, GroupChips, Stepper, colorForGroupId, icon, navigate, run } from "./common.js";

// ------------------------------------------------------------------- list

let rememberedGroup = null;

export function RecipeListPage({ state }) {
  const [groupId, setGroupRaw] = useState(rememberedGroup);
  const [q, setQ] = useState("");
  const setGroup = (g) => {
    rememberedGroup = g;
    setGroupRaw(g);
  };
  const query = q.trim().toLowerCase();
  const groups = sortedGroups(state);
  const visible = state.recipes
    .filter((r) => (groupId == null || r.groupId === groupId) && (!query || r.name.toLowerCase().includes(query)))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, "es"));
  const pending = visible.filter((r) => r.status === "unknown");
  const done = visible.filter((r) => r.status !== "unknown");

  const item = (r) => html`<li key=${r.id}>
    <a class="list-item" href=${`#/receta/${r.id}`}>
      <span class="meal-bar" style=${{ background: colorForGroupId(state, r.groupId) }}></span>
      <span class="item-text">
        <span class="item-name">${r.favorite ? html`<span class="fav">${icon("star", 14)}</span>` : null}${r.name}</span>
        <span class="item-sub">
          ${[groupName(state, r.groupId), `${r.servings} rac.`, r.timeMinutes ? `${r.timeMinutes} min` : null,
            r.nutrition?.kcal ? `${r.nutrition.kcal} kcal` : null].filter(Boolean).join(" · ")}
        </span>
      </span>
      ${icon("right", 18)}
    </a>
  </li>`;

  return html`<div class="page">
    <header class="top-bar">
      <h1>Recetas</h1>
      <div class="top-actions">
        <a class="text-btn" href="#/receta/nueva">${icon("plus", 18)} Nueva</a>
      </div>
    </header>
    <label class="search">
      ${icon("search", 18)}
      <input type="search" placeholder="Buscar receta" value=${q} onInput=${(e) => setQ(e.target.value)} />
    </label>
    <${GroupChips} groups=${groups} value=${groupId} onChange=${setGroup} />
    ${pending.length
      ? html`<h3 class="list-title">Por completar</h3>
          <ul class="list card">${pending.map(item)}</ul>`
      : null}
    ${done.length
      ? html`<h3 class="list-title">${done.length} recetas</h3>
          <ul class="list card">${done.map(item)}</ul>`
      : null}
    ${!visible.length ? html`<${EmptyState} title="Ninguna receta coincide" />` : null}
  </div>`;
}

// ----------------------------------------------------------------- detail

export function RecipeDetailPage({ state, id }) {
  const recipe = state.recipes.find((r) => r.id === id);
  const [servings, setServings] = useState(recipe?.servings ?? 1);
  if (!recipe) return html`<div class="page"><${EmptyState} title="Receta no encontrada"><a href="#/recetas">Volver</a></${EmptyState}></div>`;

  const ingredients = scaledIngredients(recipe, servings);
  const sections = [];
  for (const i of ingredients) {
    const name = i.section ?? "";
    if (!sections.length || sections.at(-1).name !== name) sections.push({ name, items: [] });
    sections.at(-1).items.push(i);
  }
  const n = recipe.nutrition ?? {};
  const remove = () => {
    const planned = state.batches.some((b) => b.recipeId === recipe.id);
    const msg = planned
      ? `«${recipe.name}» está planificada. ¿Borrarla junto con esas comidas?`
      : `¿Borrar «${recipe.name}»?`;
    if (confirm(msg) && run((s) => deleteRecipe(s, recipe.id, { force: true }), "Receta borrada.")) navigate("/recetas");
  };

  return html`<div class="page recipe-page">
    <header class="top-bar">
      <a class="icon-btn" href="#/recetas" aria-label="Volver">${icon("left")}</a>
      <div class="top-actions">
        <button
          class="icon-btn"
          aria-label=${recipe.favorite ? "Quitar de favoritas" : "Marcar como favorita"}
          onClick=${() => run((s) => { getRecipe(s, recipe.id).favorite = !recipe.favorite; })}
        >
          ${icon(recipe.favorite ? "star" : "starOutline")}
        </button>
        <a class="icon-btn" href=${`#/receta/${recipe.id}/editar`} aria-label="Editar">${icon("edit")}</a>
        <button class="icon-btn" aria-label="Borrar" onClick=${remove}>${icon("trash")}</button>
      </div>
    </header>

    <h1 class="recipe-title">${recipe.name}</h1>
    <div class="tags">
      ${recipe.groupId != null
        ? html`<span class="tag"><span class="dot" style=${{ background: colorForGroupId(state, recipe.groupId) }}></span>${groupName(state, recipe.groupId)}</span>`
        : null}
      ${recipe.timeText ? html`<span class="tag">${icon("clock", 14)} ${recipe.timeText}</span>` : null}
      ${recipe.storageText ? html`<span class="tag">${recipe.storageText}</span>` : null}
      ${recipe.equipment?.length ? html`<span class="tag">${recipe.equipment.join(", ")}</span>` : null}
    </div>

    ${recipe.status === "unknown"
      ? html`<div class="card pad">
          <p>Esta comida aún no tiene receta.</p>
          <a class="primary block" href=${`#/receta/${recipe.id}/editar`}>Completar receta</a>
        </div>`
      : html`
          <section class="card pad">
            <div class="row-setting">
              <h2>Ingredientes</h2>
              <${Stepper} value=${servings} onChange=${setServings} min=${1} max=${40} label="Raciones" />
            </div>
            <p class="muted small">
              ${servings} ${servings === 1 ? "ración" : "raciones"}${recipe.servingsNote && servings === recipe.servings ? ` (${recipe.servingsNote})` : ""}
            </p>
            ${sections.map(
              (sec) => html`<div key=${sec.name}>
                ${sec.name ? html`<h3 class="section-name">${sec.name}</h3>` : null}
                <ul class="ingredients">
                  ${sec.items.map(
                    (i, idx) => html`<li key=${idx}>
                      <span class="qty">${formatAmount(i)}</span>
                      <span>
                        ${i.name}
                        ${i.swedishName ? html` <span class="sv">${i.swedishName}</span>` : null}
                        ${i.toTaste && i.quantity == null ? html` <span class="muted">al gusto</span>` : null}
                        ${i.note ? html`<span class="muted small block">${i.note}</span>` : null}
                      </span>
                    </li>`,
                  )}
                </ul>
              </div>`,
            )}
          </section>

          ${recipe.instructions.length
            ? html`<section class="card pad">
                <h2>Instrucciones</h2>
                <ol class="steps">${recipe.instructions.map((step, i) => html`<li key=${i}>${step}</li>`)}</ol>
              </section>`
            : null}

          ${n.kcal
            ? html`<section class="card pad">
                <h2>Por ración</h2>
                <div class="nutrition">
                  <div><strong>${n.kcal}</strong><span>kcal</span></div>
                  <div><strong>${n.proteinG ?? "–"} g</strong><span>proteínas</span></div>
                  <div><strong>${n.carbsG ?? "–"} g</strong><span>hidratos</span></div>
                  <div><strong>${n.fatG ?? "–"} g</strong><span>grasas</span></div>
                  <div><strong>${n.fiberG ?? "–"} g</strong><span>fibra</span></div>
                </div>
              </section>`
            : null}
        `}
  </div>`;
}

// ----------------------------------------------------------------- editor

function toForm(recipe) {
  const n = recipe?.nutrition ?? {};
  return {
    name: recipe?.status === "unknown" && recipe.name === "Desconocido" ? "" : recipe?.name ?? "",
    groupId: recipe?.groupId ?? "",
    servings: recipe?.servings ?? 2,
    timeMinutes: recipe?.timeMinutes ?? "",
    storageDays: recipe?.storageDays ?? "",
    freezable: recipe?.freezable ?? false,
    ingredientsText: recipe ? ingredientLines(recipe.ingredients).join("\n") : "",
    instructionsText: recipe ? recipe.instructions.join("\n") : "",
    kcal: n.kcal ?? "",
    proteinG: n.proteinG ?? "",
    carbsG: n.carbsG ?? "",
    fatG: n.fatG ?? "",
    fiberG: n.fiberG ?? "",
  };
}

const num = (v) => (v === "" || v == null ? null : Number(v));

export function RecipeEditorPage({ state, id }) {
  const recipe = id == null ? null : state.recipes.find((r) => r.id === id);
  const [form, setForm] = useState(() => toForm(recipe));
  if (id != null && !recipe) return html`<div class="page"><${EmptyState} title="Receta no encontrada" /></div>`;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const groups = sortedGroups(state);

  const submit = (e) => {
    e.preventDefault();
    let savedId = id;
    const ok = run((s) => {
      const storageDays = num(form.storageDays);
      const timeMinutes = num(form.timeMinutes);
      // Keep the original wording ("45 min (15 min con lentejas de bote)") unless it changed.
      const sameTime = recipe && recipe.timeMinutes === timeMinutes;
      const sameStorage = recipe && recipe.storageDays === storageDays && recipe.freezable === form.freezable;
      const r = saveRecipe(
        s,
        {
          name: form.name,
          groupId: num(form.groupId),
          servings: num(form.servings) ?? 1,
          timeMinutes,
          timeText: sameTime ? recipe.timeText : null,
          storageDays,
          storageText: sameStorage
            ? recipe.storageText
            : storageDays == null
              ? null
              : storageDays === 0
                ? "al momento"
                : `${storageDays} días en nevera${form.freezable ? " / se congela bien" : ""}`,
          freezable: form.freezable,
          equipment: recipe?.equipment ?? [],
          ingredientsText: form.ingredientsText,
          instructions: form.instructionsText.split("\n"),
          nutrition: {
            kcal: num(form.kcal),
            proteinG: num(form.proteinG),
            carbsG: num(form.carbsG),
            fatG: num(form.fatG),
            fiberG: num(form.fiberG),
          },
        },
        id,
      );
      savedId = r.id;
    }, "Receta guardada.");
    if (ok) navigate(`/receta/${savedId}`);
  };

  return html`<div class="page">
    <header class="top-bar">
      <a class="icon-btn" href=${id == null ? "#/recetas" : `#/receta/${id}`} aria-label="Cancelar">${icon("close")}</a>
      <h1>${id == null ? "Nueva receta" : recipe.status === "unknown" ? "Completar receta" : "Editar receta"}</h1>
    </header>
    <form class="form card pad" onSubmit=${submit}>
      <label>Nombre<input required type="text" value=${form.name} onInput=${set("name")} placeholder="Crema de calabaza" /></label>
      <label>Grupo
        <select value=${form.groupId} onChange=${set("groupId")}>
          <option value="">Sin grupo</option>
          ${groups.map((g) => html`<option key=${g.id} value=${g.id}>${g.name}</option>`)}
        </select>
      </label>
      <div class="grid-2">
        <label>Raciones<input type="number" min="1" inputmode="numeric" value=${form.servings} onInput=${set("servings")} /></label>
        <label>Tiempo (min)<input type="number" min="0" inputmode="numeric" value=${form.timeMinutes} onInput=${set("timeMinutes")} /></label>
        <label>Días en nevera<input type="number" min="0" inputmode="numeric" value=${form.storageDays} onInput=${set("storageDays")} placeholder="0 = al momento" /></label>
        <label class="check"><input type="checkbox" checked=${form.freezable} onChange=${set("freezable")} /> Se congela bien</label>
      </div>
      <label>Ingredientes <small class="muted">(uno por línea, p. ej. «200 g de pasta»)</small>
        <textarea rows="8" value=${form.ingredientsText} onInput=${set("ingredientsText")} placeholder=${"1 kg de calabaza\n1 cebolla\n2 cda de aceite de oliva\nSal y pimienta"}></textarea>
      </label>
      <label>Instrucciones <small class="muted">(un paso por línea)</small>
        <textarea rows="6" value=${form.instructionsText} onInput=${set("instructionsText")}></textarea>
      </label>
      <fieldset>
        <legend>Valor nutricional por ración (opcional)</legend>
        <div class="grid-5">
          <label>kcal<input type="number" inputmode="decimal" value=${form.kcal} onInput=${set("kcal")} /></label>
          <label>Prot.<input type="number" inputmode="decimal" value=${form.proteinG} onInput=${set("proteinG")} /></label>
          <label>Hidr.<input type="number" inputmode="decimal" value=${form.carbsG} onInput=${set("carbsG")} /></label>
          <label>Grasa<input type="number" inputmode="decimal" value=${form.fatG} onInput=${set("fatG")} /></label>
          <label>Fibra<input type="number" inputmode="decimal" value=${form.fiberG} onInput=${set("fiberG")} /></label>
        </div>
      </fieldset>
      <button class="primary" type="submit">Guardar</button>
    </form>
  </div>`;
}
