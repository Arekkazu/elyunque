"""Genera 01-arquitectura.png (arquitectura en capas, blanco y negro). Uso: python3 01-arquitectura.py"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

fig, ax = plt.subplots(figsize=(10, 8.4), dpi=170)
ax.set_xlim(0, 100); ax.set_ylim(0, 84); ax.axis('off')

def capa(y, h, titulo):
    ax.add_patch(FancyBboxPatch((1, y), 98, h, boxstyle='round,pad=0.2,rounding_size=1.5', fc='white', ec='black', lw=1.8))
    ax.text(3, y + h - 1.4, titulo, ha='left', va='top', fontsize=10, fontweight='bold')

def caja(x, y, w, h, titulo, detalle='', estilo='-'):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.2,rounding_size=1.0', fc='white', ec='black', lw=1.2, ls=estilo))
    if detalle:
        ax.text(x + w / 2, y + h - 1.6, titulo, ha='center', va='top', fontsize=9.5, fontweight='bold')
        ax.text(x + w / 2, y + h - 4.6, detalle, ha='center', va='top', fontsize=8, linespacing=1.5)
    else:
        ax.text(x + w / 2, y + h / 2, titulo, ha='center', va='center', fontsize=9.5, fontweight='bold')

def flecha(x, y0, y1, texto=''):
    ax.annotate('', xy=(x, y1), xytext=(x, y0), arrowprops=dict(arrowstyle='-|>', lw=1.5, color='black'))
    if texto:
        ax.text(x + 1.5, (y0 + y1) / 2, texto, fontsize=8.5, va='center')

# Cliente
capa(73, 10, 'Cliente')
caja(33, 74, 34, 5.2, 'Usuario (navegador)')
# Presentación
capa(53, 16, 'Presentación — contenedor frontend')
caja(5, 54.2, 42, 9.8, 'React + Vite', 'Router por rol · AuthContext\naxios con JWT e interceptores')
caja(53, 54.2, 42, 9.8, 'Nginx', 'Sirve la SPA y reenvía\n/api al backend')
# API
capa(31, 18, 'API REST — contenedor backend (Node.js / Express)')
caja(5, 32.2, 42, 11.8, 'Middlewares', 'Helmet · CORS · límite de intentos · validación\nlogs (Morgan / Winston) · métricas · JWT y roles')
caja(53, 32.2, 42, 11.8, 'Rutas', 'auth · usuarios · clientes · solicitudes\ncotizaciones · ventas · /health · /metrics')
# Negocio y datos
capa(11, 17, 'Lógica de negocio y datos')
caja(5, 12.2, 26, 11.8, 'Servicios', 'cálculo · cotización\nventa · autenticación')
caja(37, 12.2, 26, 11.8, 'Acceso a datos', 'pg · consultas\nparametrizadas')
caja(69, 12.2, 26, 11.8, 'PostgreSQL', 'usuarios · clientes\nsolicitudes · ventas')
# Operación (líneas punteadas = herramientas externas)
caja(3, 0.4, 29, 8.4, 'GitHub Actions', 'CI · CD (GHCR + SSH)', estilo='--')
caja(36, 0.4, 29, 8.4, 'access.log · error.log', 'JSON · panel Monitoreo', estilo='--')
caja(69, 0.4, 28, 8.4, 'UptimeRobot', 'consulta GET /health', estilo='--')

flecha(50, 73, 69.4, 'HTTPS')
flecha(50, 53, 49.4, '/api/*')
flecha(50, 31, 28.4)
for x0, x1 in ((31, 37), (63, 69)):
    ax.annotate('', xy=(x1, 18), xytext=(x0, 18), arrowprops=dict(arrowstyle='-|>', lw=1.4))
fig.savefig('01-arquitectura.png', bbox_inches='tight', facecolor='white')
