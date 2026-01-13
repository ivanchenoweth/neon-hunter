# Neon Hunter

**Neon Hunter** es un vibrante juego tipo arcade de supervivencia y acción. El objetivo principal es **controlar a un cazador neon y sobrevivir** el mayor tiempo posible en un entorno hostil mientras recolectas monedas (coins) y eliminas oleadas de enemigos.

Diseñado con una arquitectura modular de alto rendimiento, el juego ofrece una experiencia fluida (60 FPS) y está optimizado desde sus cimientos para una futura transición a multijugador masivo.

## 🚀 Arquitectura y Optimizaciones

El motor del juego ha sido diseñado siguiendo principios avanzados de desarrollo de videojuegos para garantizar fluidez (60 FPS) y escalabilidad.

### 1. Separación de Estado y Renderizado (Multiplayer Ready)

A diferencia de los juegos sencillos donde la lógica y el dibujo están mezclados, Neon Hunter separa estas responsabilidades:

- **Lógica de Estado (`updateState`)**: Maneja la física, colisiones y reglas del juego. Este código es **autoritativo** y está listo para ser movido a un servidor (Node.js).
- **Lógica Visual (`updateVisuals`)**: Gestiona efectos secundarios como partículas, estelas (trails) y animaciones de ambiente que no afectan el resultado del juego.
- **Renderizado (`draw`)**: Puramente visual, encargado de dibujar el estado actual en el `<canvas>`.

### 2. Algoritmo de Cuadrícula Espacial (Spatial Grid)

Para evitar el costoso cálculo de colisiones de "todos contra todos" (O(n²)), utilizamos una **Spatial Grid** (`SpatialGrid.js`):

- El mundo se divide en celdas de 400x400px.
- Cada entidad se registra solo en la celda donde se encuentra.
- Las colisiones solo se verifican contra entidades en celdas adyacentes, reduciendo drásticamente la carga computacional y permitiendo cientos de objetos simultáneos sin lag.

### 3. Agrupación de Objetos (Object Pooling)

Para evitar el "Garbage Collection stutter" (pausas por liberación de memoria), implementamos un sistema de **Object Pooling** (`ObjectPool.js`):

- Las balas, enemigos y partículas no se crean y destruyen constantemente.
- Se reutilizan objetos "muertos" de una reserva pre-asignada, manteniendo una huella de memoria estable y un rendimiento fluido.
  s

---

## 🎮 Controles y UI

- **Movimiento**: Teclas `W`, `A`, `S`, `D`.
- **Disparo**: Click izquierdo del ratón.
- **Interfaz**:
  - El **Score**, **Coins** y **FPS** se dibujan directamente en el buffer del canvas para minimizar el overhead del DOM.
  - El juego incluye un **Minimap** táctico en la esquina inferior derecha.

## 🛠️ Desarrollo Multijugador

El archivo `game.js` incluye hooks preparados para networking:

- `sendInputToServer()`: Punto de entrada para WebSockets para enviar inputs.
- `onServerUpdateReceived()`: Para sincronizar el estado global desde un servidor.

## 📦 Instalación y Ejecución

1. Abrir `index.html` en un navegador moderno.
2. Recomendado usar un servidor local para evitar problemas con recursos estáticos:
   ```bash
   python3 -m http.server 8000
   ```

---

**Autor:** Ivana Lin Chenoweth Galaz
**Optimización:** Antigravity AI
