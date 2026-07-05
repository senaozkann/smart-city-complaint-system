import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Box, Typography } from "@mui/material";

function ClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapPicker({ value, onChange }) {
  const center = value || { lat: 41.015137, lng: 28.97953 }; // İstanbul merkez

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="body2" sx={{ mb: 1, color: "#6b7280" }}>
        Harita üzerinde şikayet konumunu işaretleyin (isteğe bağlı).
      </Typography>
      <Box
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid rgba(148,163,184,0.4)",
        }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          style={{ height: "clamp(500px, 68vh, 780px)", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> katkıda bulunanlar'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onSelect={onChange} />
          {value && (
            <Marker position={[value.lat, value.lng]} />
          )}
        </MapContainer>
      </Box>
    </Box>
  );
}

export default MapPicker;

