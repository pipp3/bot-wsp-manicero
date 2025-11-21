import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar usuarios desde el archivo JSON
const usuariosPath = path.join(__dirname, '../data/usuarios.json');
let usuarios = JSON.parse(fs.readFileSync(usuariosPath, 'utf8'));

// Cargar productos desde el archivo JSON
const productosPath = path.join(__dirname, '../data/productos.json');
let productos = JSON.parse(fs.readFileSync(productosPath, 'utf8'));

// Buscar usuario por teléfono
export function buscarUsuarioPorTelefono(telefono) {
  return usuarios.find((u) => u.telefono === telefono) || null;
}

// Registrar nuevo usuario
export function registrarUsuario(telefono, nombre, apellido) {
  const nuevoUsuario = {
    telefono: telefono,
    nombre: `${nombre} ${apellido}`
  };
  
  usuarios.push(nuevoUsuario);
  
  // Guardar en el archivo JSON
  fs.writeFileSync(usuariosPath, JSON.stringify(usuarios, null, 2), 'utf8');
  
  console.log(`✅ Usuario registrado: ${nuevoUsuario.nombre} - ${telefono}`);
  return nuevoUsuario;
}

// Buscar producto por nombre exacto (simulación de endpoint)
export function buscarProductoPorNombre(nombreProducto) {
  const producto = productos.find((p) => 
    p.nombre.toLowerCase() === nombreProducto.toLowerCase() && p.activo
  );
  
  if (!producto) {
    return null;
  }
  
  // Retornar solo nombre, precio_minorista y disponibilidad de stock
  return {
    nombre: producto.nombre,
    precio_minorista: producto.precio_minorista,
    hay_stock: producto.stock > 0
  };
}

