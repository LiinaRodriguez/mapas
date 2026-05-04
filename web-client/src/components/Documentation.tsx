import { useState, useEffect } from 'react';
import { 
  Code2, Server, Database,
  ShieldCheck, Cpu, FileText, Book, 
  ChevronRight, ArrowLeft, Layout, Globe
} from 'lucide-react';

export function Documentation() {
  const [activeSection, setActiveSection] = useState('introduccion');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['introduccion', 'stack', 'mecanicas', 'despliegue', 'galeria'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="docs-page" style={{ 
      background: 'var(--bg-primary)', 
      minHeight: '100vh', 
      display: 'flex',
      color: 'var(--text-primary)'
    }}>
      {/* Docs Sidebar */}
      <aside style={{ 
        width: '280px', 
        height: '100vh', 
        position: 'fixed', 
        left: 0, 
        top: 0, 
        borderRight: '1px solid var(--border-subtle)',
        padding: '32px 24px',
        background: 'var(--bg-secondary)',
        zIndex: 100,
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{ backgroundColor: 'var(--accent)', color: 'white', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>M</div>
          <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '0.5px' }}>DOCUMENTACIÓN</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <DocNavItem 
            icon={<Book size={18} />} 
            label="Introducción" 
            active={activeSection === 'introduccion'} 
            onClick={() => scrollToSection('introduccion')} 
          />
          <DocNavItem 
            icon={<Cpu size={18} />} 
            label="Arquitectura & Stack" 
            active={activeSection === 'stack'} 
            onClick={() => scrollToSection('stack')} 
          />
          <DocNavItem 
            icon={<Layout size={18} />} 
            label="Mecánicas" 
            active={activeSection === 'mecanicas'} 
            onClick={() => scrollToSection('mecanicas')} 
          />
          <DocNavItem 
            icon={<Globe size={18} />} 
            label="Despliegue" 
            active={activeSection === 'despliegue'} 
            onClick={() => scrollToSection('despliegue')} 
          />
          <DocNavItem 
            icon={<FileText size={18} />} 
            label="Galería Visual" 
            active={activeSection === 'galeria'} 
            onClick={() => scrollToSection('galeria')} 
          />
        </nav>

        <div style={{ position: 'absolute', bottom: '32px', left: '24px', right: '24px' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }} className="btn btn-secondary btn-block" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <ArrowLeft size={16} /> Volver a la App
          </a>
        </div>
      </aside>

      {/* Docs Content */}
      <main style={{ 
        marginLeft: '280px', 
        flex: 1, 
        padding: '80px 10%', 
        overflowY: 'auto',
        height: '100vh'
      }}>
        
        <header style={{ marginBottom: '80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontWeight: 600, fontSize: '14px', marginBottom: '16px' }}>
            <ShieldCheck size={16} /> DOCUMENTACIÓN DEL PROYECTO
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: 800, marginBottom: '24px', lineHeight: 1.1 }}>
            Gestión y Exportación Cartográfica
          </h1>
          <p style={{ fontSize: '20px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '800px' }}>
            Una herramienta enfocada en la visualización ágil de capas SHP/KML y la generación de reportes técnicos profesionales en formato PDF y GeoTIFF.
          </p>
        </header>

        <section id="introduccion" style={{ marginBottom: '100px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '32px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            1. Introducción
          </h2>
          <div style={{ fontSize: '17px', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
            <p style={{ marginBottom: '24px' }}>
              Este proyecto ha sido desarrollado con el objetivo principal de facilitar la carga y visualización de archivos espaciales (Shapefile y KML) de manera rápida y sencilla, sin necesidad de instalaciones complejas.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginTop: '40px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '12px' }}>Objetivo</h3>
                <p style={{ fontSize: '14px' }}>Proveer una interfaz limpia para la visualización de datos cartográficos y la gestión de proyectos.</p>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '12px' }}>Funcionalidad</h3>
                <p style={{ fontSize: '14px' }}>Especializado en la generación de reportes técnicos en PDF y la exportación de GeoTIFF georreferenciados.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="stack" style={{ marginBottom: '100px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '32px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            2. Arquitectura & Stack
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <StackItem 
              icon={<Code2 size={32} color="#3b82f6" />}
              title="Frontend Reactivo"
              description="Uso de React 19 y MapLibre GL. Aprovechamos WebGL para el renderizado de mapas, lo que permite mover miles de coordenadas a 60fps."
              tags={['React', 'Vite', 'MapLibre', 'Zustand']}
            />
            <StackItem 
              icon={<Server size={32} color="#22c55e" />}
              title="Backend de Alto Rendimiento"
              description="FastAPI gestiona la lógica de negocio y las conversiones geoespaciales asíncronas utilizando GeoPandas en el servidor."
              tags={['Python', 'FastAPI', 'GeoPandas', 'Docker']}
            />
            <StackItem 
              icon={<Database size={32} color="#8b5cf6" />}
              title="Persistencia con JSONB"
              description="PostgreSQL actúa como motor principal, utilizando JSONB para almacenar geometrías de forma nativa e indexada."
              tags={['PostgreSQL', 'SQLAlchemy', 'Pydantic']}
            />
          </div>
        </section>

        <section id="mecanicas" style={{ marginBottom: '100px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '32px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            3. Mecánicas de Funcionamiento
          </h2>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '24px', padding: '40px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '20px', marginBottom: '24px' }}>Ciclo de Vida de una Capa</h4>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '16px' }}>1</div>
                <h5 style={{ marginBottom: '8px' }}>Ingesta</h5>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Validación de archivos ZIP/KML y subida mediante Axios con seguimiento de progreso.</p>
              </div>
              <ChevronRight style={{ marginTop: '40px', color: 'var(--border-default)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '16px' }}>2</div>
                <h5 style={{ marginBottom: '8px' }}>Transformación</h5>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Motor GeoPandas normaliza proyecciones (EPSG:4326) y limpia geometrías.</p>
              </div>
              <ChevronRight style={{ marginTop: '40px', color: 'var(--border-default)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '16px' }}>3</div>
                <h5 style={{ marginBottom: '8px' }}>Visualización</h5>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Carga diferida (Lazy Load) de GeoJSONs pesados para no saturar la memoria inicial.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="despliegue" style={{ marginBottom: '100px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '32px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            4. Despliegue en Producción
          </h2>
          <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h4 style={{ marginBottom: '16px' }}>Infraestructura en Render</h4>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                Utilizamos una estrategia de despliegue continuo (CI/CD) vinculada a GitHub. Cada commit en la rama principal dispara un build automático tanto en el frontend como en el backend.
              </p>
              <div style={{ padding: '20px', borderLeft: '3px solid var(--accent)', background: 'var(--bg-tertiary)' }}>
                <code style={{ fontSize: '13px', color: 'var(--accent)' }}>
                  $ gunicorn -w 4 -k uvicorn.workers.UvicornWorker api.main:app
                </code>
                <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-tertiary)' }}>Comando de inicio para el Web Service en Render.</p>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '300px', background: 'var(--bg-secondary)', padding: '32px', borderRadius: '20px' }}>
              <h4 style={{ marginBottom: '20px' }}>Seguridad de Datos</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', gap: '10px' }}><ShieldCheck size={18} color="var(--success)" /> HTTPS forzado en todas las conexiones.</li>
                <li style={{ display: 'flex', gap: '10px' }}><ShieldCheck size={18} color="var(--success)" /> Variables de entorno encriptadas para Secrets.</li>
                <li style={{ display: 'flex', gap: '10px' }}><ShieldCheck size={18} color="var(--success)" /> Aislamiento de capas por usuario en la DB.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="galeria">
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '32px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            5. Galería Visual
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
             <GalleryItem 
              src="/assets/docs/map_preview.png" 
              title="Panel Principal" 
              desc="Interacción fluida con capas y mapa base de OpenStreetMap." 
            />
             <GalleryItem 
              src="/assets/docs/library_preview.png" 
              title="Gestión de Inventario" 
              desc="Organización de archivos cartográficos compartidos." 
            />
          </div>
        </section>

        <footer style={{ marginTop: '120px', paddingTop: '40px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
            © 2026 Mapas Platform. Documentación para desarrolladores.
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <Globe size={20} style={{ opacity: 0.5 }} />
            <Globe size={20} style={{ opacity: 0.5 }} />
          </div>
        </footer>
      </main>
    </div>
  );
}

function DocNavItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        width: '100%', 
        padding: '12px 16px', 
        borderRadius: '10px',
        border: 'none',
        background: active ? 'var(--bg-active)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontWeight: active ? 600 : 400,
        textAlign: 'left'
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function StackItem({ icon, title, description, tags }: { icon: any, title: string, description: string, tags: string[] }) {
  return (
    <div style={{ display: 'flex', gap: '32px' }}>
      <div style={{ 
        width: '64px', 
        height: '64px', 
        background: 'var(--bg-secondary)', 
        borderRadius: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexShrink: 0,
        border: '1px solid var(--border-subtle)'
      }}>
        {icon}
      </div>
      <div>
        <h4 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>{title}</h4>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>{description}</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {tags.map(tag => (
            <span key={tag} style={{ background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function GalleryItem({ src, title, desc }: { src: string, title: string, desc: string }) {
  return (
    <div>
      <div style={{ 
        width: '100%', 
        aspectRatio: '16/9', 
        background: 'var(--bg-tertiary)', 
        borderRadius: '16px', 
        overflow: 'hidden', 
        border: '1px solid var(--border-subtle)',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img src={src} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <h5 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{title}</h5>
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{desc}</p>
    </div>
  );
}
