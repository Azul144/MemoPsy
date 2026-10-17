import * as bcrypt from "bcrypt";
import type { DataSource, Repository } from "typeorm";
import { UsuarioEntity } from "@/entities";
import { esCodigoTotp, verificarCodigoTotp, usarCodigoRecuperacion } from "./mfa";

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

// Hash de una contraseña inventada. Si el email no existe, igual comparamos
// contra este hash para que la respuesta tarde lo mismo que con un email real
// (así nadie puede adivinar qué emails están registrados midiendo el tiempo).
const HASH_FALSO = bcrypt.hashSync("usuario-inexistente", 12);

export async function verificarLogin(
  dataSource: DataSource,
  email: string,
  password: string,
  codigo?: string
): Promise<UsuarioEntity> {
  const repo = dataSource.getRepository(UsuarioEntity);

  // Buscamos al usuario pidiendo explícitamente las columnas secretas (select: false)
  const usuario = await repo
    .createQueryBuilder("usuario")
    .leftJoinAndSelect("usuario.persona", "persona")
    .addSelect(["usuario.mfaSecreto", "usuario.mfaCodigosRecuperacion"])
    .where("LOWER(usuario.email) = :email", { email: email.trim().toLowerCase() })
    .getOne();

  // 1. ¿Existe el usuario?
  if (!usuario) {
    await bcrypt.compare(password, HASH_FALSO);
    throw new Error("CREDENCIALES_INVALIDAS");
  }

  // 2. ¿Está bloqueado por muchos intentos fallidos?
  if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
    throw new Error("CUENTA_BLOQUEADA");
  }

  // 3. ¿La contraseña es correcta?
  const passwordCorrecta = await bcrypt.compare(password, usuario.password);
  if (!passwordCorrecta) {
    await registrarIntentoFallido(repo, usuario);
    throw new Error("CREDENCIALES_INVALIDAS");
  }

  // 4. ¿La cuenta está activa?
  if (!usuario.activo) {
    throw new Error("CUENTA_INACTIVA");
  }

  // 5. Segundo factor (solo si el usuario lo activó)
  if (usuario.mfaHabilitado) {
    if (!codigo) {
      throw new Error("MFA_REQUERIDO");
    }

    const codigoLimpio = codigo.trim();
    let codigoValido = false;

    if (esCodigoTotp(codigoLimpio) && usuario.mfaSecreto) {
      codigoValido = verificarCodigoTotp(usuario.mfaSecreto, codigoLimpio);
    } else {
      const codigosRestantes = await usarCodigoRecuperacion(
        usuario.mfaCodigosRecuperacion,
        codigoLimpio
      );
      if (codigosRestantes !== null) {
        codigoValido = true;
        await repo.update(usuario.id, { mfaCodigosRecuperacion: codigosRestantes });
      }
    }

    if (!codigoValido) {
      await registrarIntentoFallido(repo, usuario);
      throw new Error("CODIGO_INVALIDO");
    }
  }

  // 6. ¡Todo correcto! Reiniciamos los intentos y guardamos el último acceso
  await repo.update(usuario.id, {
    intentosFallidos: 0,
    bloqueadoHasta: null,
    ultimoAcceso: new Date(),
  });

  return usuario;
}

async function registrarIntentoFallido(repo: Repository<UsuarioEntity>, usuario: UsuarioEntity) {
  const intentos = usuario.intentosFallidos + 1;

  if (intentos >= MAX_INTENTOS) {
    const bloqueadoHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000);
    await repo.update(usuario.id, { intentosFallidos: 0, bloqueadoHasta });
  } else {
    await repo.update(usuario.id, { intentosFallidos: intentos });
  }
}