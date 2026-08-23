// Configuración de Supabase
const SUPABASE_URL = 'https://iomcsjnfqgaqjkqiaasa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Eba770pLaLYdxZhE0dH-nA_yJURtpIh';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. Guardar nueva prenda
document.getElementById('form-producto').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const precio = document.getElementById('precio').value;
    const categoria = document.getElementById('categoria').value;
    const tela = document.getElementById('tela').value;
    const tallas = document.getElementById('tallas').value;
    const imagenFile = document.getElementById('imagen').files[0];

    try {
        // Generar un nombre único para la imagen
        const extension = imagenFile.name.split('.').pop();
        const nombreImagen = `${Date.now()}.${extension}`;

        // Subir la imagen al Bucket "fotos-ropa"
        const { error: imgError } = await _supabase.storage
            .from('fotos-ropa')
            .upload(nombreImagen, imagenFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (imgError) throw imgError;

        // URL pública limpia y directa de Supabase
        const imagen_url = `${SUPABASE_URL}/storage/v1/object/public/fotos-ropa/${nombreImagen}`;

        // Insertar la prenda en la base de datos
        const { error: dbError } = await _supabase
            .from('prendas')
            .insert([{ nombre, precio, categoria, tela, tallas, imagen_url, activa: true }]);

        if (dbError) throw dbError;

        // ÉXITO SILENCIOSO: Resetea el formulario y recarga inventario sin alertas molestas
        document.getElementById('form-producto').reset();
        cargarInventario();

    } catch (error) {
        // SOLO SE MUESTRA SI HAY ERROR
        alert('Error al guardar la prenda. Revisa la consola para más detalles.');
        console.error(error);
    }
});

// 2. Cargar inventario en el admin
async function cargarInventario() {
    const tbody = document.getElementById('tabla-inventario');
    tbody.innerHTML = '<tr><td colspan="6">Cargando inventario...</td></tr>';

    const { data: prendas, error } = await _supabase
        .from('prendas')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        tbody.innerHTML = '<tr><td colspan="6">Error al cargar datos.</td></tr>';
        console.error(error);
        return;
    }

    tbody.innerHTML = '';
    prendas.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${p.imagen_url}" width="50" height="50" style="object-fit:cover; border-radius:5px;" onerror="this.src='https://via.placeholder.com/50?text=Error'"></td>
            <td>${p.nombre}</td>
            <td>${p.categoria}</td>
            <td>$${parseFloat(p.precio).toFixed(2)}</td>
            <td>
                <button onclick="cambiarEstado(${p.id}, ${!p.activa})">
                    ${p.activa ? '🟢 Activa' : '🔴 Inactiva'}
                </button>
            </td>
            <td>
                <button onclick="eliminarPrenda(${p.id})" style="background-color: #ff4d4d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">🗑️ Borrar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 3. Activar/Desactivar prenda
async function cambiarEstado(id, nuevoEstado) {
    const { error } = await _supabase
        .from('prendas')
        .update({ activa: nuevoEstado })
        .eq('id', id);

    if (error) {
        alert("Error al actualizar el estado de la prenda.");
        console.error(error);
    } else {
        // Actualiza la tabla silenciosamente
        cargarInventario();
    }
}

// 4. Eliminar prenda
async function eliminarPrenda(id) {
    if (confirm('¿Estás seguro de eliminar esta prenda?')) {
        const { error } = await _supabase
            .from('prendas')
            .delete()
            .eq('id', id);

        if (error) {
            alert("Error al eliminar la prenda.");
            console.error(error);
        } else {
            // Actualiza la tabla silenciosamente
            cargarInventario();
        }
    }
}

document.addEventListener('DOMContentLoaded', cargarInventario);