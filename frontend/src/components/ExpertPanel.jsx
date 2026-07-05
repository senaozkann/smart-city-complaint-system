import { useEffect, useState, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Tabs,
  Tab,
  Chip,
  Paper,
  Badge,
} from "@mui/material";

const CATEGORY_LABELS = {
  "yol": "Yol & Asfalt",
  "aydinlatma": "Aydınlatma",
  "cop": "Çöp & Temizlik",
  "su-kanalizasyon": "Su & Kanalizasyon",
  "park-bahce": "Park & Bahçe",
  "trafik-isaretleme": "Trafik & İşaretleme",
  "sokak-hayvanlari": "Sokak Hayvanları",
  "cevre-kirliligi": "Çevre Kirliliği",
  "ulasim": "Ulaşım & Durak",
  "diger": "Diğer",
};

function isDelayed(isoDate, status) {
  if (status !== "Bekliyor") return false;
  const createdAt = new Date(isoDate);
  const now = new Date();
  const diffInHours = (now - createdAt) / (1000 * 60 * 60);
  return diffInHours > 48;
}

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);

function formatDate(isoDate) {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleString("tr-TR");
}

function ExpertPanel({ token, profile, onLogout }) {
  const [allComplaints, setAllComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tabValue, setTabValue] = useState(0); // 0: Admin-assigned, 1: Self-assigned / in progress
  const [categoryFilter, setCategoryFilter] = useState("");

  const fetchComplaints = async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:4000/api/expert/complaints?filter=my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Şikayetler yüklenemedi");
      setAllComplaints(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [token]);

  const handleStatusUpdate = async (id, newStatus) => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`http://localhost:4000/api/expert/complaints/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Durum güncellenemedi");
      setSuccess(`Şikayet durumu "${newStatus}" olarak güncellendi.`);
      fetchComplaints();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendToAdmin = async (id) => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`http://localhost:4000/api/expert/complaints/${id}/reject`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Şikayet admine gönderilemedi");
      setSuccess("Şikayet başarıyla admine gönderildi.");
      fetchComplaints();
    } catch (err) {
      setError(err.message);
    }
  };

  const tabFilteredComplaints = useMemo(() => {
    if (tabValue === 0) {
      return allComplaints.filter(
        (c) =>
          c.assignedExpert?.id === profile.id &&
          (c.assignmentSource === "admin" || c.assignmentSource === "auto") &&
          c.status === "Bekliyor"
      );
    }

    return allComplaints.filter((c) => {
      const isMine = c.assignedExpert?.id === profile.id;
      if (!isMine) return false;

      const isSelfClaimed = c.assignmentSource === "expert";
      const isAdminAssignedAndStarted =
        (c.assignmentSource === "admin" || c.assignmentSource === "auto") &&
        (c.status === "İnceleniyor" || c.status === "Çözüldü");
      const isLegacy = !c.assignmentSource;

      return isSelfClaimed || isAdminAssignedAndStarted || isLegacy;
    });
  }, [allComplaints, tabValue, profile.id]);

  const filteredComplaints = useMemo(() => {
    if (!categoryFilter) return tabFilteredComplaints;
    return tabFilteredComplaints.filter((c) => c.category === categoryFilter);
  }, [tabFilteredComplaints, categoryFilter]);

  const adminAssignedCount = useMemo(() => {
    return allComplaints.filter(
      (c) =>
        c.assignedExpert?.id === profile.id &&
        (c.assignmentSource === "admin" || c.assignmentSource === "auto") &&
        c.status === "Bekliyor"
    ).length;
  }, [allComplaints, profile.id]);

  return (
    <Card sx={{ width: "100%", borderRadius: 4, minHeight: "70vh", boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}>
      <CardContent sx={{ p: { xs: 2, md: 4 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e293b" }}>
              Uzman Çözüm Merkezi
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hoş geldin, {profile?.firstName} {profile?.lastName}
            </Typography>
          </Box>
          <Button variant="contained" color="error" onClick={onLogout} sx={{ textTransform: "none", borderRadius: 2 }}>
            Çıkış Yap
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
            <Tab
              label={
                <Badge badgeContent={adminAssignedCount} color="error" sx={{ "& .MuiBadge-badge": { right: -10, top: 0 } }}>
                  Bana Atanan Yeni Şikayetler
                </Badge>
              }
              sx={{ textTransform: "none", fontWeight: 600, px: 3 }}
            />
            <Tab label="Üstlendiklerim & Durum" sx={{ textTransform: "none", fontWeight: 600 }} />
          </Tabs>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            select
            label="Kategoriye Göre Filtrele"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
          >
            <MenuItem value="">Tüm Kategoriler</MenuItem>
            {CATEGORY_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {CATEGORY_LABELS[opt]}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress />
          </Box>
        ) : filteredComplaints.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: "center", bgcolor: "#f8fafc", border: "1px dashed #cbd5e1" }}>
            <Typography color="text.secondary">Görüntülenecek şikayet bulunmuyor.</Typography>
          </Paper>
        ) : (
          <Stack spacing={3}>
            {filteredComplaints.map((item) => (
              <Card key={item.id} variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Box>
                        <Chip
                          label={CATEGORY_LABELS[item.category] || "Diğer"}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mb: 1, fontWeight: 700 }}
                        />
                        {isDelayed(item.createdAt, item.status) && (
                          <Chip
                            label="⚠️ 48 SAATTİR BEKLİYOR!"
                            size="small"
                            color="error"
                            sx={{ mb: 1, ml: 1, fontWeight: 800, animation: "pulse 2s infinite" }}
                          />
                        )}
                        {tabValue === 0 && (
                          <Chip
                            label={item.assignmentSource === "admin" ? "ADMİN TARAFINDAN ATANDI" : "OTOMATİK YÖNLENDİRİLDİ"}
                            size="small"
                            variant="filled"
                            sx={{
                              mb: 1,
                              ml: 1,
                              fontWeight: 700,
                              bgcolor: item.assignmentSource === "admin" ? "#f59e0b" : "#10b981",
                              color: "#fff",
                            }}
                          />
                        )}
                        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}>
                          {item.text}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        {formatDate(item.createdAt)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 3 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Konum</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.lat?.toFixed(6)}, {item.lng?.toFixed(6)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Durum</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          <Chip label={item.status} size="small" color={item.status === "Çözüldü" ? "success" : "warning"} />
                        </Typography>
                      </Box>
                    </Box>

                    {item.photoUrl && (
                      <Box sx={{ maxWidth: 400, borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                        <img src={item.photoUrl} alt="Şikayet" style={{ width: "100%", display: "block" }} />
                      </Box>
                    )}

                    <Divider />

                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                      {tabValue === 0 ? (
                        <>
                          <Button
                            variant="contained"
                            onClick={() => handleStatusUpdate(item.id, "İnceleniyor")}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                          >
                            İncelemeye Al / Üstlen
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => handleSendToAdmin(item.id)}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                          >
                            Yanlış Uzman / Admine Gönder
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => handleStatusUpdate(item.id, "Çözüldü")}
                            disabled={item.status === "Çözüldü"}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                          >
                            Çözüldü Olarak İşaretle
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => handleStatusUpdate(item.id, "İnceleniyor")}
                            disabled={item.status === "İnceleniyor"}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                          >
                            İncelemeye Al
                          </Button>
                          {item.status !== "Çözüldü" && (
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={() => handleSendToAdmin(item.id)}
                              sx={{ textTransform: "none", fontWeight: 700 }}
                            >
                              Yanlış Uzman / Admine Gönder
                            </Button>
                          )}
                        </>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export default ExpertPanel;
