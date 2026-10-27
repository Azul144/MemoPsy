export abstract class BaseEntity {
  // Cada entidad declara su clave con @PrimaryGeneratedColumn, porque en la base se llama id_<tabla> (id_sesion, id_usuario...).
  // En MySQL es un entero autoincremental; en el código se maneja como texto (igual que las claves de las tablas intermedias)
  id: string
}