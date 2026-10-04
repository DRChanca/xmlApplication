import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { XMLParser } from "fast-xml-parser";

type XmlNode = Record<string, unknown>;

interface ImageData {
  src: string;
  alt: string;
  caption: string;
}
interface LinkData {
  text: string;
  href: string;
}
interface NavigationItem {
  href: string;
  label: string;
}

const pageDefinitions = {
  principal: { href: "index.html", label: "Inicio" },
  sobremi: { href: "sobre-mi.html", label: "Sobre mí" },
  contacto: { href: "contacto.html", label: "Contacto" },
  multimedia: {
    href: "recomendacionPeliculas.html",
    label: "Multimedia recomendado",
  },
  proyectos: { href: "proyectos.html", label: "Proyectos" },
} as const;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (value && typeof value === "object" && "#text" in value)
    return text((value as XmlNode)["#text"]);
  return "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function image(value: unknown): ImageData {
  const node = value as XmlNode;
  return {
    src: text(node?.["@_src-name"]),
    alt: text(node?.["@_alt"]),
    caption: text(node?.["@_piefoto"]),
  };
}

function tag(name: string, value: string, className = ""): string {
  const klass = className ? ` class="${className}"` : "";
  return `<${name}${klass}>${escapeHtml(value)}</${name}>`;
}

function pageShell(
  title: string,
  active: string,
  body: string,
  useScript = false,
  navigationItems: NavigationItem[] = Object.values(pageDefinitions),
): string {
  const navigation = navigationItems
    .map(({ href, label }) => {
      const selected =
        href === active ? ' class="active" aria-current="page"' : "";
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

function linkButton(button: unknown, className = ""): string {
  const node = button as XmlNode;
  const href = text(node?.["@_onAction"]);
  return `<a${className ? ` class="${className}"` : ""} href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text(button))}</a>`;
}

function renderIndex(
  principal: XmlNode,
  siteTitle: string,
  navigation: NavigationItem[],
): string {
  const profile = image(principal.foto);
  const buttons = asArray(principal.boton)
    .map((button) => linkButton(button))
    .join("\n      ");
  const skills = asArray<XmlNode>(
    principal.tecnologia as XmlNode | XmlNode[] | undefined,
  )
    .map((technology) => {
      const icon = image(technology.foto);
      return `<article class="skill-item"><img src="${escapeHtml(icon.src)}" alt="${escapeHtml(icon.alt)}"><h6>${escapeHtml(text(technology.texto))}</h6></article>`;
    })
    .join("\n        ");

  const body = `<header>
    <img src="${escapeHtml(profile.src)}" alt="${escapeHtml(profile.alt)}">
    ${tag("h1", text(principal.titulo))}
    <p style="text-align: center;">${escapeHtml(text(principal.texto))}</p>
    <hr>
    <aside>${buttons}</aside>
  </header>
  <main>
    <h1>¿Con qué he trabajado?</h1>
    <section>
      <h3>Estas son algunas de las tecnologías con las que he trabajado:</h3>
      ${skills}
    </section>
  </main>`;
  return pageShell(
    `${siteTitle} - Inicio`,
    "index.html",
    body,
    false,
    navigation,
  );
}

function renderAbout(
  sobreMi: XmlNode,
  siteTitle: string,
  navigation: NavigationItem[],
): string {
  const paragraphs = asArray<XmlNode>(
    sobreMi.parrafo as XmlNode | XmlNode[] | undefined,
  )
    .flatMap((paragraph) => [
      ...asArray(paragraph.subtitulo).map((value) => tag("h2", text(value))),
      ...asArray(paragraph.texto).map((value) => tag("p", text(value))),
    ])
    .join("\n    ");
  const hobbies = sobreMi.aficiones as XmlNode;
  const hobbyIntro = asArray<XmlNode>(
    hobbies?.parrafo as XmlNode | XmlNode[] | undefined,
  )
    .flatMap((paragraph) => [
      ...asArray(paragraph.subtitulo).map((value) => tag("h2", text(value))),
      ...asArray(paragraph.texto).map((value) => tag("p", text(value))),
    ])
    .join("\n    ");
  const slides = asArray(
    (hobbies?.carrusel as XmlNode | undefined)
      ? (hobbies.carrusel as XmlNode).foto
      : undefined,
  )
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
  return pageShell(
    `Sobre mí - ${siteTitle}`,
    "sobre-mi.html",
    body,
    true,
    navigation,
  );
}

function renderContact(
  contacto: XmlNode,
  siteTitle: string,
  navigation: NavigationItem[],
): string {
  const email = text(contacto.email);
  const otherLinks = asArray(contacto.enlace)
    .map(
      (url) =>
        `<p><a href="${escapeHtml(text(url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(text(url))}</a></p>`,
    )
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
  return pageShell(
    `Contacto - ${siteTitle}`,
    "contacto.html",
    body,
    false,
    navigation,
  );
}

function renderMultimedia(
  multimedia: XmlNode,
  siteTitle: string,
  navigation: NavigationItem[],
): string {
  const series = asArray<XmlNode>(
    multimedia.serie as XmlNode | XmlNode[] | undefined,
  )
    .map(
      (serie) =>
        `<section><h3>${escapeHtml(text(serie.subtitulo))}</h3><video controls src="${escapeHtml(text((serie.video as XmlNode)?.["@_src-name"]))}"></video></section>`,
    )
    .join("\n  ");
  const films = asArray<XmlNode>(
    multimedia.pelicula as XmlNode | XmlNode[] | undefined,
  )
    .map((film) => {
      const photo = image(film.foto);
      const caption = text(film.texto) || photo.caption;
      return `<article><h3>${escapeHtml(text(film.subtitulo))}</h3><figure><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}"><figcaption>${escapeHtml(caption)}</figcaption></figure></article>`;
    })
    .join("\n      ");
  const podcasts = asArray<XmlNode>(
    multimedia.podcast as XmlNode | XmlNode[] | undefined,
  )
    .map((podcast) => {
      const photo = podcast.foto ? image(podcast.foto) : undefined;
      const audio = text((podcast.audio as XmlNode)?.["@_src-name"]);
      return `<article><h3>${escapeHtml(text(podcast.subtitulo))}</h3>${photo ? `<figure><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}"><figcaption>${escapeHtml(photo.caption)}</figcaption></figure>` : ""}<audio controls src="${escapeHtml(audio)}"></audio></article>`;
    })
    .join("\n      ");
  const body = `<header><h3>${escapeHtml(text(multimedia.titulo))}</h3><p>${escapeHtml(text(multimedia.texto))}</p><hr></header>
  ${series}
  <section><h3>Películas recomendadas</h3><hr><div>${films}</div></section>
  <section><h3>Podcast</h3><hr><div>${podcasts}</div></section>`;
  return pageShell(
    `Multimedia recomendado - ${siteTitle}`,
    "recomendacionPeliculas.html",
    body,
    false,
    navigation,
  );
}

function renderProjects(
  proyectos: XmlNode,
  siteTitle: string,
  navigation: NavigationItem[],
): string {
  const cards = asArray<XmlNode>(
    proyectos.proyecto as XmlNode | XmlNode[] | undefined,
  )
    .map(
      (project) =>
        `<article><h2>${escapeHtml(text(project.subtitulo))}</h2><p>${escapeHtml(text(project.texto))}</p>${project.boton ? linkButton(project.boton) : ""}</article>`,
    )
    .join("\n    ");
  return pageShell(
    `Proyectos - ${siteTitle}`,
    "proyectos.html",
    `<main><h1>${escapeHtml(text(proyectos.titulo))}</h1>${cards}</main>`,
    false,
    navigation,
  );
}

function navigation(
  page: XmlNode,
  availableSections: readonly (keyof typeof pageDefinitions)[],
): NavigationItem[] {
  const configuredItems = asArray<XmlNode>(
    (page.navegacion as XmlNode | undefined)?.["enlace-nav"] as
      XmlNode | XmlNode[] | undefined,
  );
  if (configuredItems.length === 0)
    return availableSections.map((section) => pageDefinitions[section]);

  const seenSections = new Set<string>();
  return configuredItems.map((item) => {
    const section = text(item["@_seccion"]);
    if (!availableSections.includes(section as keyof typeof pageDefinitions))
      throw new Error(
        `La seccion de navegacion no se ha declarado: ${section}.`,
      );
    if (!(section in pageDefinitions))
      throw new Error(`La seccion de navegacion «${section}» no existe.`);
    if (seenSections.has(section))
      throw new Error(`La seccion «${section}» esta repetida en <navegacion>.`);
    seenSections.add(section);
    const label = text(item["@_titulo"]);
    if (!label)
      throw new Error(
        `Falta el atributo titulo en el enlace de navegacion de «${section}».`,
      );
    return {
      href: pageDefinitions[section as keyof typeof pageDefinitions].href,
      label,
    };
  });
}

export function generate(xmlFile: string, outputDirectory?: string): string {
  const input = resolve(xmlFile);
  if (!existsSync(input)) throw new Error(`No existe el XML: ${input}`);

  const document = parser.parse(readFileSync(input, "utf8")) as {
    web?: XmlNode;
  };
  const web = document.web;

  if (!web) throw new Error("El documento debe tener un elemento raíz <web>.");
  const page = asArray<XmlNode>(
    web.pagina as XmlNode | XmlNode[] | undefined,
  )[0];

  if (!page)
    throw new Error("El documento debe contener al menos una <pagina>.");
  for (const section of ["principal"]) {
    if (!page[section])
      throw new Error(`Falta la sección obligatoria <${section}>.`);
  }

  const defaultOutput = join(
    dirname(input),
    "generado",
    basename(input, extname(input)),
  );
  const output = resolve(outputDirectory ?? defaultOutput);

  if (existsSync(output)) {
    throw new Error(
      `La carpeta de salida ya existe: ${output}. Elige otra carpeta o elimínala antes de generar.`,
    );
  }

  mkdirSync(output, { recursive: true });
  const modelDirectory = resolve(process.cwd(), "modelo");

  for (const resource of ["main.css", "main.js", "logo.svg", "public"]) {
    cpSync(join(modelDirectory, resource), join(output, resource), {
      recursive: true,
    });
  }

  const title = text(web["@_titulo"]) || text(page["@_nombre"]) || "Portfolio";
  const availableSections = (
    ["principal", "sobremi", "contacto", "multimedia", "proyectos"] as const
  ).filter((section) => Boolean(page[section]));
  const navigationItems = navigation(page, availableSections);

  const files: Record<string, string> = {
    "index.html": renderIndex(
      page.principal as XmlNode,
      title,
      navigationItems,
    ),
  };
  if (page.sobremi)
    files["sobre-mi.html"] = renderAbout(
      page.sobremi as XmlNode,
      title,
      navigationItems,
    );
  if (page.contacto)
    files["contacto.html"] = renderContact(
      page.contacto as XmlNode,
      title,
      navigationItems,
    );
  if (page.multimedia)
    files["recomendacionPeliculas.html"] = renderMultimedia(
      page.multimedia as XmlNode,
      title,
      navigationItems,
    );
  if (page.proyectos)
    files["proyectos.html"] = renderProjects(
      page.proyectos as XmlNode,
      title,
      navigationItems,
    );
  for (const [filename, contents] of Object.entries(files))
    writeFileSync(join(output, filename), contents, "utf8");
  return output;
}

function main(): void {
  const [xmlFile, outputDirectory] = process.argv.slice(2);
  if (!xmlFile) {
    console.error("Uso: npm run generate -- <archivo.xml> [carpeta-de-salida]");
    process.exitCode = 1;
    return;
  }
  try {
    console.log(`Web generada en: ${generate(xmlFile, outputDirectory)}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
