import { PASOS } from '../services/format';

const TERMINALES = { rechazada: 'Rechazada', cancelada: 'Cancelada' };

/** Indicador de progreso del ciclo de vida de una solicitud. */
export default function EstadoStepper({ estado }) {
  if (TERMINALES[estado]) {
    return <p className={`badge ${estado}`} role="status">{TERMINALES[estado]}</p>;
  }
  const actual = PASOS.indexOf(estado);
  return (
    <ol className="stepper" aria-label="Progreso de la solicitud">
      {PASOS.map((p, i) => (
        <li key={p} className={i < actual ? 'hecho' : i === actual ? 'actual' : ''} aria-current={i === actual ? 'step' : undefined}>
          <span className="punto">{i < actual ? '✓' : i + 1}</span>
          <span className="etiqueta">{p}</span>
        </li>
      ))}
    </ol>
  );
}
