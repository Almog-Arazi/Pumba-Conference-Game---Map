import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export function MapBackground() {
  return (
    <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
      <MapContainer
        center={[32.080, 34.778]} // Centered on Dizengoff / Rabin Square area
        zoom={15}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        style={{ width: '100%', height: '100%' }}
        className="filter contrast-125 brightness-110"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
      </MapContainer>
    </div>
  );
}
