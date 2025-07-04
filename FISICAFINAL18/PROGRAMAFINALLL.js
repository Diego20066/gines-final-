// Funciones de utilidad existentes (sin cambios significativos, solo mejoras de robustez)
function calcularAngulosYTipo(r12, r23, r31) {
    const rad2deg = 180 / Math.PI;
    // Usar Math.min y Math.max para evitar problemas de flotación con acos
    // que pueden llevar a valores fuera del rango [-1, 1] debido a la precisión.
    const cosA = (r12**2 + r31**2 - r23**2) / (2 * r12 * r31);
    const cosB = (r12**2 + r23**2 - r31**2) / (2 * r12 * r23);

    const A = Math.acos(Math.max(-1, Math.min(1, cosA))) * rad2deg;
    const B = Math.acos(Math.max(-1, Math.min(1, cosB))) * rad2deg;
    const C = 180 - A - B; // El tercer ángulo se calcula por diferencia para mayor precisión

    let tipo = "escaleno";
    // Usar una pequeña tolerancia (epsilon) para comparar números flotantes
    const epsilon = 1e-6;
    if (Math.abs(r12 - r23) < epsilon && Math.abs(r23 - r31) < epsilon && Math.abs(r12 - r31) < epsilon) {
        tipo = "equilátero";
    } else if (
        Math.abs(r12 - r23) < epsilon ||
        Math.abs(r12 - r31) < epsilon ||
        Math.abs(r23 - r31) < epsilon
    ) {
        tipo = "isósceles";
    }

    return { tipo, A, B, C };
}

// Convertir unidades a Coulombs
function convertirUnidad(valor, unidad) {
    switch (unidad) {
        case "nC": return valor * 1e-9;
        case "µC": return valor * 1e-6;
        case "mC": return valor * 1e-3;
        default: return valor; // Asume que es Coulombs
    }
}

// Calcular distancia entre dos puntos
function distancia(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Calcular magnitud de fuerza usando la ley de Coulomb
function calcularFuerza(q1, q2, r) {
    const k = 9e9; // Constante de Coulomb
    if (r === 0) return Infinity; // Evitar división por cero, la fuerza sería infinita
    return k * Math.abs(q1 * q2) / (r ** 2);
}

// --- FUNCIÓN CLAVE: Obtener componentes vectoriales de una fuerza ---
// Esta función determina la dirección de la fuerza (atracción/repulsión)
// y calcula sus componentes X e Y correctamente.
function getForceVectorComponents(targetX, targetY, sourceX, sourceY, forceMagnitude, qTarget, qSource) {
    const dx_source_to_target = targetX - sourceX; // Vector de la fuente al objetivo
    const dy_source_to_target = targetY - sourceY;
    const r = Math.sqrt(dx_source_to_target**2 + dy_source_to_target**2);

    if (r === 0) return { fx: 0, fy: 0 }; // Las cargas están en el mismo punto, fuerza indefinida o cero

    let fx_dir, fy_dir; // Componentes del vector unitario de la dirección de la fuerza

    if (qTarget * qSource >= 0) { // Repulsión (mismos signos)
        // La fuerza sobre la carga objetivo se aleja de la carga fuente.
        // La dirección del vector de fuerza es la misma que el vector (fuente -> objetivo).
        fx_dir = dx_source_to_target / r;
        fy_dir = dy_source_to_target / r;
    } else { // Atracción (signos opuestos)
        // La fuerza sobre la carga objetivo se dirige hacia la carga fuente.
        // La dirección del vector de fuerza es opuesta al vector (fuente -> objetivo).
        fx_dir = -dx_source_to_target / r; // Equivalente a (sourceX - targetX) / r
        fy_dir = -dy_source_to_target / r; // Equivalente a (sourceY - targetY) / r
    }

    return {
        fx: forceMagnitude * fx_dir,
        fy: forceMagnitude * fy_dir
    };
}


// --- FUNCIÓN PRINCIPAL DE CÁLCULO DE FUERZAS ---
function calcularFuerzas() {
    // 1. Recolectar y centralizar datos de cargas desde el DOM
    const charges = [
        { id: 'Q1', x: parseFloat(document.getElementById("x1").value), y: parseFloat(document.getElementById("y1").value), q: convertirUnidad(parseFloat(document.getElementById("q1").value), document.getElementById("u1").value) },
        { id: 'Q2', x: parseFloat(document.getElementById("x2").value), y: parseFloat(document.getElementById("y2").value), q: convertirUnidad(parseFloat(document.getElementById("q2").value), document.getElementById("u2").value) },
        { id: 'Q3', x: parseFloat(document.getElementById("x3").value), y: parseFloat(document.getElementById("y3").value), q: convertirUnidad(parseFloat(document.getElementById("q3").value), document.getElementById("u3").value) }
    ];

    const targetChargeId = document.getElementById("cargaObjetivo").value; // Obtener la carga objetivo seleccionada
    let targetCharge = null;
    let sourceCharges = [];

    // Identificar la carga objetivo y las cargas fuente
    charges.forEach(charge => {
        if (charge.id === targetChargeId) {
            targetCharge = charge;
        } else {
            sourceCharges.push(charge);
        }
    });

    if (!targetCharge) {
        console.error("Error: No se pudo identificar la carga objetivo.");
        return;
    }

    let fxTotal = 0;
    let fyTotal = 0;
    let procedimientoTexto = ``;
    const individualForcesForDrawing = []; // Almacena los vectores de fuerza individuales para el dibujo

    procedimientoTexto += `<h3>Cálculo de la Fuerza Resultante sobre ${targetChargeId}</h3>\n`;
    procedimientoTexto += `Carga Objetivo (${targetChargeId}):\n`;
    procedimientoTexto += `  Posición = (${targetCharge.x.toFixed(3)}, ${targetCharge.y.toFixed(3)}) m\n`;
    procedimientoTexto += `  Valor = ${targetCharge.q.toExponential(3)} C\n\n`;

    // Iterar sobre cada carga fuente para calcular su influencia en la carga objetivo
    sourceCharges.forEach(sourceCharge => {
        const r = distancia(targetCharge.x, targetCharge.y, sourceCharge.x, sourceCharge.y);
        
        procedimientoTexto += `\n--- Fuerza de ${sourceCharge.id} sobre ${targetCharge.id} ---\n`;
        procedimientoTexto += `Carga Fuente (${sourceCharge.id}): (${sourceCharge.x.toFixed(3)}, ${sourceCharge.y.toFixed(3)}) m, ${sourceCharge.q.toExponential(3)} C\n`;
        procedimientoTexto += `Distancia (${sourceCharge.id}-${targetCharge.id}): r = √[(${targetCharge.x.toFixed(3)} - ${sourceCharge.x.toFixed(3)})² + (${targetCharge.y.toFixed(3)} - ${sourceCharge.y.toFixed(3)})²] = ${r.toFixed(3)} m\n`;

        if (r === 0) {
            procedimientoTexto += `ADVERTENCIA: Las cargas ${targetCharge.id} y ${sourceCharge.id} están en la misma posición. La fuerza es indefinida (infinita). Esta interacción será ignorada para la suma.\n`;
            return; // No sumar esta fuerza si la distancia es cero
        }

        const forceMagnitude = calcularFuerza(targetCharge.q, sourceCharge.q, r);
        const forceComponents = getForceVectorComponents(
            targetCharge.x, targetCharge.y,
            sourceCharge.x, sourceCharge.y,
            forceMagnitude,
            targetCharge.q, sourceCharge.q
        );

        fxTotal += forceComponents.fx;
        fyTotal += forceComponents.fy;

        // Almacenar datos de la fuerza individual para el dibujo
        individualForcesForDrawing.push({
            fromId: sourceCharge.id,
            fx: forceComponents.fx,
            fy: forceComponents.fy,
            magnitude: forceMagnitude
        });

        procedimientoTexto += `Magnitud F(${sourceCharge.id}-${targetCharge.id}) = k * |q${sourceCharge.id} * q${targetCharge.id}| / r²\n`;
        procedimientoTexto += `= (9e9 Nm²/C²) * |${sourceCharge.q.toExponential(3)} C * ${targetCharge.q.toExponential(3)} C| / (${r.toFixed(3)} m)²\n`;
        procedimientoTexto += `= ${forceMagnitude.toExponential(3)} N\n`;
        procedimientoTexto += `Tipo de interacción: ${targetCharge.q * sourceCharge.q >= 0 ? 'Repulsión' : 'Atracción'}\n`;
        procedimientoTexto += `Vector de desplazamiento (Fuente → Objetivo): dx = (${targetCharge.x.toFixed(3)} - ${sourceCharge.x.toFixed(3)}) = ${(targetCharge.x - sourceCharge.x).toFixed(3)} m, dy = (${targetCharge.y.toFixed(3)} - ${sourceCharge.y.toFixed(3)}) = ${(targetCharge.y - sourceCharge.y).toFixed(3)} m\n`;
        procedimientoTexto += `Componentes F(${sourceCharge.id}-${targetCharge.id}):\n`;
        procedimientoTexto += `  Fx = Magnitud * (dx_unitario) = ${forceMagnitude.toExponential(3)} * (${(forceComponents.fx / forceMagnitude).toFixed(3)}) = ${forceComponents.fx.toExponential(3)} N\n`;
        procedimientoTexto += `  Fy = Magnitud * (dy_unitario) = ${forceMagnitude.toExponential(3)} * (${(forceComponents.fy / forceMagnitude).toFixed(3)}) = ${forceComponents.fy.toExponential(3)} N\n`;
    });

    // Cálculo de la fuerza resultante final
    const fTotal = Math.sqrt(fxTotal**2 + fyTotal**2);
    const anguloRad = Math.atan2(fyTotal, fxTotal);
    let anguloDeg = anguloRad * 180 / Math.PI;

    // Normalizar el ángulo a 0-360 grados
    if (anguloDeg < 0) {
        anguloDeg += 360;
    }

    procedimientoTexto += `\n--- Suma de Componentes para Fuerza Resultante sobre ${targetChargeId} ---\n`;
    procedimientoTexto += `Fx Total = Σ(Fx_individuales) = ${fxTotal.toExponential(3)} N\n`;
    procedimientoTexto += `Fy Total = Σ(Fy_individuales) = ${fyTotal.toExponential(3)} N\n`;
    procedimientoTexto += `\n--- Fuerza Resultante Final sobre ${targetChargeId} ---\n`;
    procedimientoTexto += `Magnitud FR = √(Fx_Total² + Fy_Total²) = √(${fxTotal.toExponential(3)}² + ${fyTotal.toExponential(3)}²) = ${fTotal.toExponential(3)} N\n`;
    procedimientoTexto += `Ángulo FR = atan2(Fy_Total, Fx_Total) = atan2(${fyTotal.toExponential(3)}, ${fxTotal.toExponential(3)}) = ${anguloDeg.toFixed(2)}°\n`;


    // --- Generación del Resumen para todas las cargas (en el resumen general) ---
    let resumenTexto = ``;

    // Calcular y mostrar distancias entre pares
    const r12 = distancia(charges[0].x, charges[0].y, charges[1].x, charges[1].y);
    const r23 = distancia(charges[1].x, charges[1].y, charges[2].x, charges[2].y);
    const r31 = distancia(charges[2].x, charges[2].y, charges[0].x, charges[0].y);

    resumenTexto += `Distancias entre cargas:\n`;
    resumenTexto += `Q1-Q2: ${r12.toFixed(3)} m\n`;
    resumenTexto += `Q2-Q3: ${r23.toFixed(3)} m\n`;
    resumenTexto += `Q3-Q1: ${r31.toFixed(3)} m\n\n`;

    // Calcular y mostrar magnitudes de fuerzas entre pares
    const f12_mag = calcularFuerza(charges[0].q, charges[1].q, r12);
    const f23_mag = calcularFuerza(charges[1].q, charges[2].q, r23);
    const f31_mag = calcularFuerza(charges[2].q, charges[0].q, r31);

    resumenTexto += `Magnitudes de Fuerzas entre pares (sin considerar dirección):\n`;
    resumenTexto += `F(Q1-Q2) = ${f12_mag.toExponential(3)} N\n`;
    resumenTexto += `F(Q2-Q3) = ${f23_mag.toExponential(3)} N\n`;
    resumenTexto += `F(Q3-Q1) = ${f31_mag.toExponential(3)} N\n\n`;

    // Calcular y mostrar la fuerza total para CADA carga en el resumen
    charges.forEach(currentCharge => {
        let currentFxTotal = 0;
        let currentFyTotal = 0;
        const otherCharges = charges.filter(c => c.id !== currentCharge.id); // Las otras dos cargas

        otherCharges.forEach(sourceC => {
            const r_curr_source = distancia(currentCharge.x, currentCharge.y, sourceC.x, sourceC.y);
            if (r_curr_source === 0) return; // Saltar si las cargas están en el mismo punto

            const mag_curr_source = calcularFuerza(currentCharge.q, sourceC.q, r_curr_source);
            const comp_curr_source = getForceVectorComponents(
                currentCharge.x, currentCharge.y,
                sourceC.x, sourceC.y,
                mag_curr_source,
                currentCharge.q, sourceC.q
            );
            currentFxTotal += comp_curr_source.fx;
            currentFyTotal += comp_curr_source.fy;
        });

        const currentFTotal = Math.sqrt(currentFxTotal**2 + currentFyTotal**2);
        const currentAnguloRad = Math.atan2(currentFyTotal, currentFxTotal);
        let currentAnguloDeg = currentAnguloRad * 180 / Math.PI;
        if (currentAnguloDeg < 0) currentAnguloDeg += 360; // Normalizar a 0-360

        resumenTexto += `Fuerza total sobre ${currentCharge.id}:\n`;
        resumenTexto += `  Magnitud = ${currentFTotal.toExponential(3)} N\n`;
        resumenTexto += `  Componentes = (Fx: ${currentFxTotal.toExponential(3)} N, Fy: ${currentFyTotal.toExponential(3)} N)\n`;
        resumenTexto += `  Ángulo = ${currentAnguloDeg.toFixed(2)}°\n\n`;
    });

    // Tipo de triángulo y ángulos
    const { tipo, A, B, C } = calcularAngulosYTipo(r12, r23, r31);
    resumenTexto += `🔺 Tipo de triángulo formado por las cargas: ${tipo.toUpperCase()}\n`;
    resumenTexto += `Ángulo en Q1: ${A.toFixed(2)}°\n`;
    resumenTexto += `Ángulo en Q2: ${B.toFixed(2)}°\n`;
    resumenTexto += `Ángulo en Q3: ${C.toFixed(2)}°\n`;

    // Mostrar resultados en el DOM
    document.getElementById("resumen").textContent = resumenTexto;
    document.getElementById("procedimiento").innerHTML = procedimientoTexto;
    document.getElementById("toggleProc").style.display = "inline-block";

    // Llamar a las funciones de dibujo para actualizar ambos canvas
    drawGeometricShape(charges, targetChargeId); // Nuevo canvas para la forma geométrica
    drawVectorsOnCartesianPlane(charges, targetChargeId, { fx: fxTotal, fy: fyTotal }, individualForcesForDrawing); // Canvas para vectores
}

// Alternar visibilidad del procedimiento
function toggleProcedimiento() {
    const div = document.getElementById("procedimiento");
    div.style.display = div.style.display === "none" ? "block" : "none";
}

// --- NUEVA FUNCIÓN: Dibujar la forma geométrica de las cargas ---
function drawGeometricShape(charges, targetChargeId) {
    const canvas = document.getElementById("canvasGeometric");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = 100; // Escala para el dibujo geométrico (ajustar según el tamaño del canvas)
    // Centrar el dibujo en el canvas
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;

    // Encontrar el centro de las cargas para centrar el dibujo
    let avgX = 0, avgY = 0;
    charges.forEach(c => { avgX += c.x; avgY += c.y; });
    avgX /= charges.length;
    avgY /= charges.length;

    // Dibuja las líneas del triángulo
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offsetX + (charges[0].x - avgX) * scale, offsetY - (charges[0].y - avgY) * scale);
    ctx.lineTo(offsetX + (charges[1].x - avgX) * scale, offsetY - (charges[1].y - avgY) * scale);
    ctx.lineTo(offsetX + (charges[2].x - avgX) * scale, offsetY - (charges[2].y - avgY) * scale);
    ctx.closePath();
    ctx.stroke();

    // Dibujar cargas
    charges.forEach(charge => {
        const px = offsetX + (charge.x - avgX) * scale;
        const py = offsetY - (charge.y - avgY) * scale;

        ctx.beginPath();
        ctx.arc(px, py, 7, 0, 2 * Math.PI);
        ctx.fillStyle = "#cc6699";
        ctx.fill();
        ctx.strokeStyle = "#993366";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#333";
        ctx.font = "14px Arial";
        ctx.fillText(charge.id, px + 10, py - 10);

        // Resaltar carga objetivo
        if (charge.id === targetChargeId) {
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, 2 * Math.PI);
            ctx.strokeStyle = "#ff9900";
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    });
}


// --- FUNCIÓN: Dibujar vectores en el plano cartesiano ---
function drawArrow(ctx, startX, startY, endX, endY, color, headSize = 10) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Dibujar cabeza de flecha
    const angle = Math.atan2(endY - startY, endX - startX);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headSize * Math.cos(angle - Math.PI / 6), endY - headSize * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endX - headSize * Math.cos(angle + Math.PI / 6), endY - headSize * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}

function drawVectorsOnCartesianPlane(charges, targetChargeId, resultantForce, individualForces) {
    const canvas = document.getElementById("canvasVectors");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar dibujo anterior

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 50; // Píxeles por unidad (ej., 50 píxeles por metro)

    // Dibujar cuadrícula/ejes
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i++) { // Rango de la cuadrícula
        ctx.beginPath();
        ctx.moveTo(centerX + i * scale, 0);
        ctx.lineTo(centerX + i * scale, canvas.height);
        ctx.moveTo(0, centerY + i * scale);
        ctx.lineTo(canvas.width, centerY + i * scale);
        ctx.stroke();
    }
    ctx.strokeStyle = "#aaa";
    ctx.beginPath();
    ctx.moveTo(0, centerY); ctx.lineTo(canvas.width, centerY); // Eje X
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, canvas.height); // Eje Y
    ctx.stroke();

    // Etiquetas de los ejes
    ctx.fillStyle = "#666";
    ctx.font = "11px Arial";
    for (let i = -5; i <= 5; i++) { // Etiquetas numéricas en los ejes
        if (i !== 0) {
            ctx.fillText(i.toString(), centerX + i * scale - 4, centerY + 12); // Eje X
            ctx.fillText(i.toString(), centerX + 4, centerY - i * scale + 4); // Eje Y (invertido)
        }
    }
    ctx.fillText("X", canvas.width - 15, centerY - 5);
    ctx.fillText("Y", centerX + 5, 15);


    // Dibujar cargas
    charges.forEach(charge => {
        const px = centerX + charge.x * scale;
        const py = centerY - charge.y * scale; // El eje Y del canvas está invertido

        // Dibujar punto de la carga
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, 2 * Math.PI);
        ctx.fillStyle = "#cc6699"; // Color de la carga
        ctx.fill();
        ctx.strokeStyle = "#993366";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Etiquetar carga
        ctx.fillStyle = "#333";
        ctx.font = "14px Arial";
        ctx.fillText(`${charge.id} (${charge.x.toFixed(2)}, ${charge.y.toFixed(2)})`, px + 10, py - 10);

        // Resaltar carga objetivo
        if (charge.id === targetChargeId) {
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, 2 * Math.PI);
            ctx.strokeStyle = "#ff9900"; // Resalte naranja
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    });

    // Dibujar vectores de fuerza individuales
    const targetCharge = charges.find(c => c.id === targetChargeId);
    if (targetCharge) {
        const targetPx = centerX + targetCharge.x * scale;
        const targetPy = centerY - targetCharge.y * scale;

        // Determinar la máxima magnitud de fuerza para escalar los vectores
        let maxForceMagnitude = 0;
        individualForces.forEach(f => {
            if (f.magnitude > maxForceMagnitude) maxForceMagnitude = f.magnitude;
        });
        // Si la fuerza resultante es mayor que las individuales, usarla para escalar
        if (resultantForce.magnitude && resultantForce.magnitude > maxForceMagnitude) {
            maxForceMagnitude = resultantForce.magnitude;
        }
        // Factor de escala para que los vectores no sean demasiado grandes o pequeños
        // Se usa un valor fijo (ej. 50 unidades de dibujo) para la fuerza más grande
        const vectorScaleFactor = maxForceMagnitude > 0 ? (50 / maxForceMagnitude) : 0; 

        individualForces.forEach(f => {
            const endPx = targetPx + f.fx * vectorScaleFactor;
            const endPy = targetPy - f.fy * vectorScaleFactor; // Y-axis invertido

            drawArrow(ctx, targetPx, targetPy, endPx, endPy, "#007bff"); // Azul para fuerzas individuales
            ctx.fillStyle = "#007bff";
            ctx.fillText(`F(${f.fromId})`, endPx + 5, endPy - 5);
        });

        // Dibujar vector de fuerza resultante
        // Solo dibujar si hay una fuerza resultante significativa
        if (Math.abs(resultantForce.fx) > 1e-9 || Math.abs(resultantForce.fy) > 1e-9) { 
            const resultantEndPx = targetPx + resultantForce.fx * vectorScaleFactor;
            const resultantEndPy = targetPy - resultantForce.fy * vectorScaleFactor; // Y-axis invertido

            drawArrow(ctx, targetPx, targetPy, resultantEndPx, resultantEndPy, "green", 12); // Verde para la resultante
            ctx.fillStyle = "green";
            ctx.fillText(`FR`, resultantEndPx + 5, resultantEndPy - 5);
        }
    }
}


// --- Lógica del Asistente de Coordenadas Geométricas ---
function openCoordinateAssistant() {
    document.getElementById("coordinateAssistantModal").style.display = "block";
    updateShapeParameters(); // Inicializar parámetros para la forma por defecto
    // Dibujar la forma inicial en el canvas del asistente
    drawAssistantShapePreview();
}

function closeCoordinateAssistant() {
    document.getElementById("coordinateAssistantModal").style.display = "none";
}

// Actualiza los campos de entrada de parámetros según la forma seleccionada
function updateShapeParameters() {
    const shape = document.getElementById("geometricShape").value;
    const paramsDiv = document.getElementById("shapeParameters");
    paramsDiv.innerHTML = ''; // Limpiar parámetros anteriores

    if (shape === "equilateralTriangle" || shape === "square" || shape === "line") {
        const label = shape === "line" ? "Longitud total de la línea (m):" : "Longitud del lado (m):";
        paramsDiv.innerHTML = `
            <label>${label} <input type="number" id="sideLength" step="any" value="0.5" oninput="drawAssistantShapePreview()"></label>
        `;
    }
    // Añadir más lógica aquí para otras formas (ej. isósceles, rectángulo, círculo)
    // Por ejemplo:
    /*
    else if (shape === "rightTriangle") {
        paramsDiv.innerHTML = `
            <label>Base (m): <input type="number" id="baseLength" step="any" value="0.3" oninput="drawAssistantShapePreview()"></label>
            <label>Altura (m): <input type="number" id="heightLength" step="any" value="0.4" oninput="drawAssistantShapePreview()"></label>
        `;
    }
    */
    // También actualiza el preview al cambiar la forma o el origen
    document.getElementById("originPlacement").onchange = drawAssistantShapePreview;
    drawAssistantShapePreview(); // Dibuja la vista previa inicial
}

// Genera las coordenadas basadas en la forma y el posicionamiento
function generateGeometricCoordinates() {
    const shape = document.getElementById("geometricShape").value;
    const sideLength = parseFloat(document.getElementById("sideLength").value);
    const originPlacement = document.getElementById("originPlacement").value;

    let coords = { Q1: {}, Q2: {}, Q3: {} };

    if (isNaN(sideLength) || sideLength <= 0) {
        alert("Por favor, ingrese una longitud válida (número positivo).");
        return;
    }

    if (shape === "equilateralTriangle") {
        const h = sideLength * Math.sqrt(3) / 2; // Altura de un triángulo equilátero

        if (originPlacement === "centerBase") {
            // Q1 arriba, Q2 base izquierda, Q3 base derecha
            coords.Q1 = { x: 0, y: h };
            coords.Q2 = { x: -sideLength / 2, y: 0 };
            coords.Q3 = { x: sideLength / 2, y: 0 };
        } else if (originPlacement === "vertex1") {
            // Q1 en (0,0), Q2 en el eje X, Q3 calculado
            coords.Q1 = { x: 0, y: 0 };
            coords.Q2 = { x: sideLength, y: 0 };
            coords.Q3 = { x: sideLength / 2, y: h };
        } else if (originPlacement === "centerFigure") { // Centro del triángulo en (0,0)
            const circumradius = sideLength / Math.sqrt(3); // Radio de la circunferencia circunscrita
            coords.Q1 = { x: 0, y: circumradius };
            coords.Q2 = { x: -sideLength / 2, y: -circumradius / 2 };
            coords.Q3 = { x: sideLength / 2, y: -circumradius / 2 };
        }
    } else if (shape === "square") {
        if (originPlacement === "centerFigure") {
            const halfSide = sideLength / 2;
            coords.Q1 = { x: -halfSide, y: halfSide }; // Esquina superior izquierda
            coords.Q2 = { x: halfSide, y: halfSide };  // Esquina superior derecha
            coords.Q3 = { x: halfSide, y: -halfSide }; // Esquina inferior derecha
            // Asume 3 vértices consecutivos si solo hay 3 cargas en un cuadrado.
        } else if (originPlacement === "vertex1") {
            coords.Q1 = { x: 0, y: 0 };
            coords.Q2 = { x: sideLength, y: 0 };
            coords.Q3 = { x: sideLength, y: sideLength };
        } else if (originPlacement === "centerBase") { // Centro del lado inferior en (0,0)
            const halfSide = sideLength / 2;
            coords.Q1 = { x: -halfSide, y: 0 };
            coords.Q2 = { x: halfSide, y: 0 };
            coords.Q3 = { x: halfSide, y: sideLength };
        }
    } else if (shape === "line") {
        // Cargas alineadas en el eje X
        if (originPlacement === "centerBase") { // Centro de la línea en (0,0)
            coords.Q1 = { x: -sideLength / 2, y: 0 };
            coords.Q2 = { x: 0, y: 0 };
            coords.Q3 = { x: sideLength / 2, y: 0 };
        } else if (originPlacement === "vertex1") { // Q1 en el origen
            coords.Q1 = { x: 0, y: 0 };
            coords.Q2 = { x: sideLength / 2, y: 0 };
            coords.Q3 = { x: sideLength, y: 0 };
        }
    }
    // Añadir más lógica para otras formas aquí...

    // Mostrar las coordenadas generadas en el asistente
    document.getElementById("genX1").textContent = coords.Q1.x !== undefined ? coords.Q1.x.toFixed(3) : 'N/A';
    document.getElementById("genY1").textContent = coords.Q1.y !== undefined ? coords.Q1.y.toFixed(3) : 'N/A';
    document.getElementById("genX2").textContent = coords.Q2.x !== undefined ? coords.Q2.x.toFixed(3) : 'N/A';
    document.getElementById("genY2").textContent = coords.Q2.y !== undefined ? coords.Q2.y.toFixed(3) : 'N/A';
    document.getElementById("genX3").textContent = coords.Q3.x !== undefined ? coords.Q3.x.toFixed(3) : 'N/A';
    document.getElementById("genY3").textContent = coords.Q3.y !== undefined ? coords.Q3.y.toFixed(3) : 'N/A';
}

// Transfiere las coordenadas generadas a los campos de entrada de la calculadora principal
function transferCoordinates() {
    // Solo transferir si las coordenadas no son 'N/A'
    if (document.getElementById("genX1").textContent !== 'N/A') {
        document.getElementById("x1").value = document.getElementById("genX1").textContent;
        document.getElementById("y1").value = document.getElementById("genY1").textContent;
        document.getElementById("x2").value = document.getElementById("genX2").textContent;
        document.getElementById("y2").value = document.getElementById("genY2").textContent;
        document.getElementById("x3").value = document.getElementById("genX3").textContent;
        document.getElementById("y3").value = document.getElementById("genY3").textContent;
    }
    closeCoordinateAssistant(); // Cierra el asistente después de transferir
}

// --- NUEVA FUNCIÓN: Dibujar la vista previa de la forma en el asistente ---
function drawAssistantShapePreview() {
    const canvas = document.getElementById("assistantCanvasPreview");
    if (!canvas) { // Si el canvas no existe (ej. en el modal aún no se ha cargado)
        // Crea el canvas si no existe. Esto es una solución temporal si el modal no está en el DOM al inicio.
        // Una mejor práctica sería inicializarlo cuando el modal se abre por primera vez.
        const previewContainer = document.querySelector('.assistant-controls');
        if (!previewContainer) return; // No hay donde dibujar
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'assistantCanvasPreview';
        newCanvas.width = 250;
        newCanvas.height = 200;
        newCanvas.style.border = '1px solid #ddd';
        newCanvas.style.marginTop = '10px';
        previewContainer.appendChild(newCanvas);
        canvas = newCanvas; // Asigna el nuevo canvas
    }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const shape = document.getElementById("geometricShape").value;
    const sideLength = parseFloat(document.getElementById("sideLength") ? document.getElementById("sideLength").value : 0.5);
    const originPlacement = document.getElementById("originPlacement").value;

    if (isNaN(sideLength) || sideLength <= 0) return;

    let tempCoords = { Q1: {}, Q2: {}, Q3: {} };
    // Reutiliza la lógica de generateGeometricCoordinates para obtener las coordenadas temporales
    if (shape === "equilateralTriangle") {
        const h = sideLength * Math.sqrt(3) / 2;
        if (originPlacement === "centerBase") {
            tempCoords.Q1 = { x: 0, y: h }; tempCoords.Q2 = { x: -sideLength / 2, y: 0 }; tempCoords.Q3 = { x: sideLength / 2, y: 0 };
        } else if (originPlacement === "vertex1") {
            tempCoords.Q1 = { x: 0, y: 0 }; tempCoords.Q2 = { x: sideLength, y: 0 }; tempCoords.Q3 = { x: sideLength / 2, y: h };
        } else if (originPlacement === "centerFigure") {
            const circumradius = sideLength / Math.sqrt(3);
            tempCoords.Q1 = { x: 0, y: circumradius }; tempCoords.Q2 = { x: -sideLength / 2, y: -circumradius / 2 }; tempCoords.Q3 = { x: sideLength / 2, y: -circumradius / 2 };
        }
    } else if (shape === "square") {
        if (originPlacement === "centerFigure") {
            const halfSide = sideLength / 2;
            tempCoords.Q1 = { x: -halfSide, y: halfSide }; tempCoords.Q2 = { x: halfSide, y: halfSide }; tempCoords.Q3 = { x: halfSide, y: -halfSide };
        } else if (originPlacement === "vertex1") {
            tempCoords.Q1 = { x: 0, y: 0 }; tempCoords.Q2 = { x: sideLength, y: 0 }; tempCoords.Q3 = { x: sideLength, y: sideLength };
        } else if (originPlacement === "centerBase") {
            const halfSide = sideLength / 2;
            tempCoords.Q1 = { x: -halfSide, y: 0 }; tempCoords.Q2 = { x: halfSide, y: 0 }; tempCoords.Q3 = { x: halfSide, y: sideLength };
        }
    } else if (shape === "line") {
        if (originPlacement === "centerBase") {
            tempCoords.Q1 = { x: -sideLength / 2, y: 0 }; tempCoords.Q2 = { x: 0, y: 0 }; tempCoords.Q3 = { x: sideLength / 2, y: 0 };
        } else if (originPlacement === "vertex1") {
            tempCoords.Q1 = { x: 0, y: 0 }; tempCoords.Q2 = { x: sideLength / 2, y: 0 }; tempCoords.Q3 = { x: sideLength, y: 0 };
        }
    }
    // Añadir más lógica para otras formas aquí...

    // Escalar y centrar el dibujo en el canvas del asistente
    const allCoords = [tempCoords.Q1, tempCoords.Q2, tempCoords.Q3].filter(c => c.x !== undefined);
    if (allCoords.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    allCoords.forEach(c => {
        if (c.x < minX) minX = c.x;
        if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.y > maxY) maxY = c.y;
    });

    const dataWidth = maxX - minX;
    const dataHeight = maxY - minY;
    const padding = 0.2; // 20% de padding
    const scaleX = canvas.width / (dataWidth * (1 + padding));
    const scaleY = canvas.height / (dataHeight * (1 + padding));
    const drawScale = Math.min(scaleX, scaleY);

    const drawOffsetX = canvas.width / 2 - (minX + maxX) / 2 * drawScale;
    const drawOffsetY = canvas.height / 2 + (minY + maxY) / 2 * drawScale; // Y-axis invertido

    // Dibujar ejes en el asistente
    ctx.strokeStyle = "#ddd";
    ctx.beginPath();
    ctx.moveTo(0, drawOffsetY); ctx.lineTo(canvas.width, drawOffsetY); // Eje X
    ctx.moveTo(drawOffsetX, 0); ctx.lineTo(drawOffsetX, canvas.height); // Eje Y
    ctx.stroke();

    // Dibuja la forma
    ctx.strokeStyle = "#cc6699";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (allCoords.length >= 2) {
        ctx.moveTo(drawOffsetX + allCoords[0].x * drawScale, drawOffsetY - allCoords[0].y * drawScale);
        for (let i = 1; i < allCoords.length; i++) {
            ctx.lineTo(drawOffsetX + allCoords[i].x * drawScale, drawOffsetY - allCoords[i].y * drawScale);
        }
        if (shape !== "line") { // Cerrar el camino si no es una línea
             ctx.closePath();
        }
    }
    ctx.stroke();

    // Dibujar puntos de las cargas
    ctx.fillStyle = "#cc6699";
    allCoords.forEach((c, index) => {
        const px = drawOffsetX + c.x * drawScale;
        const py = drawOffsetY - c.y * drawScale;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillText(`Q${index + 1}`, px + 8, py - 8);
    });
}


// Establecer valores iniciales para el problema del triángulo equilátero al cargar la página
document.addEventListener('DOMContentLoaded', (event) => {
    // Puedes llamar a calcularFuerzas() aquí si quieres que se muestre un resultado inicial al cargar.
    // calcularFuerzas();
});
