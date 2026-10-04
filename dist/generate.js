"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = generate;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fast_xml_parser_1 = require("fast-xml-parser");
const pageDefinitions = {
    principal: { href: "index.html", label: "Inicio" },
    sobremi: { href: "sobre-mi.html", label: "Sobre mí" },
    contacto: { href: "contacto.html", label: "Contacto" },
    multimedia: {
        href: "recomendacionPeliculas.html",
        label: "Multimedia recomendado",
    },
    proyectos: { href: "proyectos.html", label: "Proyectos" },
};
const parser = new fast_xml_parser_1.XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    trimValues: true,
});
function asArray(value) {
    return value === undefined ? [] : Array.isArray(value) ? value : [value];
}
function text(value) {
    if (typeof value === "string" || typeof value === "number")
        return String(value);
    if (value && typeof value === "object" && "#text" in value)
        return text(value["#text"]);
    return "";
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function image(value) {
    const node = value;
    return {
        src: text(node?.["@_src-name"]),
        alt: text(node?.["@_alt"]),
        caption: text(node?.["@_piefoto"]),
    };
}
function tag(name, value, className = "") {
    const klass = className ? ` class="${className}"` : "";
    return `<${name}${klass}>${escapeHtml(value)}</${name}>`;
}
function pageShell(title, active, body, useScript = false, navigationItems = Object.values(pageDefinitions)) {
    const navigation = navigationItems
        .map(({ href, label }) => {
        const selected = href === active ? ' class="active" aria-current="page"' : "";
        return `<li><a href="${href}"${selected}>${label}</a></li>`;
    })
        .join("\n        ");
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="main.css">
  <link rel="icon" type="image/svg+xml" href="logo.svg">
</head>
<body>
  <nav><ul>${navigation}</ul></nav>
  ${body}
  ${useScript ? '<script src="main.js"></script>' : ""}
</body>
</html>
`;
}
function linkButton(button, className = "") {
    const node = button;
    const href = text(node?.["@_onAction"]);
    return `<a${className ? ` class="${className}"` : ""} href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text(button))}</a>`;
}
function renderIndex(principal, siteTitle, navigation) {
    const profile = image(principal.foto);
    const buttons = asArray(principal.boton)
        .map((button) => linkButton(button))
        .join("\n      ");
    const skills = asArray(principal.tecnologia)
        .map((technology) => {
        const icon = image(technology.foto);
        return `<article class="skill-item"><img src="${escapeHtml(icon.src)}" alt="${escapeHtml(icon.alt)}"><h6>${escapeHtml(text(technology.texto))}</h6></article>`;
    })
        .join("\n        ");
    const skillsSection = skills
        ? `<main class="skills-section">
    <h1>¿Con qué he trabajado?</h1>
    <section>
      <h3>Estas son algunas de las tecnologías con las que he trabajado:</h3>
      ${skills}
    </section>
  </main>`
        : "";
    const body = `<header>
    <img src="${escapeHtml(profile.src)}" alt="${escapeHtml(profile.alt)}">
    ${tag("h1", text(principal.titulo))}
    <p style="text-align: center;">${escapeHtml(text(principal.texto))}</p>
    <hr>
    <aside>${buttons}</aside>
  </header>
  ${skillsSection}`;
    return pageShell(`${siteTitle} - Inicio`, "index.html", body, true, navigation);
}
function renderAbout(sobreMi, siteTitle, navigation) {
    const paragraphs = asArray(sobreMi.parrafo)
        .flatMap((paragraph) => [
        ...asArray(paragraph.subtitulo).map((value) => tag("h2", text(value))),
        ...asArray(paragraph.texto).map((value) => tag("p", text(value))),
    ])
        .join("\n    ");
    const hobbies = sobreMi.aficiones;
    const hobbyIntro = asArray(hobbies?.parrafo)
        .flatMap((paragraph) => [
        ...asArray(paragraph.subtitulo).map((value) => tag("h2", text(value))),
        ...asArray(paragraph.texto).map((value) => tag("p", text(value))),
    ])
        .join("\n    ");
    const slides = asArray(hobbies?.carrusel
        ? hobbies.carrusel.foto
        : undefined)
        .map((photo) => {
        const data = image(photo);
        return `<figure class="carousel-item"><img src="${escapeHtml(data.src)}" alt="${escapeHtml(data.alt)}"><figcaption>${escapeHtml(data.caption)}</figcaption></figure>`;
    })
        .join("\n        ");
    const body = `<section>
    ${tag("h1", text(sobreMi.titulo))}
    ${paragraphs}
  </section>
  <main>
    ${hobbyIntro}
    <section class="carousel-viewport">
      <div class="carousel-slide">${slides}</div>
      <button id="prevBtn" class="carousel-btn" type="button" aria-label="Imagen anterior">❮</button>
      <button id="nextBtn" class="carousel-btn" type="button" aria-label="Imagen siguiente">❯</button>
    </section>
  </main>`;
    return pageShell(`Sobre mí - ${siteTitle}`, "sobre-mi.html", body, true, navigation);
}
function renderContact(contacto, siteTitle, navigation) {
    const email = text(contacto.email);
    const otherLinks = asArray(contacto.enlace)
        .map((url) => `<p><a href="${escapeHtml(text(url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(text(url))}</a></p>`)
        .join("\n    ");
    const phone = text(contacto.numero);
    const body = `<section>
    <h1>Contacto</h1>
    <p style="text-align: center;">Si tienes alguna pregunta, no dudes en contactarme.</p>
    <hr>
    <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
    ${phone ? `<p><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>` : ""}
    ${otherLinks}
  </section>`;
    return pageShell(`Contacto - ${siteTitle}`, "contacto.html", body, false, navigation);
}
function renderMultimedia(multimedia, siteTitle, navigation) {
    const series = asArray(multimedia.serie)
        .map((serie) => `<section><h3>${escapeHtml(text(serie.subtitulo))}</h3><video controls src="${escapeHtml(text(serie.video?.["@_src-name"]))}"></video></section>`)
        .join("\n  ");
    const films = asArray(multimedia.pelicula)
        .map((film) => {
        const photo = image(film.foto);
        const caption = text(film.texto) || photo.caption;
        return `<article><h3>${escapeHtml(text(film.subtitulo))}</h3><figure><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}"><figcaption>${escapeHtml(caption)}</figcaption></figure></article>`;
    })
        .join("\n      ");
    const podcasts = asArray(multimedia.podcast)
        .map((podcast) => {
        const photo = podcast.foto ? image(podcast.foto) : undefined;
        const audio = text(podcast.audio?.["@_src-name"]);
        return `<article><h3>${escapeHtml(text(podcast.subtitulo))}</h3>${photo ? `<figure><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}"><figcaption>${escapeHtml(photo.caption)}</figcaption></figure>` : ""}<audio controls src="${escapeHtml(audio)}"></audio></article>`;
    })
        .join("\n      ");
    const body = `<header><h3>${escapeHtml(text(multimedia.titulo))}</h3><p>${escapeHtml(text(multimedia.texto))}</p><hr></header>
  ${series}
  <section><h3>Películas recomendadas</h3><hr><div>${films}</div></section>
  <section><h3>Podcast</h3><hr><div>${podcasts}</div></section>`;
    return pageShell(`Multimedia recomendado - ${siteTitle}`, "recomendacionPeliculas.html", body, false, navigation);
}
function renderProjects(proyectos, siteTitle, navigation) {
    const cards = asArray(proyectos.proyecto)
        .map((project) => `<article><h2>${escapeHtml(text(project.subtitulo))}</h2><p>${escapeHtml(text(project.texto))}</p>${project.boton ? linkButton(project.boton) : ""}</article>`)
        .join("\n    ");
    return pageShell(`Proyectos - ${siteTitle}`, "proyectos.html", `<main><h1>${escapeHtml(text(proyectos.titulo))}</h1>${cards}</main>`, false, navigation);
}
function navigation(page, availableSections) {
    const configuredItems = asArray(page.navegacion?.["enlace-nav"]);
    if (configuredItems.length === 0)
        return availableSections.map((section) => pageDefinitions[section]);
    const seenSections = new Set();
    return configuredItems.map((item) => {
        const section = text(item["@_seccion"]);
        if (!availableSections.includes(section))
            throw new Error(`La seccion de navegacion no se ha declarado: ${section}.`);
        if (!(section in pageDefinitions))
            throw new Error(`La seccion de navegacion «${section}» no existe.`);
        if (seenSections.has(section))
            throw new Error(`La seccion «${section}» esta repetida en <navegacion>.`);
        seenSections.add(section);
        const label = text(item["@_titulo"]);
        if (!label)
            throw new Error(`Falta el atributo titulo en el enlace de navegacion de «${section}».`);
        return {
            href: pageDefinitions[section].href,
            label,
        };
    });
}
function generate(xmlFile, outputDirectory) {
    const input = (0, node_path_1.resolve)(xmlFile);
    if (!(0, node_fs_1.existsSync)(input))
        throw new Error(`No existe el XML: ${input}`);
    const document = parser.parse((0, node_fs_1.readFileSync)(input, "utf8"));
    const web = document.web;
    if (!web)
        throw new Error("El documento debe tener un elemento raíz <web>.");
    const page = asArray(web.pagina)[0];
    if (!page)
        throw new Error("El documento debe contener al menos una <pagina>.");
    for (const section of ["principal"]) {
        if (!page[section])
            throw new Error(`Falta la sección obligatoria <${section}>.`);
    }
    const defaultOutput = (0, node_path_1.join)((0, node_path_1.dirname)(input), "generado", (0, node_path_1.basename)(input, (0, node_path_1.extname)(input)));
    const output = (0, node_path_1.resolve)(outputDirectory ?? defaultOutput);
    if ((0, node_fs_1.existsSync)(output)) {
        throw new Error(`La carpeta de salida ya existe: ${output}. Elige otra carpeta o elimínala antes de generar.`);
    }
    (0, node_fs_1.mkdirSync)(output, { recursive: true });
    const modelDirectory = (0, node_path_1.resolve)(process.cwd(), "modelo");
    for (const resource of ["main.css", "main.js", "logo.svg", "public"]) {
        (0, node_fs_1.cpSync)((0, node_path_1.join)(modelDirectory, resource), (0, node_path_1.join)(output, resource), {
            recursive: true,
        });
    }
    const title = text(web["@_titulo"]) || text(page["@_nombre"]) || "Portfolio";
    const availableSections = ["principal", "sobremi", "contacto", "multimedia", "proyectos"].filter((section) => Boolean(page[section]));
    const navigationItems = navigation(page, availableSections);
    const files = {
        "index.html": renderIndex(page.principal, title, navigationItems),
    };
    if (page.sobremi)
        files["sobre-mi.html"] = renderAbout(page.sobremi, title, navigationItems);
    if (page.contacto)
        files["contacto.html"] = renderContact(page.contacto, title, navigationItems);
    if (page.multimedia)
        files["recomendacionPeliculas.html"] = renderMultimedia(page.multimedia, title, navigationItems);
    if (page.proyectos)
        files["proyectos.html"] = renderProjects(page.proyectos, title, navigationItems);
    for (const [filename, contents] of Object.entries(files))
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(output, filename), contents, "utf8");
    return output;
}
function main() {
    const [xmlFile, outputDirectory] = process.argv.slice(2);
    if (!xmlFile) {
        console.error("Uso: npm run generate -- <archivo.xml> [carpeta-de-salida]");
        process.exitCode = 1;
        return;
    }
    try {
        console.log(`Web generada en: ${generate(xmlFile, outputDirectory)}`);
    }
    catch (error) {
        console.error(`Error: ${error.message}`);
        process.exitCode = 1;
    }
}
if (require.main === module)
    main();
