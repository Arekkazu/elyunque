export default function StatCard({ titulo, valor, detalle, tono }) {
  return (
    <div className={`stat ${tono || ''}`}>
      <span className="stat-titulo">{titulo}</span>
      <strong className="stat-valor">{valor}</strong>
      {detalle && <span className="stat-detalle">{detalle}</span>}
    </div>
  );
}
