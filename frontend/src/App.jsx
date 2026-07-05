import { useState } from "react";
import ComplaintForm from "./components/ComplaintForm";
import MapPicker from "./components/MapPicker";
import AdminPanel from "./components/AdminPanel";
import UserPanel from "./components/UserPanel";
import UserHistoryDrawer from "./components/UserHistoryDrawer";
import ExpertPanel from "./components/ExpertPanel";
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Stack,
  Button,
  Paper,
  Chip,
} from "@mui/material";

function App() {
  const [location, setLocation] = useState(null);
  const [activeView, setActiveView] = useState("citizen");
  const [userToken, setUserToken] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  return (
    <Box
      sx={{
        flexGrow: 1,
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top right, rgba(37,99,235,0.13), transparent 42%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #e2e8f0 100%)",
      }}
    >
      <AppBar
        position="static"
        sx={{
          backgroundColor: "white",
          color: "#0f172a",
          boxShadow: "0 6px 24px rgba(15,23,42,0.08)",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Toolbar>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                bgcolor: "#2563eb",
                boxShadow: "0 0 0 6px rgba(37,99,235,0.15)",
              }}
            />
            <Typography
              variant="h6"
              component="div"
              sx={{ fontWeight: 800, letterSpacing: 0.3 }}
            >
              Akıllı Şehir Şikayet Platformu
            </Typography>
          </Stack>
          <Button
            variant={activeView === "user" ? "contained" : "outlined"}
            onClick={() => setActiveView("user")}
            sx={{
              textTransform: "none",
              borderRadius: 999,
              px: 2,
              mr: 1,
              backgroundColor: activeView === "user" ? "#4f46e5" : "transparent",
            }}
          >
            Vatandaş Girişi
          </Button>

          <Button
            variant={activeView === "expert_login" || activeView === "expert" ? "contained" : "outlined"}
            onClick={() => setActiveView("expert_login")}
            sx={{
              textTransform: "none",
              borderRadius: 999,
              px: 2,
              mr: 1,
              backgroundColor: (activeView === "expert_login" || activeView === "expert") ? "#059669" : "transparent",
              color: (activeView === "expert_login" || activeView === "expert") ? "#fff" : "#059669",
              borderColor: "#059669",
            }}
          >
            Uzman Girişi
          </Button>

          <Button
            variant={activeView === "admin" ? "contained" : "outlined"}
            onClick={() => setActiveView("admin")}
            sx={{
              textTransform: "none",
              borderRadius: 999,
              px: 2,
              backgroundColor: activeView === "admin" ? "#1e293b" : "transparent",
              color: activeView === "admin" ? "#fff" : "#1e293b",
              borderColor: "#1e293b",
            }}
          >
            Yönetici Girişi
          </Button>

          {userToken && (
            <Box sx={{ ml: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <Chip 
                label={`${userProfile?.firstName} (${userProfile?.role === "expert" ? "Uzman" : "Vatandaş"})`}
                onDelete={() => {
                  setUserToken("");
                  setUserProfile(null);
                  setActiveView("citizen");
                }}
                color="primary"
                variant="outlined"
              />
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container
        maxWidth={false}
        sx={{
          py: 5,
          px: { xs: 2, md: 4 },
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {activeView === "admin" ? (
          <Box
            sx={{
              width: "100%",
              minHeight: "calc(100vh - 210px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AdminPanel />
          </Box>
        ) : activeView === "user" ? (
          <Box
            sx={{
              width: "100%",
              minHeight: "calc(100vh - 210px)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            {!userToken ? (
              <Box sx={{ width: "100%", maxWidth: 840 }}>
                <UserPanel
                  title="Vatandaş Girişi"
                  token={userToken}
                  profile={userProfile}
                  onLogin={({ id, token, email, firstName, lastName, role }) => {
                    setUserToken(token);
                    setUserProfile({ id, email, firstName, lastName, role });
                    setActiveView("user");
                  }}
                  onLogout={() => {
                    setUserToken("");
                    setUserProfile(null);
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ width: "100%" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Kullanıcı Şikayet Ekranı
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      onClick={() => setIsHistoryDrawerOpen(true)}
                      sx={{ textTransform: "none" }}
                    >
                      Eski Şikayetler ve Durum
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => {
                        setUserToken("");
                        setUserProfile(null);
                      }}
                      sx={{ textTransform: "none" }}
                    >
                      Çıkış
                    </Button>
                  </Stack>
                </Stack>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    gap: 3,
                    alignItems: "stretch",
                  }}
                >
                  <Box sx={{ flex: 1.1, minWidth: 0 }}>
                    <Box
                      sx={{
                        borderRadius: 3,
                        overflow: "hidden",
                        border: "1px solid #cbd5e1",
                        boxShadow: "0 14px 36px rgba(15,23,42,0.12)",
                        bgcolor: "white",
                      }}
                    >
                      <MapPicker value={location} onChange={setLocation} />
                    </Box>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <ComplaintForm
                      location={location}
                      userToken={userToken}
                      userEmail={userProfile?.email}
                    />
                  </Box>
                </Box>

                <UserHistoryDrawer
                  open={isHistoryDrawerOpen}
                  onClose={() => setIsHistoryDrawerOpen(false)}
                  token={userToken}
                  profile={userProfile}
                  onLogout={() => {
                    setUserToken("");
                    setUserProfile(null);
                  }}
                />
              </Box>
            )}
          </Box>
        ) : activeView === "expert_login" ? (
          <Box
            sx={{
              width: "100%",
              minHeight: "calc(100vh - 210px)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <Box sx={{ width: "100%", maxWidth: 840 }}>
              <UserPanel
                title="Uzman Girişi"
                showRegister={false}
                token={userToken}
                profile={userProfile}
                onLogin={({ id, token, email, firstName, lastName, role }) => {
                  setUserToken(token);
                  setUserProfile({ id, email, firstName, lastName, role });
                  setActiveView("expert");
                }}
                onLogout={() => {
                  setUserToken("");
                  setUserProfile(null);
                }}
              />
            </Box>
          </Box>
        ) : activeView === "expert" ? (
          <Box
            sx={{
              width: "100%",
              minHeight: "calc(100vh - 210px)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <ExpertPanel 
              token={userToken} 
              profile={userProfile} 
              onLogout={() => {
                setUserToken("");
                setUserProfile(null);
                setActiveView("citizen");
              }} 
            />
          </Box>
        ) : (
          <>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3.5 },
                borderRadius: 4,
                border: "1px solid #dbeafe",
                background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
              }}
            >
              <Stack spacing={1.2}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
                  Konumunu seç, şikayetini hızlıca gönder
                </Typography>
                <Typography sx={{ color: "#334155", maxWidth: 900 }}>
                  Şikayet göndermek için önce kullanıcı girişi yap. Haritadan konumu işaretle,
                  açıklamanı ve fotoğrafını ekle, ekipler daha hızlı müdahale etsin.
                </Typography>
              </Stack>
            </Paper>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                gap: 2,
              }}
            >
              <Paper sx={{ p: 2.2, borderRadius: 3, border: "1px solid #e2e8f0" }}>
                <Typography sx={{ fontWeight: 700, mb: 0.6 }}>1) Konumu İşaretle</Typography>
                <Typography variant="body2" color="text.secondary">
                  Haritada doğru noktayı seçerek ekiplerin saha planını hızlandır.
                </Typography>
              </Paper>
              <Paper sx={{ p: 2.2, borderRadius: 3, border: "1px solid #e2e8f0" }}>
                <Typography sx={{ fontWeight: 700, mb: 0.6 }}>2) Detaylı Bildir</Typography>
                <Typography variant="body2" color="text.secondary">
                  Açıklama ve fotoğraf ile problemi net anlat, yanlış yönlendirmeyi azalt.
                </Typography>
              </Paper>
              <Paper sx={{ p: 2.2, borderRadius: 3, border: "1px solid #e2e8f0" }}>
                <Typography sx={{ fontWeight: 700, mb: 0.6 }}>3) Süreci Takip Et</Typography>
                <Typography variant="body2" color="text.secondary">
                  Hesabınla giriş yapıp kendi şikayetlerinin güncel durumunu gör.
                </Typography>
              </Paper>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 3,
                alignItems: "stretch",
              }}
            >
              <Box sx={{ flex: 1.1, minWidth: 0 }}>
                <Box
                  sx={{
                    borderRadius: 3,
                    overflow: "hidden",
                    border: "1px solid #cbd5e1",
                    boxShadow: "0 14px 36px rgba(15,23,42,0.12)",
                    bgcolor: "white",
                  }}
                >
                  <MapPicker value={location} onChange={setLocation} />
                </Box>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                {!userToken && (
                  <Paper
                    sx={{
                      p: 2.2,
                      borderRadius: 3,
                      border: "1px solid #fde68a",
                      backgroundColor: "#fffbeb",
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, mb: 0.6 }}>
                      Şikayet göndermek için giriş yapmalısın
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
                      Üstteki "Kullanıcı Girişi" menüsünden hesabına girerek devam et.
                    </Typography>
                    <Button variant="contained" onClick={() => setActiveView("user")} sx={{ textTransform: "none" }}>
                      Kullanıcı Girişine Git
                    </Button>
                  </Paper>
                )}

                <ComplaintForm
                  location={location}
                  userToken={userToken}
                  userEmail={userProfile?.email}
                />
              </Box>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}

export default App;