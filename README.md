# Generador de portfolios desde XML

El proyecto crea una web estática a partir de un XML. Incluye un formulario local para crear ese XML, subir recursos y generar el portfolio.

## Cómo funciona

```text
Formulario web → Rust/WebAssembly valida → Node guarda y genera → TypeScript crea HTML
```

- `server.js`: servidor Node. Expone `POST /api/validate` y `POST /api/generate`; este último guarda el XML y llama al generador compilado desde `src/generate.ts`.
- `formulario/index.html`, `formulario/form.css` y `formulario/form.js`: interfaz local para validar y generar portfolios.
- `wasm-validator/`: módulo Rust compilado a WebAssembly. Valida que el XML preliminar tenga `web`, `pagina`, `principal` y atributos requeridos de recursos; el servidor también verifica que el documento esté bien formado antes de generar.
- `src/generate.ts`: generador TypeScript que transforma XML en HTML.
- `modelo/`: plantilla de la web y recursos que se copian al resultado.
- `web.dtd` y `web.xsd`: definen el formato XML. Solo `<principal>` es obligatorio.

## Requisitos e instalación

Necesitas Node.js, npm y Rust con `wasm32-unknown-unknown`.

```powershell
rustup target add wasm32-unknown-unknown
npm.cmd install
npm.cmd run build:wasm
```

## Creador visual

```powershell
npm.cmd run serve
```

Abre `http://localhost:3000`.

El servidor solo recibe el XML como archivo subido desde el formulario. Primero ejecuta el validador WebAssembly; solo si no devuelve errores guarda el XML en `creados/<nombre-del-archivo>.xml` y genera la web en `generado/<nombre-del-archivo>/`. El nombre del archivo admite letras, números, guiones y guiones bajos. No se sobrescribe una generación existente.

Inicio es obligatorio. Sobre mí, Contacto, Multimedia y Proyectos son opcionales. Puedes añadir tantos botones, tecnologías, fotos, enlaces, series, películas, podcasts o proyectos como necesites.

Las cargas se guardan y se copian automáticamente al generar:

- `modelo/public/uploads/images/`
- `modelo/public/uploads/audios/`
- `modelo/public/uploads/videos/`

El XML se guarda en `creados/<nombre>.xml` y la web en `generado/<nombre>/`.

## Generar desde XML

```powershell
npm.cmd run generate -- web.xml
```

También puedes indicar salida:

```powershell
npm.cmd run generate -- mi-portfolio.xml .\salida\mi-portfolio
```

Siempre se genera `index.html`. Las páginas adicionales solo se generan si sus secciones XML existen.

## Comandos

| Comando | Función |
| --- | --- |
| `npm.cmd run build` | Compila TypeScript. |
| `npm.cmd run build:wasm` | Compila Rust a WebAssembly. |
| `npm.cmd run serve` | Inicia el creador visual. |
| `npm.cmd run generate -- archivo.xml` | Genera una web. |
