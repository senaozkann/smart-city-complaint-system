import { useEffect, useState } from "react";
import {
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Alert,
  MenuItem,
} from "@mui/material";

const CATEGORY_OPTIONS = [
  { value: "auto", label: "Otomatik (Yapay Zeka Belirlesin)" },
  { value: "yol", label: "Yol & Asfalt" },
  { value: "aydinlatma", label: "Aydınlatma" },
  { value: "cop", label: "Çöp & Temizlik" },
  { value: "su-kanalizasyon", label: "Su & Kanalizasyon" },
  { value: "park-bahce", label: "Park & Bahçe" },
  { value: "trafik-isaretleme", label: "Trafik & İşaretleme" },
  { value: "sokak-hayvanlari", label: "Sokak Hayvanları" },
  { value: "cevre-kirliligi", label: "Çevre Kirliliği" },
  { value: "ulasim", label: "Ulaşım & Durak" },
  { value: "diger", label: "Diğer" }
];

function ComplaintForm({ location, userToken, userEmail }) {
  const [complaint, setComplaint] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("auto");
  const [photo, setPhoto] = useState(null);
  const [status, setStatus] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const loadCaptcha = async () => {
    const response = await fetch("http://localhost:4000/api/captcha");
    const data = await response.json();
    setCaptchaToken(data.captchaToken);
    setCaptchaQuestion(data.question);
  };

  useEffect(() => {
    loadCaptcha().catch(() => {
      setStatus("Captcha yüklenemedi, sayfayı yenileyin.");
    });
  }, []);

  const handleSubmit = async () => {
    if (!userToken) {
      setStatus("Şikayet gönderebilmek için önce giriş yapmalısınız.");
      return;
    }

    if (!complaint) {
      setStatus("Lütfen şikayet metni girin.");
      return;
    }

    const formData = new FormData();
    formData.append("complaint", complaint);
    if (location) {
      formData.append("lat", String(location.lat));
      formData.append("lng", String(location.lng));
    }
    if (photo) {
      formData.append("photo", photo);
    }
    formData.append("captchaToken", captchaToken);
    formData.append("captchaAnswer", captchaAnswer);
    formData.append("category", selectedCategory);

    try {
      const response = await fetch("http://localhost:4000/api/complaints", {
        method: "POST",
        headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Sunucu hatası");
      }

      setStatus("Şikayetiniz başarıyla gönderildi.");
      setComplaint("");
      setSelectedCategory("auto");
      setPhoto(null);
      setCaptchaAnswer("");
      await loadCaptcha();
    } catch (error) {
      setStatus(error.message || "Bir hata oluştu, lütfen tekrar deneyin.");
      await loadCaptcha();
      console.error(error);
    }
  };

  const isError = status && !status.includes("başarı");

  return (
    <Card
      elevation={6}
      sx={{
        maxWidth: "100%",
        width: "100%",
        margin: 0,
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={2.5}>
          <div>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontWeight: 700, color: "#111827" }}
            >
              Şikayet Bildir
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280" }}>
              Belediye ekiplerinin daha hızlı aksiyon alabilmesi için olabildiğince
              net ve açıklayıcı yazmaya çalış.
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280", mt: 0.8 }}>
              Gönderen: {userEmail || "-"}
            </Typography>
          </div>

          {!userToken && (
            <Alert severity="warning">
              Şikayet oluşturmak için önce kullanıcı girişi yapın.
            </Alert>
          )}

          <TextField
            select
            label="Kategori (İsteğe Bağlı)"
            fullWidth
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            variant="outlined"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Şikayetinizi yazın"
            multiline
            rows={6}
            fullWidth
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            variant="outlined"
          />

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="outlined"
              component="label"
              sx={{
                textTransform: "none",
                borderRadius: 999,
              }}
            >
              Fotoğraf Ekle
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPhoto(file);
                  }
                }}
              />
            </Button>

            {photo && (
              <Chip
                label={photo.name}
                size="small"
                sx={{ maxWidth: 220 }}
              />
            )}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label={`Captcha: ${captchaQuestion || "Yükleniyor..."}`}
              type="number"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              fullWidth
            />
            <Button variant="outlined" onClick={loadCaptcha} sx={{ textTransform: "none" }}>
              Yenile
            </Button>
          </Stack>

          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={!userToken || !captchaToken || !captchaAnswer}
            sx={{
              mt: 1,
              py: 1.2,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Gönder
          </Button>

          {status && (
            <Alert severity={isError ? "error" : "success"}>
              {status}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ComplaintForm;