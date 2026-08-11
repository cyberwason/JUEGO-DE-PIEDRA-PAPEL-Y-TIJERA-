# 🎮 Piedra, Papel o Tijera - Arena Game

Una versión moderna, interactiva y visualmente atractiva del clásico juego de **Piedra, Papel o Tijera**, desarrollada para la web con tecnologías puras y desplegada en Vercel.

---

## 🌐 Demo en Vivo

Puedes probar el juego en tiempo real a través del siguiente enlace:

👉 **[Jugar Ahora en Vercel](https://juego-de-piedra-papel-y-tijera.vercel.app)**

---

## 🚀 ¿Cómo fue hecho este juego?

Este proyecto fue desarrollado utilizando un enfoque **Vanilla Web Development** (sin librerías ni frameworks externos) para garantizar la máxima velocidad de carga, ligereza y rendimiento.

### 🛠️ Tecnologías y Herramientas Utilizadas
* **HTML5:** Estructura semántica de la interfaz del juego.
* **CSS3:** 
  * Variables globales (`:root`) para la gestión ágil de temas visuales y colores.
  * Animaciones fluidas, efectos hover, sombras y diseño *responsive* adaptable a cualquier pantalla.
  * Soporte completo para **Modo Claro / Modo Oscuro**.
* **JavaScript (Vanilla ES6+):**
  * Lógica del juego (puntuación, contador de vidas y decisiones aleatorias de la CPU).
  * **Web Audio API:** Generación de efectos de sonido chistosos e interactivos mediante síntesis de audio directamente en código (sin depender de archivos `.mp3` externos).

---

## ✨ Características Principales

- 🎨 **Diseño Moderno y Atractivo:** Interfaz optimizada con colores llamativos para atraer usuarios y clientes.
- 🌓 **Modo Claro / Oscuro:** Cambio instantáneo de temas visuales.
- 🔊 **Efectos de Sonido Chistosos:** Sonidos integrados para cada acción (victoria, derrota, empate) sintetizados con Web Audio API.
- 📱 **100% Adaptable:** Compatible con pantallas móviles, tablets y computadoras.
- ⚡ **Optimizado para Vercel:** Estructura limpia lista para despliegue en la nube.

---

## 🛠️ Modificaciones Futuras

El código está estructurado y comentado para facilitar cambios y actualizaciones rápidas:
1. **Colores:** Edita las variables CSS en la sección `:root` del archivo `styles.css`.
2. **Sonidos:** Modifica las frecuencias o duraciones de los tonos en `script.js`.
3. **Reglas:** Ajusta el sistema de vidas, puntos o lógica en las funciones principales de `script.js`.