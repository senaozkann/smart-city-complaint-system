import { useEffect, useMemo, useState } from "react";
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
  Badge,
  Chip,
  Tabs,
  Tab,
} from "@mui/material";

export const STATUS_SEGMENTS = [
  { key: "unassigned_waiting", label: "Atanmamış Bekleyen" },
  { key: "assigned_waiting", label: "Atanıp Bekleyen" },
  { key: "in_review", label: "İncelenen" },
  { key: "resolved", label: "Çözüldü" },
];

export function matchesStatusSegment(complaint, segment) {
  switch (segment) {
    case "unassigned_waiting":
      return complaint.status === "Bekliyor" && !complaint.assignedExpert;
    case "assigned_waiting":
      return complaint.status === "Bekliyor" && Boolean(complaint.assignedExpert);
    case "in_review":
      return complaint.status === "İnceleniyor";
    case "resolved":
      return complaint.status === "Çözüldü";
    default:
      return false;
  }
}

const STATUS_OPTIONS = ["Bekliyor", "İnceleniyor", "Çözüldü"];
const CATEGORY_OPTIONS = [
  "yol",
  "aydinlatma",
  "cop",
  "su-kanalizasyon",
  "park-bahce",
  "trafik-isaretleme",
  "sokak-hayvanlari",
  "cevre-kirliligi",
  "ulasim",
  "diger",
];

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

async function parseJsonSafe(response) {
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      throw new Error("API yerine HTML döndü. Backend'i yeniden başlatıp tekrar deneyin.");
    }
    throw new Error("Sunucudan beklenmeyen cevap alındı.");
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Sunucudan geçersiz cevap alındı. Backend'i yeniden başlatın.");
  }
}

function formatDate(isoDate) {
  if (!isoDate) {
    return "-";
  }
  return new Date(isoDate).toLocaleString("tr-TR");
}

function isDelayed(isoDate, status) {
  if (status !== "Bekliyor") return false;
  const createdAt = new Date(isoDate);
  const now = new Date();
  const diffInHours = (now - createdAt) / (1000 * 60 * 60);
  return diffInHours > 48;
}

function AdminPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("success");
  const [isLoading, setIsLoading] = useState(false);
  
  // All complaints from server
  const [allComplaints, setAllComplaints] = useState([]);
  const [experts, setExperts] = useState([]);
  
  const [userEmailFilter, setUserEmailFilter] = useState("");
  const [statusSegment, setStatusSegment] = useState("unassigned_waiting");
  const [categoryFilter, setCategoryFilter] = useState(""); // "" means All
  const [panelView, setPanelView] = useState("complaints"); // complaints | experts
  const [expertOverview, setExpertOverview] = useState([]);

  const loggedIn = useMemo(() => Boolean(token), [token]);

  const fetchComplaints = async (currentToken) => {
    const response = await fetch(`http://localhost:4000/api/admin/complaints`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data.message || "Şikayetler getirilemedi.");
    }
    setAllComplaints(data);
  };

  const fetchExperts = async (currentToken) => {
    try {
      const response = await fetch(`http://localhost:4000/api/admin/experts`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });
      const data = await parseJsonSafe(response);
      if (response.ok) {
        setExperts(data);
      }
    } catch (error) {
      console.error("Uzmanlar getirilemedi:", error);
    }
  };

  const fetchExpertOverview = async (currentToken) => {
    const response = await fetch(`http://localhost:4000/api/admin/experts/overview`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data.message || "Uzman özeti getirilemedi.");
    }
    setExpertOverview(data);
  };

  const handleLogin = async () => {
    setStatus("");
    setStatusType("success");
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseJsonSafe(response);
      if (!response.ok) {
        throw new Error(data.message || "Giriş başarısız.");
      }

      setToken(data.token);
      setStatusType("success");
      setStatus("Admin girişi başarılı.");
      await Promise.all([
        fetchComplaints(data.token),
        fetchExperts(data.token),
        fetchExpertOverview(data.token),
      ]);
    } catch (error) {
      setStatusType("error");
      setStatus(error.message || "Bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!token) return;
    setIsLoading(true);
    setStatus("");
    try {
      await Promise.all([
        fetchComplaints(token),
        fetchExpertOverview(token),
      ]);
      setStatusType("success");
      setStatus("Veriler güncellendi.");
    } catch (error) {
      setStatusType("error");
      setStatus(error.message || "Yenileme sırasında hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setAllComplaints([]);
    setExpertOverview([]);
    setPanelView("complaints");
    setStatusType("success");
    setStatus("Çıkış yapıldı.");
    setEmail("");
    setPassword("");
  };

  const handleStatusUpdate = async (complaintId, nextStatus) => {
    if (!token) return;
    setIsLoading(true);
    setStatus("");
    try {
      const response = await fetch(`http://localhost:4000/api/admin/complaints/${complaintId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await parseJsonSafe(response);
      if (!response.ok) throw new Error(data.message || "Durum güncellenemedi");
      
      setStatusType("success");
      setStatus("Şikayet durumu güncellendi.");
      await fetchComplaints(token);
    } catch (error) {
      setStatusType("error");
      setStatus(error.message || "Durum güncellenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryUpdate = async (complaintId, nextCategory) => {
    if (!token) return;
    setIsLoading(true);
    setStatus("");
    try {
      const response = await fetch(`http://localhost:4000/api/admin/complaints/${complaintId}/category`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category: nextCategory }),
      });
      const data = await parseJsonSafe(response);
      if (!response.ok) throw new Error(data.message || "Kategori güncellenemedi");
      
      setStatusType("success");
      setStatus("Kategori güncellendi.");
      await fetchComplaints(token);
    } catch (error) {
      setStatusType("error");
      setStatus(error.message || "Kategori güncellenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpertUpdate = async (complaintId, expertId) => {
    if (!token) return;
    setIsLoading(true);
    setStatus("");
    try {
      const response = await fetch(`http://localhost:4000/api/admin/complaints/${complaintId}/expert`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expertId: expertId === "" ? null : Number(expertId) }),
      });
      const data = await parseJsonSafe(response);
      if (!response.ok) throw new Error(data.message || "Uzman atanamadı");
      
      setStatusType("success");
      setStatus("Uzman atandı.");
      await fetchComplaints(token);
    } catch (error) {
      setStatusType("error");
      setStatus(error.message || "Uzman atanırken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchComplaints(token),
      fetchExperts(token),
      fetchExpertOverview(token),
    ]).catch((error) => {
      setStatusType("error");
      setStatus(error.message || "Veriler alınamadı");
    });
  }, [token]);

  const segmentCounts = useMemo(() => {
    const counts = {};
    STATUS_SEGMENTS.forEach(({ key }) => {
      counts[key] = allComplaints.filter((c) => matchesStatusSegment(c, key)).length;
    });
    return counts;
  }, [allComplaints]);

  // Derived state for filtering
  const filteredComplaints = useMemo(() => {
    let list = allComplaints;
    if (userEmailFilter) {
      list = list.filter((c) => c.userEmail === userEmailFilter);
    }

    list = list.filter((c) => matchesStatusSegment(c, statusSegment));
    
    if (categoryFilter) {
      list = list.filter((c) => (c.category || "diger") === categoryFilter);
    }
    return list;
  }, [allComplaints, userEmailFilter, statusSegment, categoryFilter]);

  // Counts for folders
  const getCategoryCount = (cat) => {
    let list = allComplaints;
    if (userEmailFilter) list = list.filter((c) => c.userEmail === userEmailFilter);
    list = list.filter((c) => matchesStatusSegment(c, statusSegment));
    return list.filter((c) => (c.category || "diger") === cat).length;
  };

  const activeSegmentLabel =
    STATUS_SEGMENTS.find((s) => s.key === statusSegment)?.label || "Şikayetler";

  if (!loggedIn) {
    return (
      <Card sx={{ maxWidth: 480, width: "100%", borderRadius: 4, boxShadow: "0 10px 40px rgba(0,0,0,0.08)" }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 800, textAlign: "center", mb: 1 }}>
              Yönetici Girişi
            </Typography>
            <TextField
              label="E-posta"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Şifre"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleLogin}
              disabled={isLoading || !email || !password}
              sx={{ py: 1.5, borderRadius: 999, textTransform: "none", fontWeight: 700 }}
            >
              {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
            {status && <Alert severity="error">{status}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ width: "100%", borderRadius: 4, minHeight: "80vh", boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}>
      <CardContent sx={{ p: { xs: 2, md: 4 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e293b" }}>
            Şikayet Yönetim Merkezi
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant={panelView === "complaints" ? "contained" : "outlined"}
              onClick={() => setPanelView("complaints")}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Şikayetler
            </Button>
            <Button
              variant={panelView === "experts" ? "contained" : "outlined"}
              onClick={() => setPanelView("experts")}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Uzman Özeti
            </Button>
            <Button
              variant="outlined"
              onClick={handleRefresh}
              disabled={isLoading}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Yenile
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleLogout}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Çıkış
            </Button>
          </Stack>
        </Stack>

        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {status && !isLoading && <Alert severity={statusType} sx={{ mb: 3 }}>{status}</Alert>}

        {panelView === "experts" ? (
          <Stack spacing={3}>
            {expertOverview.length === 0 && !isLoading ? (
              <Box sx={{ py: 6, textAlign: "center", bgcolor: "#f8fafc", borderRadius: 3, border: "1px dashed #cbd5e1" }}>
                <Typography color="text.secondary">Kayıtlı uzman bulunmuyor.</Typography>
              </Box>
            ) : (
              expertOverview.map((expert) => (
                <Card key={expert.id} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e293b" }}>
                            {expert.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Uzman ID: {expert.id} · {expert.email}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip label={`Bekleyen: ${expert.stats.waiting}`} color="warning" size="small" sx={{ fontWeight: 700 }} />
                          <Chip label={`İncelenen: ${expert.stats.inReview}`} color="info" size="small" sx={{ fontWeight: 700 }} />
                          <Chip label={`Çözülen: ${expert.stats.resolved}`} color="success" size="small" sx={{ fontWeight: 700 }} />
                        </Stack>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
                          Uzmanlık Alanları
                        </Typography>
                        <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                          {expert.categories.map((cat) => (
                            <Chip
                              key={cat}
                              label={CATEGORY_LABELS[cat] || cat}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          ))}
                        </Stack>
                      </Box>

                      {expert.waitingComplaints.length > 0 && (
                        <Box>
                          <Typography sx={{ fontWeight: 700, mb: 1, color: "#b45309" }}>
                            Sayfasında Bekleyenler ({expert.waitingComplaints.length})
                          </Typography>
                          <Stack spacing={1}>
                            {expert.waitingComplaints.map((c) => (
                              <Box key={c.id} sx={{ p: 1.5, bgcolor: "#fffbeb", borderRadius: 2, border: "1px solid #fde68a" }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  #{c.id} — {c.text}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {CATEGORY_LABELS[c.category] || c.category} · {formatDate(c.createdAt)}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {expert.inReviewComplaints.length > 0 && (
                        <Box>
                          <Typography sx={{ fontWeight: 700, mb: 1, color: "#0369a1" }}>
                            İncelenenler ({expert.inReviewComplaints.length})
                          </Typography>
                          <Stack spacing={1}>
                            {expert.inReviewComplaints.map((c) => (
                              <Box key={c.id} sx={{ p: 1.5, bgcolor: "#f0f9ff", borderRadius: 2, border: "1px solid #bae6fd" }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  #{c.id} — {c.text}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {CATEGORY_LABELS[c.category] || c.category} · {formatDate(c.createdAt)}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {expert.resolvedComplaints.length > 0 && (
                        <Box>
                          <Typography sx={{ fontWeight: 700, mb: 1, color: "#15803d" }}>
                            Çözülenler ({expert.resolvedComplaints.length})
                          </Typography>
                          <Stack spacing={1}>
                            {expert.resolvedComplaints.map((c) => (
                              <Box key={c.id} sx={{ p: 1.5, bgcolor: "#f0fdf4", borderRadius: 2, border: "1px solid #bbf7d0" }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  #{c.id} — {c.text}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {CATEGORY_LABELS[c.category] || c.category} · {formatDate(c.createdAt)}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {expert.waitingComplaints.length === 0 &&
                        expert.inReviewComplaints.length === 0 &&
                        expert.resolvedComplaints.length === 0 && (
                          <Typography variant="body2" color="text.secondary">
                            Bu uzmana henüz şikayet atanmamış.
                          </Typography>
                        )}
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        ) : (
        <>
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <TextField
            label="Kullanıcı Mailine Göre Ara"
            type="email"
            value={userEmailFilter}
            onChange={(e) => setUserEmailFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 300px" },
            gap: 4,
          }}
        >
          {/* LEFT SIDE: COMPLAINT LIST */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "#334155" }}>
              {categoryFilter === ""
                ? activeSegmentLabel
                : `${CATEGORY_LABELS[categoryFilter]} — ${activeSegmentLabel}`}
              <Typography component="span" sx={{ color: "text.secondary", ml: 1, fontSize: "1rem" }}>
                ({filteredComplaints.length})
              </Typography>
            </Typography>

            <Tabs
              value={statusSegment}
              onChange={(_, val) => setStatusSegment(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
            >
              {STATUS_SEGMENTS.map(({ key, label }) => (
                <Tab
                  key={key}
                  value={key}
                  label={
                    <Stack direction="row" spacing={0.8} alignItems="center">
                      <span>{label}</span>
                      <Chip
                        label={segmentCounts[key] ?? 0}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          bgcolor: statusSegment === key ? "#1e293b" : "#e2e8f0",
                          color: statusSegment === key ? "#fff" : "#475569",
                          "& .MuiChip-label": { px: 0.8 },
                        }}
                      />
                    </Stack>
                  }
                  sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.95rem" }}
                />
              ))}
            </Tabs>

            {filteredComplaints.length === 0 && !isLoading ? (
              <Box sx={{ py: 6, textAlign: "center", bgcolor: "#f8fafc", borderRadius: 3, border: "1px dashed #cbd5e1" }}>
                <Typography color="text.secondary">Bu klasörde şikayet bulunmuyor.</Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {filteredComplaints.map((item) => (
                  <Card 
                    key={item.id} 
                    variant="outlined" 
                    sx={{ 
                      borderRadius: 3, 
                      borderColor: item.status === "Bekliyor" ? "#ef4444" : "#e2e8f0",
                      borderWidth: item.status === "Bekliyor" ? 2 : 1,
                      bgcolor: item.status === "Bekliyor" ? "#fef2f2" : "#fff"
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack spacing={2}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a", pr: 2 }}>
                            {item.text}
                          </Typography>
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                            <Typography variant="caption" sx={{ color: "#64748b", whiteSpace: "nowrap" }}>
                              {formatDate(item.createdAt)}
                            </Typography>
                            {isDelayed(item.createdAt, item.status) && (
                              <Chip 
                                label="⚠️ 48 SAATİ GEÇTİ!" 
                                size="small" 
                                color="error" 
                                sx={{ fontWeight: 800, animation: "pulse 2s infinite" }} 
                              />
                            )}
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                              Kullanıcı
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {item.userEmail || "Misafir"} 
                              {item.userFirstName ? ` (${item.userFirstName} ${item.userLastName || ""})` : ""}
                            </Typography>
                          </Box>
                          
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                              Konum
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {item.lat != null && item.lng != null
                                ? `${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}`
                                : "Belirtilmedi"}
                            </Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                          <TextField
                            select
                            label="Klasör / Kategori"
                            value={item.category || "diger"}
                            onChange={(e) => handleCategoryUpdate(item.id, e.target.value)}
                            size="small"
                            sx={{ minWidth: 200 }}
                          >
                            {CATEGORY_OPTIONS.map((opt) => (
                              <MenuItem key={opt} value={opt}>
                                {CATEGORY_LABELS[opt]}
                              </MenuItem>
                            ))}
                          </TextField>

                          <TextField
                            select
                            label="Durum"
                            value={item.status || "Bekliyor"}
                            onChange={(e) => handleStatusUpdate(item.id, e.target.value)}
                            size="small"
                            sx={{ minWidth: 150 }}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <MenuItem key={opt} value={opt}>
                                {opt}
                              </MenuItem>
                            ))}
                          </TextField>

                          {item.status !== "Çözüldü" && (
                            <TextField
                              select
                              label="Uzman Ata (Zorunlu)"
                              value={item.assignedExpert?.id || ""}
                              onChange={(e) => handleExpertUpdate(item.id, e.target.value)}
                              size="small"
                              sx={{ minWidth: 200 }}
                            >
                              <MenuItem value="">Uzman Seçilmedi</MenuItem>
                              {experts.map((exp) => (
                                <MenuItem key={exp.id} value={exp.id}>
                                  {exp.name} (ID: {exp.id})
                                </MenuItem>
                              ))}
                            </TextField>
                          )}
                        </Box>

                        {item.assignedExpert && (
                          <Box sx={{ p: 1.5, bgcolor: "#f1f5f9", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569" }}>
                              👤 İlgilenen Uzman: {item.assignedExpert.name} (ID: {item.assignedExpert.id})
                            </Typography>
                          </Box>
                        )}

                        {item.assignmentSource === "expert_rejected" && (
                          <Box sx={{ p: 1.5, bgcolor: "#fef2f2", borderRadius: 2, border: "1px solid #fca5a5" }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#ef4444" }}>
                              ⚠️ Hatalı Atama: Şikayet uzman tarafından iade edildi. (Önceki Uzman: {item.rejectedByExpertName || "Uzman"})
                            </Typography>
                          </Box>
                        )}


                        {item.photoUrl && (
                          <Box
                            sx={{
                              width: "100%",
                              borderRadius: 2,
                              border: "1px solid #e2e8f0",
                              backgroundColor: "#f8fafc",
                              p: 1,
                              mt: 1
                            }}
                          >
                            <Box
                              component="img"
                              src={item.photoUrl}
                              alt={`Şikayet görseli`}
                              sx={{
                                width: "100%",
                                maxHeight: 300,
                                objectFit: "contain",
                                borderRadius: 1,
                              }}
                            />
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>

          {/* RIGHT SIDE: CATEGORIES AS FOLDERS */}
          <Box>
            <Card variant="outlined" sx={{ borderRadius: 3, position: "sticky", top: 24, borderColor: "#e2e8f0", bgcolor: "#f8fafc" }}>
              <CardContent sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 800, mb: 2, px: 1, color: "#1e293b", fontSize: "1.1rem" }}>
                  Kategoriler
                </Typography>
                <Stack spacing={0.8}>
                  <Button
                    variant={categoryFilter === "" ? "contained" : "text"}
                    onClick={() => setCategoryFilter("")}
                    sx={{ 
                      justifyContent: "space-between", 
                      textTransform: "none", 
                      px: 2, 
                      py: 1.2,
                      borderRadius: 2,
                      color: categoryFilter === "" ? "#fff" : "#475569",
                      bgcolor: categoryFilter === "" ? "#3b82f6" : "transparent",
                      "&:hover": {
                        bgcolor: categoryFilter === "" ? "#2563eb" : "#e2e8f0"
                      }
                    }}
                  >
                    <Typography sx={{ fontWeight: 600 }}>Tümü</Typography>
                    <Badge 
                      badgeContent={allComplaints.length} 
                      color={categoryFilter === "" ? "secondary" : "primary"}
                      sx={{ "& .MuiBadge-badge": { fontWeight: 700 } }}
                    />
                  </Button>
                  
                  {CATEGORY_OPTIONS.map((cat) => {
                    const count = getCategoryCount(cat);
                    const isActive = categoryFilter === cat;
                    
                    return (
                      <Button
                        key={cat}
                        variant={isActive ? "contained" : "text"}
                        onClick={() => setCategoryFilter(cat)}
                        sx={{ 
                          justifyContent: "space-between", 
                          textTransform: "none", 
                          px: 2, 
                          py: 1.2,
                          borderRadius: 2,
                          color: isActive ? "#fff" : "#475569",
                          bgcolor: isActive ? "#3b82f6" : "transparent",
                          "&:hover": {
                            bgcolor: isActive ? "#2563eb" : "#e2e8f0"
                          }
                        }}
                      >
                        <Typography sx={{ fontWeight: 600 }}>{CATEGORY_LABELS[cat]}</Typography>
                        <Badge 
                          badgeContent={count} 
                          color={isActive ? "secondary" : "primary"}
                          showZero
                          sx={{ "& .MuiBadge-badge": { fontWeight: 700 } }}
                        />
                      </Button>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Box>

        </Box>
        </>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminPanel;
