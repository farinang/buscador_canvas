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
b("Spring St")
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
b("290 Spring St")
```

Si solo existe esa dirección, Canva se desplaza directamente hasta la tarjeta y la resalta durante un tiempo.

### Si existen varias coincidencias

Por ejemplo:

```javascript
b("Spring St")
```

El programa muestra todas las coincidencias y aparece una pequeña pestaña **🔎** en el borde derecho de Canva. Al hacer clic en ella se despliega la lista de resultados.

Selecciona la dirección deseada y el programa se desplazará hasta esa tarjeta y la resaltará. La pestaña puede abrirse y cerrarse para no obstruir la vista de Canva.


### CÓDIGO FINAL

```javascript
const TIEMPO_RESALTADO = 20000; // tiempo que permanece resaltado lo seleccionado

(async () => {

    // ============================================================
    // EVITAR REINICIALIZAR SI YA ESTÁ CARGADO
    // ============================================================

    if (window.canvaBuscadorInicializado) {

        console.log(
            `✅ Buscador ya inicializado. ${window.canvaIndice?.size || 0} tarjetas disponibles.`
        );

        return;
    }

    window.canvaBuscadorInicializado = true;

    window.canvaIndice =
        window.canvaIndice || new Map();

    window.canvaYaEscaneado =
        window.canvaYaEscaneado || false;

    window.canvaCancelar = false;


    const esperar = ms =>
        new Promise(resolve => setTimeout(resolve, ms));


    // ============================================================
    // UTILIDADES
    // ============================================================

    function normalizar(texto) {

        return (texto || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
    }


    // ============================================================
    // NORMALIZAR PARA BÚSQUEDA APROXIMADA
    // ============================================================

    function normalizarBusqueda(texto) {

        return normalizar(texto)
            .replace(/[.,#]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }


    // ============================================================
    // DISTANCIA LEVENSHTEIN
    // ============================================================

    function distanciaLevenshtein(a, b) {

        a = normalizarBusqueda(a);
        b = normalizarBusqueda(b);

        const matriz = Array.from(
            { length: b.length + 1 },
            () => new Array(a.length + 1)
        );

        for (let i = 0; i <= b.length; i++) {
            matriz[i][0] = i;
        }

        for (let j = 0; j <= a.length; j++) {
            matriz[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {

            for (let j = 1; j <= a.length; j++) {

                const costo =
                    b[i - 1] === a[j - 1]
                        ? 0
                        : 1;

                matriz[i][j] = Math.min(
                    matriz[i - 1][j] + 1,
                    matriz[i][j - 1] + 1,
                    matriz[i - 1][j - 1] + costo
                );
            }
        }

        return matriz[b.length][a.length];
    }


    // ============================================================
    // CALCULAR SIMILITUD
    //
    // 1.00 = idéntico
    // 0.00 = totalmente diferente
    // ============================================================

    function calcularSimilitud(a, b) {

        a = normalizarBusqueda(a);
        b = normalizarBusqueda(b);

        if (!a || !b)
            return 0;

        if (a === b)
            return 1;


        if (
            a.includes(b) ||
            b.includes(a)
        ) {

            const menor =
                Math.min(
                    a.length,
                    b.length
                );

            const mayor =
                Math.max(
                    a.length,
                    b.length
                );

            return (
                0.85 +
                (0.15 * (menor / mayor))
            );
        }


        const distancia =
            distanciaLevenshtein(a, b);


        const longitudMax =
            Math.max(
                a.length,
                b.length
            );


        return (
            1 -
            (distancia / longitudMax)
        );
    }


    function obtenerDireccion(nombreCompleto) {

        return nombreCompleto
            .replace(/^\s*\d+\s*-\s*/, "")
            .trim();
    }


    function obtenerNumero(nombreCompleto) {

        const match =
            nombreCompleto.match(
                /^\s*(\d+)\s*-/
            );

        return match
            ? Number(match[1])
            : 999999;
    }


    // ============================================================
    // OBTENER NOMBRE COMPLETO
    // ============================================================

    function obtenerNombreCompleto(elemento) {

        let actual = elemento;


        for (let nivel = 0; nivel < 7; nivel++) {

            if (!actual)
                break;


            let texto =
                actual.innerText?.trim();


            if (texto) {

                texto = texto
                    .replace(/\s+/g, " ")
                    .trim();


                if (
                    texto.length <= 180 &&
                    /^\s*\d+\s*-\s*.+/.test(texto)
                ) {

                    return texto;
                }
            }


            actual =
                actual.parentElement;
        }


        return null;
    }


    // ============================================================
    // ¿ES UN ELEMENTO REALMENTE DESPLAZABLE?
    // ============================================================

    function esScrollable(el) {

        if (!(el instanceof HTMLElement))
            return false;

        if (
            el === document.documentElement ||
            el === document.body
        ) {
            return false;
        }

        const estilo =
            getComputedStyle(el);

        const overflowValido =
            estilo.overflowY === "auto" ||
            estilo.overflowY === "scroll";

        const tieneScroll =
            el.scrollHeight >
            el.clientHeight + 50;

        // Umbrales relativos a la ventana en vez de píxeles fijos,
        // para que funcione igual en pantallas de 15" o 17".
        const tamanoRazonable =
            el.clientHeight > window.innerHeight * 0.25 &&
            el.clientWidth > window.innerWidth * 0.15;

        return (
            overflowValido &&
            tieneScroll &&
            tamanoRazonable
        );
    }


    // ============================================================
    // IDENTIFICAR SCROLL DE CANVA
    //
    // ESTRATEGIA NUEVA (independiente del tamaño de pantalla):
    // en vez de adivinar el contenedor por tamaño en píxeles,
    // localizamos primero textos que YA parecen tarjetas
    // ("123 - Dirección") y subimos por sus ancestros hasta
    // encontrar el contenedor con scroll más cercano. El
    // contenedor que aparece más veces es el correcto.
    // ============================================================

    function obtenerScrollCanva() {

        const candidatosTexto = [
            ...document.querySelectorAll("div, span, p")
        ].filter(el => {

            if (el.offsetParent === null)
                return false;

            if (el.children.length > 0)
                return false;

            const texto = el.innerText?.trim();

            return (
                !!texto &&
                texto.length <= 160
            );
        });


        const conteo = new Map();

        for (const textoEl of candidatosTexto) {

            const nombreCompleto =
                obtenerNombreCompleto(textoEl);

            if (!nombreCompleto)
                continue;

            let actual =
                textoEl.parentElement;

            let saltos = 0;

            while (actual && saltos < 14) {

                if (esScrollable(actual)) {

                    conteo.set(
                        actual,
                        (conteo.get(actual) || 0) + 1
                    );

                    break;
                }

                actual = actual.parentElement;
                saltos++;
            }
        }

        if (conteo.size > 0) {

            const ordenado = [
                ...conteo.entries()
            ].sort(
                (a, b) => b[1] - a[1]
            );

            return ordenado[0][0];
        }


        // ------------------------------------------------------
        // RESPALDO: si por alguna razón todavía no hay ninguna
        // tarjeta renderizada (p.ej. la página aún está cargando),
        // usamos el heurístico anterior pero con umbrales relativos
        // a la ventana, no fijos en píxeles.
        // ------------------------------------------------------

        const candidatosScroll = [
            ...document.querySelectorAll("*")
        ].filter(esScrollable);

        candidatosScroll.sort(
            (a, b) =>
                (b.clientWidth * b.clientHeight) -
                (a.clientWidth * a.clientHeight)
        );

        return candidatosScroll[0] || null;
    }


    // ============================================================
    // LEER TARJETAS RENDERIZADAS ACTUALMENTE
    // ============================================================

    function leerTarjetasActuales() {

        const elementos = [
            ...document.querySelectorAll(
                "div, span, p"
            )
        ];


        const encontrados =
            new Map();


        for (const el of elementos) {

            if (el.offsetParent === null)
                continue;


            if (el.children.length > 0)
                continue;


            const texto =
                el.innerText?.trim();


            if (!texto)
                continue;


            if (texto.length > 160)
                continue;


            const nombreCompleto =
                obtenerNombreCompleto(el);


            if (!nombreCompleto)
                continue;


            const clave =
                normalizar(nombreCompleto);


            if (
                encontrados.has(clave)
            ) {
                continue;
            }


            encontrados.set(
                clave,
                {

                    nombre:
                        nombreCompleto,

                    direccion:
                        obtenerDireccion(
                            nombreCompleto
                        ),

                    numero:
                        obtenerNumero(
                            nombreCompleto
                        ),

                    elemento:
                        el
                }
            );
        }


        return [
            ...encontrados.values()
        ];
    }


    // ============================================================
    // GUARDAR TARJETAS EN EL ÍNDICE
    // ============================================================

    function guardarTarjetasActuales() {

        const tarjetas =
            leerTarjetasActuales();


        for (const tarjeta of tarjetas) {

            const clave =
                normalizar(
                    tarjeta.nombre
                );


            if (
                window.canvaIndice.has(clave)
            ) {
                continue;
            }


            window.canvaIndice.set(
                clave,
                {

                    nombre:
                        tarjeta.nombre,

                    direccion:
                        tarjeta.direccion,

                    numero:
                        tarjeta.numero
                }
            );
        }
    }


    // ============================================================
    // ESCANEAR TODO CANVA
    // ============================================================

    async function escanearTodoCanva() {

        if (
            window.canvaYaEscaneado &&
            window.canvaIndice.size > 0
        ) {

            console.log(
                `✅ Canva ya fue escaneado. ${window.canvaIndice.size} tarjetas disponibles.`
            );

            return true;
        }


        // Damos un pequeño margen para que Canva termine de
        // renderizar antes de buscar el contenedor (ayuda en
        // computadoras más lentas o pantallas distintas).
        await esperar(400);


        let contenedor =
            obtenerScrollCanva();


        if (!contenedor) {

            // Reintento: a veces las primeras tarjetas tardan
            // un poco más en aparecer en equipos distintos.
            await esperar(800);

            contenedor =
                obtenerScrollCanva();
        }


        if (!contenedor) {

            console.log(
                "❌ No pude identificar el scroll de Canva."
            );

            console.log(
                "👉 Prueba: 1) hacer clic dentro del panel de tarjetas, " +
                "2) esperar a que carguen algunas tarjetas, y volver a ejecutar el script. " +
                "También puedes ejecutar canvaDebugScroll() para inspeccionar candidatos."
            );

            return false;
        }


        window.canvaCancelar = false;

        window.canvaIndice.clear();


        console.log(
            "🚀 Primera ejecución."
        );

        console.log(
            "🔄 Escaneando automáticamente todas las tarjetas..."
        );

        console.log(
            "🛑 Pulsa ESC si deseas cancelar."
        );


        contenedor.scrollTop = 0;


        await esperar(600);


        let sinMovimiento = 0;

        let intento = 0;

        const MAX_INTENTOS = 500;


        while (
            intento < MAX_INTENTOS &&
            sinMovimiento < 4
        ) {

            if (window.canvaCancelar) {

                console.log(
                    "🛑 Escaneo cancelado."
                );

                window.canvaYaEscaneado = false;

                return false;
            }


            intento++;


            guardarTarjetasActuales();


            const antes =
                contenedor.scrollTop;


            const alturaAntes =
                contenedor.scrollHeight;


            contenedor.scrollTop =
                antes +
                Math.max(
                    600,
                    contenedor.clientHeight * 0.85
                );


            await esperar(400);


            const despues =
                contenedor.scrollTop;


            const alturaDespues =
                contenedor.scrollHeight;


            console.log(
                `🔄 ${window.canvaIndice.size} tarjetas guardadas`
            );


            const noSeMovio =
                Math.abs(
                    despues - antes
                ) < 5;


            const noCrecio =
                Math.abs(
                    alturaDespues -
                    alturaAntes
                ) < 5;


            if (
                noSeMovio &&
                noCrecio
            ) {

                sinMovimiento++;

                await esperar(800);

            } else {

                sinMovimiento = 0;
            }
        }


        guardarTarjetasActuales();


        if (
            window.canvaIndice.size === 0
        ) {

            console.log(
                "⚠️ El escaneo terminó, pero no se detectaron tarjetas."
            );

            window.canvaYaEscaneado = false;

            return false;
        }


        window.canvaYaEscaneado = true;


        console.log("");
        console.log(
            "✅ ESCANEO TERMINADO"
        );

        console.log(
            `📦 ${window.canvaIndice.size} tarjetas guardadas.`
        );

        console.log("");
        console.log(
            '🔎 Ya puedes usar b("texto")'
        );


        return true;
    }


    // ============================================================
    // BUSCAR ELEMENTO ACTUAL
    // ============================================================

    function encontrarNombreActual(
        nombreCompleto
    ) {

        const buscado =
            normalizar(nombreCompleto);


        return leerTarjetasActuales()
            .find(
                tarjeta =>
                    normalizar(
                        tarjeta.nombre
                    ) === buscado
            );
    }


    // ============================================================
    // RESALTAR
    // ============================================================

    function resaltar(elemento) {

        elemento.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        });


        const original = {

            fondo:
                elemento.style.backgroundColor,

            peso:
                elemento.style.fontWeight,

            outline:
                elemento.style.outline,

            outlineOffset:
                elemento.style.outlineOffset
        };


        elemento.style.backgroundColor =
            "yellow";

        elemento.style.fontWeight =
            "bold";

        elemento.style.outline =
            "5px solid red";

        elemento.style.outlineOffset =
            "4px";


        setTimeout(() => {

            elemento.style.backgroundColor =
                original.fondo;

            elemento.style.fontWeight =
                original.peso;

            elemento.style.outline =
                original.outline;

            elemento.style.outlineOffset =
                original.outlineOffset;

        }, TIEMPO_RESALTADO);
    }


    // ============================================================
    // RECOGER PANEL
    // ============================================================

    function recogerPanel() {

        const panel =
            document.getElementById(
                "canva-panel-busqueda"
            );


        if (!panel)
            return;


        const contenido =
            panel.querySelector(
                ".canva-contenido"
            );


        const pestana =
            panel.querySelector(
                ".canva-pestana"
            );


        if (contenido) {

            contenido.style.display =
                "none";
        }


        if (pestana) {

            const cantidad =
                pestana.dataset.cantidad || "";

            pestana.textContent =
                `🔎 ${cantidad}`;
        }
    }


    // ============================================================
    // IR A UNA TARJETA
    // ============================================================

    async function irANombre(
        nombreCompleto
    ) {

        window.canvaCancelar = false;


        const contenedor =
            obtenerScrollCanva();


        if (!contenedor) {

            console.log(
                "❌ No pude identificar el scroll."
            );

            return false;
        }


        console.log(
            `📍 Buscando: ${nombreCompleto}`
        );


        let encontrado =
            encontrarNombreActual(
                nombreCompleto
            );


        if (encontrado) {

            resaltar(
                encontrado.elemento
            );


            recogerPanel();


            return true;
        }


        contenedor.scrollTop = 0;


        await esperar(350);


        let sinMovimiento = 0;


        for (
            let intento = 1;
            intento <= 500;
            intento++
        ) {

            if (window.canvaCancelar) {

                console.log(
                    "🛑 Búsqueda cancelada."
                );


                recogerPanel();


                return false;
            }


            encontrado =
                encontrarNombreActual(
                    nombreCompleto
                );


            if (encontrado) {

                resaltar(
                    encontrado.elemento
                );


                console.log(
                    `✅ Encontrado: ${nombreCompleto}`
                );


                recogerPanel();


                return true;
            }


            const antes =
                contenedor.scrollTop;


            contenedor.scrollTop =
                antes +
                Math.max(
                    700,
                    contenedor.clientHeight * 0.9
                );


            await esperar(300);


            const despues =
                contenedor.scrollTop;


            if (
                Math.abs(
                    despues - antes
                ) < 5
            ) {

                sinMovimiento++;

                await esperar(500);

            } else {

                sinMovimiento = 0;
            }


            if (
                sinMovimiento >= 4
            ) {

                break;
            }
        }


        console.log(
            `❌ No pude ubicar físicamente: ${nombreCompleto}`
        );


        return false;
    }


    // ============================================================
    // CREAR PESTAÑA LATERAL
    // ============================================================

    function mostrarPanel(
        resultados
    ) {

        document
            .getElementById(
                "canva-panel-busqueda"
            )
            ?.remove();


        const panel =
            document.createElement("div");


        panel.id =
            "canva-panel-busqueda";


        Object.assign(
            panel.style,
            {

                position: "fixed",

                right: "0",

                top: "110px",

                zIndex: "999999999",

                fontFamily:
                    "Arial, sans-serif"
            }
        );


        const pestana =
            document.createElement(
                "button"
            );


        pestana.className =
            "canva-pestana";


        pestana.dataset.cantidad =
            resultados.length;


        pestana.textContent =
            `🔎 ${resultados.length}`;


        Object.assign(
            pestana.style,
            {

                width: "58px",

                height: "46px",

                border: "none",

                borderRadius:
                    "10px 0 0 10px",

                background:
                    "#7d2ae8",

                color: "white",

                cursor: "pointer",

                fontWeight: "bold",

                fontSize: "13px",

                boxShadow:
                    "0 3px 12px rgba(0,0,0,.25)"
            }
        );


        const contenido =
            document.createElement(
                "div"
            );


        contenido.className =
            "canva-contenido";


        Object.assign(
            contenido.style,
            {

                display: "none",

                position: "absolute",

                right: "58px",

                top: "0",

                width: "340px",

                maxHeight: "480px",

                overflowY: "auto",

                background: "white",

                border:
                    "1px solid #ccc",

                borderRadius: "10px",

                padding: "10px",

                boxShadow:
                    "0 5px 20px rgba(0,0,0,.25)"
            }
        );


        const titulo =
            document.createElement(
                "div"
            );


        titulo.innerHTML = `
            <strong>
                🔎 Concordancias
            </strong>

            <div style="
                font-size:11px;
                color:#777;
                margin-top:3px;
                margin-bottom:8px;
            ">
                Selecciona una dirección
            </div>
        `;


        contenido.appendChild(
            titulo
        );


        resultados.forEach(
            (resultado, indice) => {

                const boton =
                    document.createElement(
                        "button"
                    );


                boton.textContent =
                    `${indice + 1}. ${resultado.nombre}`;


                Object.assign(
                    boton.style,
                    {

                        display: "block",

                        width: "100%",

                        padding: "9px",

                        marginTop: "6px",

                        background:
                            "#f5f5f5",

                        border:
                            "1px solid #ddd",

                        borderRadius:
                            "5px",

                        cursor: "pointer",

                        textAlign: "left",

                        fontSize: "12px"
                    }
                );


                boton.onmouseenter =
                    () => {

                        boton.style.background =
                            "#ece2fa";
                    };


                boton.onmouseleave =
                    () => {

                        boton.style.background =
                            "#f5f5f5";
                    };


                boton.onclick =
                    async () => {

                        contenido.style.display =
                            "none";


                        pestana.textContent =
                            `🔎 ${resultados.length}`;


                        await irANombre(
                            resultado.nombre
                        );
                    };


                contenido.appendChild(
                    boton
                );
            }
        );


        pestana.onclick =
            () => {

                const abierto =
                    contenido.style.display !==
                    "none";


                if (abierto) {

                    contenido.style.display =
                        "none";


                    pestana.textContent =
                        `🔎 ${resultados.length}`;

                } else {

                    contenido.style.display =
                        "block";


                    pestana.textContent =
                        "❯";
                }
            };


        panel.appendChild(
            contenido
        );


        panel.appendChild(
            pestana
        );


        document.body.appendChild(
            panel
        );
    }


    // ============================================================
    // FUNCIÓN PRINCIPAL DEL USUARIO
    // ============================================================

    window.b =
        async function (
            textoBuscado
        ) {

        const buscado =
            normalizar(
                textoBuscado
            );


        if (!buscado) {

            console.log(
                "⚠️ Escribe algo para buscar."
            );

            return [];
        }


        if (
            !window.canvaYaEscaneado ||
            window.canvaIndice.size === 0
        ) {

            console.log(
                "🔄 El índice todavía no está listo."
            );

            console.log(
                "Escaneando Canva automáticamente..."
            );


            const correcto =
                await escanearTodoCanva();


            if (!correcto) {

                console.log(
                    "❌ No fue posible completar el escaneo."
                );

                return [];
            }
        }


        window.canvaCancelar = false;


        const todos = [
            ...window.canvaIndice.values()
        ];


        const exactas =
            todos.filter(
                item =>

                    normalizar(
                        item.direccion
                    ) === buscado
            );


        if (
            exactas.length === 1
        ) {

            document
                .getElementById(
                    "canva-panel-busqueda"
                )
                ?.remove();


            console.log(
                `✅ Coincidencia exacta: ${exactas[0].nombre}`
            );


            await irANombre(
                exactas[0].nombre
            );


            return exactas;
        }


        let resultados =
            todos.filter(
                item =>

                    normalizar(
                        item.direccion
                    ).includes(
                        buscado
                    )
            );


        resultados.sort(
            (a, b) =>
                a.numero - b.numero
        );


        if (
            resultados.length === 0
        ) {

            const aproximados =
                todos
                    .map(
                        item => ({
                            ...item,

                            similitud:
                                calcularSimilitud(
                                    textoBuscado,
                                    item.direccion
                                )
                        })
                    )

                    .filter(
                        item =>
                            item.similitud >= 0.60
                    )

                    .sort(
                        (a, b) =>
                            b.similitud -
                            a.similitud
                    );


            if (
                aproximados.length > 0
            ) {

                const mejorPuntaje =
                    aproximados[0]
                        .similitud;


                resultados =
                    aproximados
                        .filter(
                            item =>
                                item.similitud >=
                                mejorPuntaje - 0.12
                        )
                        .slice(0, 10);


                console.log("");
                console.log(
                    "🔎 No hubo coincidencia textual exacta."
                );

                console.log(
                    "👉 Mostrando las direcciones más parecidas:"
                );
            }
        }


        if (
            resultados.length === 0
        ) {

            document
                .getElementById(
                    "canva-panel-busqueda"
                )
                ?.remove();


            console.log(
                `❌ No se encontraron direcciones similares a "${textoBuscado}".`
            );


            return [];
        }


        console.log("");

        console.log(
            `✅ ${resultados.length} concordancia(s):`
        );


        resultados.forEach(
            (resultado, indice) => {

                console.log(
                    `${indice + 1}. ${resultado.nombre}`
                );
            }
        );


        mostrarPanel(
            resultados
        );


        return resultados;
    };


    // ============================================================
    // HERRAMIENTA DE DIAGNÓSTICO
    //
    // Si en alguna computadora vuelve a fallar la detección,
    // ejecuta canvaDebugScroll() en la consola para ver qué
    // contenedor(es) está detectando como candidatos a scroll.
    // ============================================================

    window.canvaDebugScroll =
        function () {

            const contenedor =
                obtenerScrollCanva();

            if (!contenedor) {

                console.log(
                    "❌ No se detectó ningún contenedor con scroll."
                );

                return null;
            }

            console.log(
                "✅ Contenedor detectado:",
                contenedor
            );

            console.log({
                clientWidth: contenedor.clientWidth,
                clientHeight: contenedor.clientHeight,
                scrollHeight: contenedor.scrollHeight,
                overflowY: getComputedStyle(contenedor).overflowY
            });

            return contenedor;
        };


    // ============================================================
    // ESC = CANCELAR
    // ============================================================

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                window.canvaCancelar =
                    true;


                recogerPanel();


                console.log(
                    "🛑 Operación cancelada."
                );
            }
        }
    );


    // ============================================================
    // INICIALIZACIÓN AUTOMÁTICA
    // ============================================================

    console.log(
        "✅ Buscador de Canva instalado (v2 - detección por contenido)."
    );


    if (
        !window.canvaYaEscaneado ||
        window.canvaIndice.size === 0
    ) {

        await escanearTodoCanva();

    } else {

        console.log(
            `✅ Índice existente: ${window.canvaIndice.size} tarjetas.`
        );
    }


    console.log("");
    console.log(
        "👉 Desde ahora solo usa:"
    );

    console.log(
        'b("dirección")'
    );

    console.log(
        "🩺 Si falla en alguna PC: canvaDebugScroll()"
    );

})();
```