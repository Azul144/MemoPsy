// horario-disponible.entity.ts
// RF 4.3 - Franja semanal que el psicólogo habilita para que sus pacientes reprogramen turnos.
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "horario_disponible" })
export class HorarioDisponibleEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_horario_disponible" })
  id: string;

  @Column({ name: "id_psicologo", type: "int" })
  psicologoId: number;

  // 1 = lunes ... 5 = viernes
  @Column({ name: "dia_semana", type: "tinyint" })
  diaSemana: number;

  // "HH:mm:ss"
  @Column({ name: "hora_inicio", type: "time" })
  horaInicio: string;

  @Column({ name: "hora_fin", type: "time" })
  horaFin: string;
}
