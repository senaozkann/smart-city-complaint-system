import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Drawer,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const STATUS_OPTIONS = ["Bekliyor", "İnceleniyor", "Çözüldü"];

async function parseJsonSafe(response) {
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Sunucudan beklenmeyen cevap alındı.");
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Sunucudan geçersiz cevap alındı.");
  }
}

function UserHistoryDrawer({ open, onClose, token, profile, onLogout }) {
  const [complaints, setComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [status, setStatus] = useState("");

  const loadMyComplaints = async () => {
    if (!token) {
      return;
    }
    const response = await fetch("http://localhost:4000/api/users/me/complaints", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data.message || "Şikayetler alınamadı.");
    }
    setComplaints(data);
  };

  useEffect(() => {
    if (!open || !token) {
      return;
    }
    loadMyComplaints().catch((error) => setStatus(error.message));
  }, [open, token]);

  const filteredComplaints = complaints.filter(
    (item) => !statusFilter || item.status === statusFilter
  );

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: 330, sm: 390 }, p: 2 }}>
        <Stack spacing={1.2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Kullanıcı Paneli
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {profile?.firstName} {profile?.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {profile?.email}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => loadMyComplaints()} sx={{ textTransform: "none" }}>
              Yenile
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => {
                onLogout();
                onClose();
              }}
              sx={{ textTransform: "none" }}
            >
              Çıkış
            </Button>
          </Stack>
          <TextField
            select
            label="Duruma Göre Filtre"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            fullWidth
            size="small"
          >
            <MenuItem value="">Tümü</MenuItem>
            {STATUS_OPTIONS.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="body2" color="text.secondary">
            Eski Şikayetler ({filteredComplaints.length})
          </Typography>

          {filteredComplaints.length === 0 ? (
            <Typography color="text.secondary">Filtreye uygun şikayet bulunamadı.</Typography>
          ) : (
            <Stack spacing={1.2}>
              {filteredComplaints.map((item) => (
                <Card key={item.id} variant="outlined">
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography sx={{ fontWeight: 700 }}>{item.text}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Durum: {item.status || "Yeni"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Kategori: {item.category || "diger"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Konum:{" "}
                      {item.lat != null && item.lng != null
                        ? `${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}`
                        : "Belirtilmedi"}
                    </Typography>
                    {item.assignedExpert && (
                      <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, color: "#2563eb" }}>
                        👤 İlgilenen Uzman: {item.assignedExpert.name}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {status && <Alert severity="error">{status}</Alert>}
        </Stack>
      </Box>
    </Drawer>
  );
}

export default UserHistoryDrawer;
