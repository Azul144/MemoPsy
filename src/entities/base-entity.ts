import { PrimaryGeneratedColumn } from "typeorm"

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  // En MySQL es un entero autoincremental; en el código se maneja como texto (igual que las claves de las tablas intermedias)
  id: string
}