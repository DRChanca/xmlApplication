// Espera a que todo el contenido HTML esté cargado
document.addEventListener('DOMContentLoaded', function() {

    // 1. Seleccionamos los elementos del carrusel
    // Usamos 'document.querySelector' para encontrar elementos en la página.
    // Solo busca en 'sobre-mi.html', pero no dará error en otras páginas.
    const slide = document.querySelector('.carousel-slide');
    const items = document.querySelectorAll('.carousel-item');
    const prevBtn = document.querySelector('#prevBtn');
    const nextBtn = document.querySelector('#nextBtn');

    // 2. Comprobamos si los elementos existen en esta página
    // Si no estamos en 'sobre-mi.html', 'slide' será 'null' y el código se detendrá.
    if (!slide) {
        return; // No hacer nada si no hay carrusel
    }

    // 3. Variables de estado
    let currentIndex = 0; // Para saber qué imagen se está viendo
    const totalItems = items.length; // Para saber cuántas imágenes hay

    // 4. Función para mover el carrusel
    function updateCarousel() {
        // 'slide.style.transform' aplica CSS
        // 'translateX' mueve el elemento horizontalmente.
        // Si currentIndex es 1, lo mueve -100% (una imagen a la izquierda).
        // Si currentIndex es 2, lo mueve -200% (dos imágenes a la izquierda).
        slide.style.transform = `translateX(-${currentIndex * 100}%)`;
    }

    // 5. Evento para el botón "Siguiente"
    nextBtn.addEventListener('click', function() {
        // Incrementamos el índice
        currentIndex++;
        
        // Si llegamos al final, volvemos al principio (0)
        if (currentIndex >= totalItems) {
            currentIndex = 0;
        }
        
        // Llamamos a la función para que mueva el slide
        updateCarousel();
    });

    // 6. Evento para el botón "Anterior"
    prevBtn.addEventListener('click', function() {
        // Decrementamos el índice
        currentIndex--;

        // Si estamos en el principio y damos a "anterior",
        // vamos a la última imagen.
        if (currentIndex < 0) {
            currentIndex = totalItems - 1; 
        }

        // Llamamos a la función para que mueva el slide
        updateCarousel();
    });

    // 7. Iniciamos el carrusel en la primera imagen (posición 0)
    updateCarousel();

});