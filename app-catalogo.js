// Configuración de Supabase
const SUPABASE_URL = 'https://iomcsjnfqgaqjkqiaasa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Eba770pLaLYdxZhE0dH-nA_yJURtpIh';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let carrito = [];

// 1. Cargar catálogo
async function cargarCatalogo() {
    const contenedor = document.getElementById('contenedor-productos');
    contenedor.innerHTML = '<p>Cargando catálogo de DIONOVEDADES...</p>';

    const { data: prendas, error } = await _supabase
        .from('prendas')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        contenedor.innerHTML = '<p>Error al cargar el catálogo.</p>';
        console.error(error);
        return;
    }

    if (prendas.length === 0) {
        contenedor.innerHTML = '<p>No hay prendas disponibles por el momento.</p>';
        return;
    }

    contenedor.innerHTML = '';
    prendas.forEach(p => {
        const listaTallas = p.tallas ? p.tallas.split(',') : ['Única'];
        
        // Tallas adaptadas para pantallas táctiles (móviles)
        const botonesTallas = listaTallas.map((t, index) => {
            const tallaLimpia = t.trim();
            const isChecked = index === 0 ? 'checked' : '';
            return `
                <label style="display: inline-block; margin: 3px; padding: 6px 12px; background: var(--rosa-suave); border: 1px solid var(--rosa-principal); border-radius: 15px; cursor: pointer; font-size: 0.9rem; font-weight: bold;">
                    <input type="radio" name="talla-${p.id}" value="${tallaLimpia}" ${isChecked} ${!p.activa ? 'disabled' : ''} style="margin-right: 4px;">
                    ${tallaLimpia}
                </label>
            `;
        }).join('');

        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-producto';
        tarjeta.dataset.nombre = p.nombre.toLowerCase();

        tarjeta.innerHTML = `
            <div style="position: relative;">
                <img src="${p.imagen_url}" alt="${p.nombre}" style="width: 100%; max-height: 250px; object-fit: cover; border-radius: 6px; ${!p.activa ? 'opacity: 0.5; filter: grayscale(80%);' : ''}">
                ${!p.activa ? '<span style="position: absolute; top: 10px; right: 10px; background: #ff4d4d; color: white; padding: 4px 8px; font-weight: bold; border-radius: 4px; font-size: 12px;">NO DISPONIBLE</span>' : ''}
            </div>

            <h3>${p.nombre}</h3>
            <p class="precio">$${parseFloat(p.precio).toFixed(2)}</p>
            <p><small>${p.tela || ''}</small></p>
            
            <div style="margin: 10px 0;">
                <p style="margin-bottom: 5px; font-weight: bold;">Talla:</p>
                <div id="tallas-container-${p.id}">
                    ${botonesTallas}
                </div>
                
                <div style="margin-top: 10px;">
                    <label>Cant: </label>
                    <input type="number" id="cant-${p.id}" value="1" min="1" style="width: 45px; text-align: center;" ${!p.activa ? 'disabled' : ''}>
                </div>
            </div>

            ${p.activa 
                ? `<button onclick="agregarAlCarrito(${p.id}, '${p.nombre}', ${p.precio})">🛒 Agregar</button>`
                : `<button disabled style="background-color: #ccc; cursor: not-allowed;">Agotado</button>`
            }
        `;
        contenedor.appendChild(tarjeta);
    });

    activarBuscador();
}

// 2. Lógica del Buscador en tiempo real
function activarBuscador() {
    const inputBuscar = document.getElementById('buscar');

    if (inputBuscar) {
        inputBuscar.addEventListener('input', (e) => {
            const texto = e.target.value.toLowerCase().trim();
            const tarjetas = document.querySelectorAll('.tarjeta-producto');

            tarjetas.forEach(tarjeta => {
                const nombre = tarjeta.dataset.nombre || '';
                if (nombre.includes(texto)) {
                    tarjeta.style.display = 'block';
                } else {
                    tarjeta.style.display = 'none';
                }
            });
        });
    }
}

// 3. Agregar items al carrito
function agregarAlCarrito(id, nombre, precio) {
    const radioSeleccionado = document.querySelector(`input[name="talla-${id}"]:checked`);
    
    if (!radioSeleccionado) {
        alert('Por favor selecciona una talla.');
        return;
    }

    const talla = radioSeleccionado.value;
    const cantidad = parseInt(document.getElementById(`cant-${id}`).value);

    const itemExistente = carrito.find(item => item.id === id && item.talla === talla);
    
    if (itemExistente) {
        itemExistente.cantidad += cantidad;
    } else {
        carrito.push({ id, nombre, precio, talla, cantidad });
    }

    actualizarInterfazCarrito();
}

// Eliminar prendas del carrito
function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarInterfazCarrito();
}

// Mostrar/Ocultar Modal
function toggleCarritoModal() {
    const modal = document.getElementById('modal-carrito');
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else {
        modal.style.display = 'flex';
    }
}

// 4. Actualizar interfaz y enlace de WhatsApp
function actualizarInterfazCarrito() {
    const cantTotal = document.getElementById('cant-total-carrito');
    const montoTotalBarra = document.getElementById('monto-total-carrito');
    const modalTotal = document.getElementById('modal-total-monto');
    const listaItems = document.getElementById('lista-items-carrito');
    const btnWA = document.getElementById('btn-enviar-whatsapp');

    let total = 0;
    let cantidadProductos = 0;
    listaItems.innerHTML = '';

    if (carrito.length === 0) {
        listaItems.innerHTML = '<p style="text-align:center; color: #666;">El carrito está vacío.</p>';
    } else {
        carrito.forEach((item, index) => {
            const subtotal = item.precio * item.cantidad;
            total += subtotal;
            cantidadProductos += item.cantidad;

            const div = document.createElement('div');
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;';
            div.innerHTML = `
                <div>
                    <strong>${item.nombre}</strong><br>
                    <small style="color: #555;">Talla: ${item.talla} | Cantidad: ${item.cantidad}</small>
                </div>
                <div style="text-align: right;">
                    <span style="font-weight: bold;">$${subtotal.toFixed(2)}</span>
                    <button onclick="eliminarDelCarrito(${index})" style="background: none; border: none; color: #ff4d4d; cursor: pointer; margin-left: 8px; font-size: 16px;">🗑️</button>
                </div>
            `;
            listaItems.appendChild(div);
        });
    }

    cantTotal.textContent = cantidadProductos;
    montoTotalBarra.textContent = total.toFixed(2);
    modalTotal.textContent = total.toFixed(2);

    // Formato de WhatsApp
    const telefono = "584241906779";
    if (carrito.length === 0) {
        btnWA.href = "#";
        btnWA.style.opacity = '0.5';
        btnWA.style.pointerEvents = 'none';
        return;
    }

    btnWA.style.opacity = '1';
    btnWA.style.pointerEvents = 'auto';

    let mensaje = "¡Buenos días! Deseo consultar las siguientes prendas:\n\n";

    carrito.forEach((item) => {
        mensaje += `• *${item.nombre}* (${item.cantidad} unidad/es) - Talla: ${item.talla}\n`;
    });

    mensaje += `\n*Monto Total Estimado: $${total.toFixed(2)}*\n\n`;
    mensaje += "¿Qué colores tienen disponibles?";

    btnWA.href = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}

document.addEventListener('DOMContentLoaded', cargarCatalogo);