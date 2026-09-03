# Buscador de direcciones en Canva

Este script permite buscar rápidamente direcciones dentro de una vista de Canva en modo cuadrícula. **No modifica los diseños, imágenes ni textos de Canva**; solo lee los nombres visibles, hace scroll y resalta temporalmente la tarjeta encontrada.

## Pasos de uso

1. **Abrir Canva** y cambiar la vista a **Cuadrícula / Grid** para visualizar las tarjetas.
2. Presionar **F12** o hacer clic derecho sobre Canva y seleccionar **Inspeccionar**.
3. Abrir la pestaña **Console / Consola**.
4. Pegar el código completo del buscador y presionar **Enter**.
   - Si Chrome no permite pegar por primera vez, escribir manualmente:

   ```text
   allow pasting
   ```

   Luego presionar **Enter** y volver a pegar el código.
   - El script no edita ni elimina información de Canva; solo trabaja temporalmente sobre la vista del navegador.

## Primera ejecución

La primera vez que se pega el código, el programa realiza automáticamente un recorrido de toda la cuadrícula para crear un índice de las tarjetas.

Ejemplo de salida:

```text
✅ ESCANEO TERMINADO
📦 497 tarjetas guardadas.
```

Mientras no se recargue la página, este escaneo no se vuelve a realizar. Si Canva se actualiza con **F5**, se debe pegar nuevamente el código y el escaneo comenzará otra vez.

## Buscar una dirección

Después del escaneo, usar únicamente:

```javascript
buscarDireccion("Spring St")
```

El buscador toma en cuenta el nombre completo de la tarjeta, por ejemplo:

```text
92 - 290 Spring St
146 - 127 Spring St #202
173 - 129 Spring St #206
188 - 127 Spring St - Unit 201
```

### Si existe una coincidencia exacta

Por ejemplo:

```javascript
buscarDireccion("290 Spring St")
```

Si solo existe esa dirección, Canva se desplaza directamente hasta la tarjeta y la resalta durante un tiempo.

### Si existen varias coincidencias

Por ejemplo:

```javascript
buscarDireccion("Spring St")
```

El programa muestra todas las coincidencias y aparece una pequeña pestaña **🔎** en el borde derecho de Canva. Al hacer clic en ella se despliega la lista de resultados.

Selecciona la dirección deseada y el programa se desplazará hasta esa tarjeta y la resaltará. La pestaña puede abrirse y cerrarse para no obstruir la vista de Canva.
