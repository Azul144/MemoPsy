// horario-pactado.entity.ts
// RF 3.1 - Horario fijo pactado entre el psicólogo y un paciente (día de la semana y hora).
// A partir de estos horarios MemoPsy crea solos los turnos de las próximas semanas.
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "horario_pactado" })
export class HorarioPactadoEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_horario_pactado" })
  id: string;

  @Column({ name: "id_psicologo", type: "int" })
  psicologoId: number;

  @Column({ name: "id_paciente", type: "int" })
  pacienteId: number;

  // 1 = lunes ... 5 = viernes
  @Column({ name: "dia_semana", type: "tinyint" })
  diaSemana: number;

  // "HH:mm:ss"
  @Column({ name: "hora_inicio", type: "time" })
  horaInicio: string;

  @Column({ name: "id_modalidad", type: "int" })
  modalidadId: number;

  @Column({ name: "activo", type: "tinyint", width: 1, default: 1 })
  activo: boolean;

  @Column({ name: "creado", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  creado: Date;
}
