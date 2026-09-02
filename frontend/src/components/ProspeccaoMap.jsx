import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function ProspeccaoMap({ empresas, centro, destacado, onMarkerClick }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true }).setView([-14.24, -51.93], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(markersRef.current).forEach((mk) => map.removeLayer(mk));
    markersRef.current = {};
    const pts = [];
    (empresas || []).slice(0, 1200).forEach((e) => {
      if (e.lat == null || e.lon == null) return;
      const mk = L.circleMarker([e.lat, e.lon], {
        radius: 7, color: '#fff', weight: 1.5, fillColor: '#008afc', fillOpacity: 0.95,
      });
      mk.bindPopup(`<b>${e.nome}</b><br>${e.categoria || ''}`);
      mk.on('click', () => onMarkerClick && onMarkerClick(e.osmId));
      mk.addTo(map);
      markersRef.current[e.osmId] = mk;
      pts.push([e.lat, e.lon]);
    });
    if (pts.length) {
      try { map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 }); } catch { /* ignora */ }
    } else if (centro) {
      map.setView([centro.lat, centro.lon], 12);
    }
    setTimeout(() => { try { map.invalidateSize(); } catch { /* ignora */ } }, 60);
  }, [empresas, centro, onMarkerClick]);

  useEffect(() => {
    Object.entries(markersRef.current).forEach(([osmId, mk]) => {
      const on = osmId === destacado;
      mk.setStyle({ fillColor: on ? '#1ecb7a' : '#008afc', radius: on ? 9 : 7 });
      if (on) mk.openPopup();
    });
  }, [destacado]);

  return <div ref={elRef} className="prosp-map" />;
}
