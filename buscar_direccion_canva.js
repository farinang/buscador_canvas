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


        // --------------------------------------------------------
        // CASO IMPORTANTE:
        //
        // Buscado:
        // 10 Poplar Trl
        //
        // Canva:
        // 10 Poplar
        //
        // Uno contiene al otro, así que se considera
        // una coincidencia bastante fuerte.
        // --------------------------------------------------------

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
    // IDENTIFICAR SCROLL DE CANVA
    // ============================================================

    function obtenerScrollCanva() {

        const candidatos = [
            ...document.querySelectorAll("*")
        ].filter(el => {

            if (!(el instanceof HTMLElement))
                return false;

            const estilo =
                getComputedStyle(el);

            const tieneScroll =
                el.scrollHeight >
                el.clientHeight + 150;

            const overflowValido =
                estilo.overflowY === "auto" ||
                estilo.overflowY === "scroll";

            return (
                tieneScroll &&
                overflowValido &&
                el.clientHeight > 300 &&
                el.clientWidth > 400
            );
        });


        candidatos.sort(
            (a, b) =>
                (b.clientWidth * b.clientHeight) -
                (a.clientWidth * a.clientHeight)
        );


        return candidatos[0] || null;
    }


    // ============================================================
    // OBTENER NOMBRE COMPLETO
    //
    // Ejemplo:
    //
    // 220 -
    // 86 Linden Ave
    //
    // devuelve:
    //
    // 220 - 86 Linden Ave
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


        const contenedor =
            obtenerScrollCanva();


        if (!contenedor) {

            console.log(
                "❌ No pude identificar el scroll de Canva."
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
            '🔎 Ya puedes usar buscarDireccion("texto")'
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


        // ========================================================
        // PESTAÑA
        // ========================================================

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


        // ========================================================
        // CONTENIDO
        // ========================================================

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


        // ========================================================
        // BOTONES
        // ========================================================

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


        // ========================================================
        // ABRIR / CERRAR
        // ========================================================

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

    window.buscarDireccion =
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


        // ========================================================
        // 1. COINCIDENCIA EXACTA
        // ========================================================

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


        // ========================================================
        // 2. CONCORDANCIAS NORMALES
        // ========================================================

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


        // ========================================================
        // 3. SI NO ENCUENTRA:
        //    BUSCAR LAS MÁS PARECIDAS
        // ========================================================

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

                    // Evitar resultados demasiado diferentes
                    .filter(
                        item =>
                            item.similitud >= 0.60
                    )

                    // Más parecido primero
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


                /*
                 * Solo mostramos resultados que estén
                 * razonablemente cerca del mejor.
                 */

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


        // ========================================================
        // SIN RESULTADOS
        // ========================================================

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


        // ========================================================
        // MOSTRAR RESULTADOS
        // ========================================================

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
        "✅ Buscador de Canva instalado."
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
        'buscarDireccion("dirección")'
    );

})();