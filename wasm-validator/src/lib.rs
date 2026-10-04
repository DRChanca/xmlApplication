//! Validación ligera que se ejecuta en el navegador mediante WebAssembly.
//! El servidor Node conserva la validación definitiva antes de generar archivos.

const NO_WEB: u32 = 1;
const NO_PAGE: u32 = 2;
const NO_MAIN: u32 = 4;
const BAD_PHOTO: u32 = 8;
const BAD_AUDIO: u32 = 16;
const BAD_VIDEO: u32 = 32;

#[no_mangle]
pub extern "C" fn allocate(length: usize) -> *mut u8 {
    let mut buffer = Vec::with_capacity(length);
    let pointer = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    pointer
}

#[no_mangle]
pub extern "C" fn validate_xml(pointer: *const u8, length: usize) -> u32 {
    let bytes = unsafe { std::slice::from_raw_parts(pointer, length) };
    let xml = match std::str::from_utf8(bytes) {
        Ok(value) => value,
        Err(_) => return NO_WEB,
    };

    let mut errors = 0;
    if !xml.contains("<web") { errors |= NO_WEB; }
    if !xml.contains("<pagina") { errors |= NO_PAGE; }
    if !xml.contains("<principal") { errors |= NO_MAIN; }
    if invalid_tag(xml, "foto", &["src-name=", "alt=", "piefoto="]) { errors |= BAD_PHOTO; }
    if invalid_tag(xml, "audio", &["src-name="]) { errors |= BAD_AUDIO; }
    if invalid_tag(xml, "video", &["src-name="]) { errors |= BAD_VIDEO; }
    errors
}

fn invalid_tag(xml: &str, tag: &str, attributes: &[&str]) -> bool {
    let marker = format!("<{tag}");
    let mut remaining = xml;
    while let Some(start) = remaining.find(&marker) {
        remaining = &remaining[start + marker.len()..];
        let Some(end) = remaining.find('>') else { return true; };
        let fragment = &remaining[..end];
        if attributes.iter().any(|attribute| !fragment.contains(attribute)) { return true; }
        remaining = &remaining[end + 1..];
    }
    false
}
