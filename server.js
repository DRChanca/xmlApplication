"use strict";

const { createServer } = require("node:http");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { extname, join, resolve, sep } = require("node:path");
const { XMLValidator } = require("fast-xml-parser");

const ROOT = __dirname;
const FORM_DIRECTORY = join(ROOT, "formulario");
const CREATED_DIRECTORY = join(ROOT, "creados");
const GENERATED_DIRECTORY = join(ROOT, "generado");
const WASM_FILE = join(
  ROOT,
  "wasm-validator",
  "target",
  "wasm32-unknown-unknown",
  "release",
  "xml_validator.wasm",
);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const MAX_BODY_SIZE = 2 * 1024 * 1024;

const wasmErrors = [
  [1, "El documento no contiene el elemento raíz <web>."],
  [2, "El documento no contiene una <pagina>."],
  [4, "El documento no contiene la sección obligatoria <principal>."],
  [8, "Todas las etiquetas <foto> necesitan src-name, alt y piefoto."],
  [16, "Todas las etiquetas <audio> necesitan src-name."],
  [32, "Todas las etiquetas <video> necesitan src-name."],
];

function response(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function readUpload(req) {
  const contentType = req.headers["content-type"] || "";
  const boundary = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType)?.[1]
    || /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType)?.[2];
  if (!boundary) throw new Error("Debes subir un archivo XML mediante un formulario multipart/form-data.");

  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error("El archivo XML supera el límite de 2 MB."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const parts = Buffer.concat(chunks).toString("utf8").split(`--${boundary}`);
      const filePart = parts.find((part) => /name="xml"/i.test(part) && /filename="[^"]+"/i.test(part));
      if (!filePart) {
        reject(new Error("Debes seleccionar un archivo XML."));
        return;
      }
      const separator = "\r\n\r\n";
      const contentStart = filePart.indexOf(separator);
      const filename = /filename="([^"]+)"/i.exec(filePart)?.[1] || "portfolio.xml";
      if (contentStart === -1) {
        reject(new Error("La subida del archivo XML no es válida."));
        return;
      }
      const xml = filePart.slice(contentStart + separator.length).replace(/\r\n$/, "");
      resolveBody({ xml, filename });
    });
    req.on("error", reject);
  });
}

function validateWithWasm(xml) {
  if (!existsSync(WASM_FILE)) {
    throw new Error("No se encuentra el validador WebAssembly. Ejecuta npm.cmd run build:wasm.");
  }

  // Se crea una instancia por solicitud: el módulo actual expone allocate, pero no deallocate.
  // Así evitamos que un servidor de larga duración acumule memoria en WebAssembly.
  const module = new WebAssembly.Module(readFileSync(WASM_FILE));
  const instance = new WebAssembly.Instance(module);
  const bytes = new TextEncoder().encode(xml);
  const pointer = instance.exports.allocate(bytes.length);
  new Uint8Array(instance.exports.memory.buffer, pointer, bytes.length).set(bytes);
  const mask = instance.exports.validate_xml(pointer, bytes.length);
  return wasmErrors.filter(([flag]) => (mask & flag) !== 0).map(([, message]) => message);
}

function validateXml(xml) {
  const errors = validateWithWasm(xml);
  const syntax = XMLValidator.validate(xml);
  if (syntax !== true) {
    const { msg, line, col } = syntax.err;
    errors.push(`El XML no está bien formado: ${msg} (línea ${line}, columna ${col}).`);
  }
  return errors;
}

function safeName(value) {
  const name = String(value || "portfolio").trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error("El nombre solo puede contener letras, números, guiones y guiones bajos.");
  }
  return name;
}

function nameFromFilename(filename) {
  const baseName = String(filename).replace(/^.*[\\/]/, "").replace(/\.xml$/i, "");
  return safeName(baseName || "portfolio");
}

function serveFormFile(res, pathname) {
  const fileName = pathname === "/" ? "index.html" : pathname.slice(1);
  if (!["index.html", "form.css", "form.js"].includes(fileName)) return false;

  const file = resolve(FORM_DIRECTORY, fileName);
  if (!file.startsWith(`${FORM_DIRECTORY}${sep}`) || !existsSync(file)) return false;
  const contentType = fileName.endsWith(".css")
    ? "text/css; charset=utf-8"
    : fileName.endsWith(".js")
      ? "text/javascript; charset=utf-8"
      : "text/html; charset=utf-8";
  res.writeHead(200, { "Content-Type": contentType });
  res.end(readFileSync(file));
  return true;
}

function contentType(file) {
  const types = {
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  };
  return types[extname(file).toLowerCase()] || "application/octet-stream";
}

function serveGeneratedFile(req, res, pathname) {
  if (req.method !== "GET" || !pathname.startsWith("/generado/")) return false;

  const relativePath = decodeURIComponent(pathname.slice("/generado/".length));
  let file = resolve(GENERATED_DIRECTORY, relativePath);
  if (!file.startsWith(`${GENERATED_DIRECTORY}${sep}`) || !existsSync(file)) return false;

  if (statSync(file).isDirectory()) {
    if (!pathname.endsWith("/")) {
      res.writeHead(302, { Location: `${pathname}/` });
      res.end();
      return true;
    }
    file = join(file, "index.html");
  }

  if (!existsSync(file) || !statSync(file).isFile()) return false;
  res.writeHead(200, { "Content-Type": contentType(file) });
  res.end(readFileSync(file));
  return true;
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    response(res, 200, { ok: true, wasm: existsSync(WASM_FILE) });
    return;
  }
  if (req.method !== "POST" || !["/api/validate", "/api/generate"].includes(pathname)) {
    response(res, 404, { error: "Ruta no encontrada." });
    return;
  }

  try {
    const body = await readUpload(req);
    if (typeof body.xml !== "string" || !body.xml.trim()) throw new Error("Debes proporcionar un XML.");
    const errors = validateXml(body.xml);
    if (errors.length > 0) {
      response(res, 422, { valid: false, errors });
      return;
    }
    if (pathname === "/api/validate") {
      response(res, 200, { valid: true, errors: [] });
      return;
    }

    const name = nameFromFilename(body.filename);
    mkdirSync(CREATED_DIRECTORY, { recursive: true });
    const xmlFile = join(CREATED_DIRECTORY, `${name}.xml`);
    const outputDirectory = join(ROOT, "generado", name);
    if (existsSync(outputDirectory)) {
      response(res, 409, { error: `Ya existe una web generada con el nombre «${name}».` });
      return;
    }

    writeFileSync(xmlFile, body.xml, "utf8");
    const { generate } = require("./dist/generate.js");
    const output = generate(xmlFile, outputDirectory);
    response(res, 201, {
      valid: true,
      output: `${output.slice(ROOT.length + 1).replaceAll("\\", "/")}/`,
      message: "Portfolio generado correctamente.",
    });
  } catch (error) {
    response(res, 400, { error: error instanceof Error ? error.message : "Error inesperado." });
  }
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).pathname;
  if (serveGeneratedFile(req, res, pathname)) return;
  if (pathname.startsWith("/api/")) {
    await handleApi(req, res, pathname);
    return;
  }
  if (!serveFormFile(res, pathname)) response(res, 404, { error: "Ruta no encontrada." });
});

server.listen(PORT, HOST, () => console.log(`Creador disponible en http://${HOST}:${PORT}`));
