import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      throw new Error("API yerine HTML dondu. Backend'i yeniden baslatin.");
    }
    throw new Error("Sunucudan beklenmeyen cevap alindi.");
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Sunucudan geçersiz cevap alındı. Backend'i yeniden başlatın.");
  }
}

function UserPanel({ title, token, profile, onLogin, onLogout, showRegister = true }) {
  const [mode, setMode] = useState("login");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [status, setStatus] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const loadMyComplaints = async (currentToken) => {
    const response = await fetch("http://localhost:4000/api/users/me/complaints", {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });
    if (!response.ok) {
      throw new Error("Şikayetleriniz alınamadı");
    }
    const data = await parseJsonSafe(response);
    setComplaints(data);
  };

  const submitAuth = async () => {
    setStatus("");
    setIsLoading(true);
    try {
      if (mode === "register") {
        const registerResponse = await fetch("http://localhost:4000/api/users/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formEmail,
            password: formPassword,
            firstName: formFirstName,
            lastName: formLastName,
          }),
        });
        const registerData = await parseJsonSafe(registerResponse);
        if (!registerResponse.ok) {
          throw new Error(registerData.message || "Kayıt başarısız");
        }
      }

      const loginResponse = await fetch("http://localhost:4000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formEmail, password: formPassword }),
      });
      const loginData = await parseJsonSafe(loginResponse);
      if (!loginResponse.ok) {
        throw new Error(loginData.message || "Giriş başarısız");
      }
      onLogin(loginData);
      setStatus(mode === "register" ? "Kayıt ve giriş başarılı." : "Giriş başarılı.");
      setFormEmail("");
      setFormPassword("");
      setFormFirstName("");
      setFormLastName("");
      await loadMyComplaints(loginData.token);
    } catch (error) {
      setStatus(error.message || "Bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setFormEmail("");
      setFormPassword("");
      setFormFirstName("");
      setFormLastName("");
      setStatus("");
      setComplaints([]);
      return;
    }
    loadMyComplaints(token).catch(() => {
      setStatus("Şikayetler yüklenemedi.");
    });
  }, [token]);

  if (!token) {
    return (
      <Card sx={{ width: "100%", borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title || "Kullanıcı Girişi"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Şikayet oluşturmak ve takibini yapmak için giriş yapın veya kayıt olun.
            </Typography>
            <TextField
              label="Mail"
              type="email"
              autoComplete="off"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Şifre"
              type="password"
              autoComplete="new-password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              fullWidth
            />
            {mode === "register" && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  label="Ad"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Soyad"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  fullWidth
                />
              </Stack>
            )}
            <Stack direction="row" spacing={1}>
              <Button
                variant={mode === "login" ? "contained" : "outlined"}
                onClick={() => setMode("login")}
                sx={{ textTransform: "none", flex: showRegister ? 1 : "none" }}
              >
                Giriş Yap
              </Button>
              {showRegister && (
                <Button
                  variant={mode === "register" ? "contained" : "outlined"}
                  onClick={() => setMode("register")}
                  sx={{ textTransform: "none", flex: 1 }}
                >
                  Kayıt Ol
                </Button>
              )}
            </Stack>
            <Button
              variant="contained"
              onClick={submitAuth}
              disabled={
                isLoading ||
                !formEmail ||
                !formPassword ||
                (mode === "register" && (!formFirstName || !formLastName))
              }
              sx={{ textTransform: "none", borderRadius: 999 }}
            >
              {isLoading
                ? "İşlem yapılıyor..."
                : mode === "register"
                  ? "Kayıt Ol ve Giriş Yap"
                  : "Giriş Yap"}
            </Button>
            {status && <Alert severity={status.includes("başarılı") ? "success" : "error"}>{status}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ width: "100%", borderRadius: 4 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Hoş geldin, {profile?.firstName} {profile?.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {profile?.email}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => loadMyComplaints(token)}
              sx={{ textTransform: "none" }}
            >
              Şikayetlerimi Yenile
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={onLogout}
              sx={{ textTransform: "none" }}
            >
              Çıkış
            </Button>
          </Stack>
          <Box sx={{ maxWidth: 280 }}>
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
          </Box>
          <Typography variant="body2" color="text.secondary">
            Önceki Şikayetlerim (
            {
              complaints.filter((item) => !statusFilter || item.status === statusFilter)
                .length
            }
            )
          </Typography>
          {complaints.filter((item) => !statusFilter || item.status === statusFilter).length === 0 ? (
            <Typography color="text.secondary">Henüz hesabınıza bağlı şikayet bulunmuyor.</Typography>
          ) : (
            complaints
              .filter((item) => !statusFilter || item.status === statusFilter)
              .map((item) => (
              <Card key={item.id} variant="outlined">
                <CardContent>
                  <Typography sx={{ fontWeight: 700 }}>{item.text}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Konum:{" "}
                    {item.lat != null && item.lng != null
                      ? `${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}`
                      : "Belirtilmedi"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Durum: {item.status || "Bekliyor"}
                  </Typography>
                  {item.assignedExpert && (
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, color: "#2563eb" }}>
                      👤 İlgilenen Uzman: {item.assignedExpert.name}
                    </Typography>
                  )}
                </CardContent>
              </Card>
              ))
          )}
          {status && <Alert severity={status.includes("başarılı") ? "success" : "error"}>{status}</Alert>}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default UserPanel;
