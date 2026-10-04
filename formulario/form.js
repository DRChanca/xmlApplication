const form = document.querySelector("form");
const status = document.querySelector("output");

async function send(path, submitter) {
  status.setAttribute("aria-live", "polite");
  status.textContent = "Procesando…";
  try {
    const response = await fetch(path, {
      method: "POST",
      body: new FormData(form, submitter),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.errors?.join("\n") || result.error || "No se pudo completar la operación.");
    if (path.endsWith("validate")) {
      status.textContent = "El XML supera la validación WebAssembly.";
      return;
    }
    status.replaceChildren(`${result.message} `);
    const link = document.createElement("a");
    link.href = result.output;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Abrir web generada";
    status.append(link);
  } catch (error) {
    status.setAttribute("aria-live", "assertive");
    status.textContent = error.message;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  send(event.submitter.value === "generate" ? "api/generate" : "api/validate", event.submitter);
});
