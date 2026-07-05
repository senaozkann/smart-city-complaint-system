console.log("!!! SERVER IS STARTING - VERSION 2.0 !!!");
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { randomBytes, timingSafeEqual } from "crypto";
import natural from "natural";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// ─── Kalici Veri Depolama (JSON dosyalari) ─────────────────────────────────
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_FILE = path.join(DATA_DIR, "users.json");
const COMPLAINTS_FILE = path.join(DATA_DIR, "complaints.json");

function loadJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) { console.error("Dosya okunamadi:", file, e.message); }
  return fallback;
}

function saveJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8"); }
  catch (e) { console.error("Dosya kaydedilemedi:", file, e.message); }
}

const users = loadJSON(USERS_FILE, []);
console.log(`Users loaded from ${USERS_FILE}: ${users.length} users found.`);
const complaints = loadJSON(COMPLAINTS_FILE, []);

const saveUsers = () => saveJSON(USERS_FILE, users);
const saveComplaints = () => saveJSON(COMPLAINTS_FILE, complaints);

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use("/uploads", express.static(uploadsDir));

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const adminSessions = new Map();
const userSessions = new Map();
const captchaStore = new Map();
const complaintRateLimitByIp = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const COMPLAINT_CATEGORIES = [
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

const SPECIALTY_MAP = {
  "yol": "ahmet@gmail.com",
  "aydinlatma": "ahmet@gmail.com",
  "cop": "mehmet@gmail.com",
  "cevre-kirliligi": "mehmet@gmail.com",
  "su-kanalizasyon": "sena@gmail.com",
  "park-bahce": "sena@gmail.com",
  "trafik-isaretleme": "fatma@gmail.com",
  "ulasim": "fatma@gmail.com",
  "sokak-hayvanlari": "ayse@gmail.com",
  "diger": "ayse@gmail.com"
};

function getAssignedExpertForCategory(category) {
  const email = SPECIALTY_MAP[category] || "ayse@gmail.com";
  const expertUser = users.find(u => u.email === email && u.role === "expert");
  if (expertUser) {
    return {
      id: expertUser.id,
      name: `${expertUser.firstName} ${expertUser.lastName}`
    };
  }
  return null;
}

function getCategoriesForExpertEmail(email) {
  return Object.entries(SPECIALTY_MAP)
    .filter(([, expertEmail]) => expertEmail === email)
    .map(([category]) => category);
}



const TURKISH_STOPWORDS = new Set([
  "ve",
  "veya",
  "ile",
  "icin",
  "gibi",
  "bir",
  "bu",
  "da",
  "de",
  "mi",
  "mu",
  "mü",
  "ama",
  "fakat",
  "cok",
  "az",
  "daha",
  "en",
  "olan",
  "oldu",
  "oluyor",
  "gore",
  "icin",
  "kadar",
  "sonra",
  "once",
  "ben",
  "sen",
  "biz",
  "siz",
  "onlar",
  "var",
  "yok",
  "biraz",
  "hemen",
  "artik",
  "sorun",
  "biraz",
  "hemen",
  "artik",
  "sorun",
]);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

function createPhotoUrl(req, photoFilename) {
  if (!photoFilename) {
    return null;
  }
  return `${req.protocol}://${req.get("host")}/uploads/${photoFilename}`;
}

function isValidAdminCredentials(email, password) {
  const providedEmail = String(email || "");
  const providedPassword = String(password || "");

  const expectedEmail = Buffer.from(ADMIN_EMAIL, "utf8");
  const expectedPassword = Buffer.from(ADMIN_PASSWORD, "utf8");
  const candidateEmail = Buffer.from(providedEmail, "utf8");
  const candidatePassword = Buffer.from(providedPassword, "utf8");

  if (
    expectedEmail.length !== candidateEmail.length ||
    expectedPassword.length !== candidatePassword.length
  ) {
    return false;
  }

  return (
    timingSafeEqual(expectedEmail, candidateEmail) &&
    timingSafeEqual(expectedPassword, candidatePassword)
  );
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sanitizeText(value) {
  return String(value || "").trim();
}

function normalizeCategory(category) {
  const normalized = sanitizeText(category).toLowerCase();
  if (COMPLAINT_CATEGORIES.includes(normalized)) {
    return normalized;
  }
  return "diger";
}

function normalizeSource(source) {
  const normalized = sanitizeText(source).toLowerCase();
  if (normalized === "manual" || normalized === "pending_ai" || normalized === "ai") {
    return normalized;
  }
  return "";
}

const classifier = new natural.BayesClassifier();

// Egitim Veriseti (Training Dataset)
const trainingData = [
  { text: "mahallemizde yollar çok bozuk", category: "yol" },
  { text: "kaldırımlar kırık dökük yürünmüyor", category: "yol" },
  { text: "sokakta kocaman bir çukur var tehlikeli", category: "yol" },
  { text: "asfalt erimiş arabalar zor geçiyor", category: "yol" },
  { text: "yol çalışması bitmedi tamamlanmadı", category: "yol" },
  { text: "sokak lambası yanmıyor", category: "aydinlatma" },
  { text: "geceleri sokak çok karanlık aydınlatma yetersiz", category: "aydinlatma" },
  { text: "çöp konteynerleri doldu taştı pislik içinde", category: "cop" },
  { text: "sokağı temizlemiyorlar kötü kokuyor", category: "cop" },
  { text: "borular patlamış her yer su içinde", category: "su-kanalizasyon" },
  { text: "kanalizasyon taşıyor lağım kokusundan durulmuyor", category: "su-kanalizasyon" },
  { text: "parktaki salıncakların zinciri kopuk", category: "park-bahce" },
  { text: "salıncak kırık çocuk düşebilir", category: "park-bahce" },
  { text: "kavşaktaki sinyalizasyon çalışmıyor kaza riski var", category: "trafik-isaretleme" },
  { text: "mahallede saldırgan başıboş köpek var", category: "sokak-hayvanlari" },
  { text: "sokak köpekleri sürü halinde dolaşıyor korkuyoruz", category: "sokak-hayvanlari" },
  { text: "inşaattan gece gündüz çok fazla gürültü geliyor", category: "cevre-kirliligi" },
  { text: "otobüslerin az olması ulaşımı zorlaştırmakta", category: "ulasim" },
  { text: "otobüsler sürekli gecikiyor durakta bekliyoruz", category: "ulasim" }
];

trainingData.forEach(item => {
  classifier.addDocument(item.text, item.category);
});
classifier.train();

function classifyComplaintText(text) {
  if (!text || text.trim().length < 5) {
    return { category: "diger", confidence: null };
  }
  const classifications = classifier.getClassifications(text);
  classifications.sort((a, b) => b.value - a.value);
  const bestMatch = classifications[0];
  const secondBest = classifications[1];
  if (bestMatch.value === secondBest.value) {
    return { category: "diger", confidence: 0 };
  }
  return { 
    category: bestMatch.label, 
    confidence: Number(bestMatch.value.toFixed(4)) 
  };
}

function buildCategoryDistribution(items) {
  const base = Object.fromEntries(COMPLAINT_CATEGORIES.map((item) => [item, 0]));
  for (const complaint of items) {
    const category = normalizeCategory(complaint.category);
    base[category] += 1;
  }
  return base;
}

function buildTopTerms(items, limit = 20) {
  const termMap = new Map();
  for (const complaint of items) {
    const words = String(complaint.text || "")
      .toLowerCase()
      .replace(/[^a-z0-9çğıöşü\s]/gi, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !TURKISH_STOPWORDS.has(word));
    for (const word of words) {
      termMap.set(word, (termMap.get(word) || 0) + 1);
    }
  }
  return [...termMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

app.get("/api/debug/classify", (req, res) => {
  const text = req.query.text || "";
  const result = classifyComplaintText(text);
  res.json({ text, ...result });
});

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Yetkisiz erişim" });
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ message: "Geçersiz oturum" });
  }
  next();
}

function requireUser(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Lütfen giriş yapın" });
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const userSession = userSessions.get(token);
  if (!userSession) {
    return res.status(401).json({ message: "Geçersiz kullanıcı oturumu" });
  }
  req.user = userSession;
  next();
}

function requireExpert(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Yetkisiz erişim" });
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const userSession = userSessions.get(token);
  if (!userSession || userSession.role !== "expert") {
    return res.status(403).json({ message: "Bu işlem için uzman yetkisi gereklidir" });
  }
  req.user = userSession;
  next();
}

function validateCaptcha(captchaToken, captchaAnswer) {
  const token = String(captchaToken || "");
  const answer = Number(captchaAnswer);
  if (!token || Number.isNaN(answer)) return false;
  const captcha = captchaStore.get(token);
  if (!captcha) return false;
  const isExpired = Date.now() - captcha.createdAt > 5 * 60 * 1000;
  if (isExpired) {
    captchaStore.delete(token);
    return false;
  }
  const valid = captcha.answer === answer;
  captchaStore.delete(token);
  return valid;
}

function checkAndConsumeRateLimit(ipAddress) {
  const now = Date.now();
  const key = ipAddress || "unknown";
  const timestamps = complaintRateLimitByIp.get(key) || [];
  const validWindow = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (validWindow.length >= RATE_LIMIT_MAX_REQUESTS) {
    complaintRateLimitByIp.set(key, validWindow);
    return false;
  }
  validWindow.push(now);
  complaintRateLimitByIp.set(key, validWindow);
  return true;
}

app.get("/api/captcha", (req, res) => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const token = randomBytes(16).toString("hex");
  captchaStore.set(token, { answer: a + b, createdAt: Date.now() });
  res.json({ captchaToken: token, question: `${a} + ${b} = ?` });
});

app.post("/api/users/register", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const firstName = sanitizeText(req.body?.firstName);
  const lastName = sanitizeText(req.body?.lastName);
  if (!firstName || !lastName) return res.status(400).json({ message: "Ad ve soyad zorunludur" });
  if (!email || !email.includes("@") || password.length < 4) return res.status(400).json({ message: "Geçerli mail ve en az 4 karakter şifre girin" });
  const exists = users.some((u) => u.email === email);
  if (exists) return res.status(409).json({ message: "Bu mail zaten kayıtlı" });
  const newUser = { 
    id: users.length + 1, 
    email, 
    password, 
    firstName, 
    lastName, 
    role: "user", // Default role
    createdAt: new Date().toISOString() 
  };
  users.push(newUser);
  saveUsers();
  res.status(201).json({ message: "Kayıt başarılı" });
});

app.post("/api/users/login", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  console.log(`Login attempt: ${email} (Users loaded: ${users.length})`);
  const user = users.find((u) => u.email === email);
  if (!user) {
    console.log(`User not found: ${email}`);
    return res.status(401).json({ message: "Mail veya şifre hatalı" });
  }
  if (!safeEqual(user.password, password)) {
    console.log(`Password mismatch for: ${email}`);
    return res.status(401).json({ message: "Mail veya şifre hatalı" });
  }
  const token = randomBytes(24).toString("hex");
  userSessions.set(token, { 
    id: user.id, 
    email: user.email, 
    firstName: user.firstName, 
    lastName: user.lastName, 
    role: user.role || "user",
    createdAt: Date.now() 
  });
  res.json({ 
    id: user.id,
    token, 
    email: user.email, 
    firstName: user.firstName, 
    lastName: user.lastName,
    role: user.role || "user"
  });
});

app.post("/api/complaints", requireUser, upload.single("photo"), (req, res) => {
  const { complaint, lat, lng, captchaToken, captchaAnswer, category: manualCategory } = req.body;
  const fileInfo = req.file;
  if (!checkAndConsumeRateLimit(req.ip)) return res.status(429).json({ message: "Çok sık şikayet gönderildi. Lütfen sonra tekrar deneyin." });
  const captchaOk = validateCaptcha(captchaToken, captchaAnswer);
  if (!captchaOk) return res.status(400).json({ message: "Captcha doğrulaması başarısız" });

  let finalCategory = "diger";
  let finalConfidence = null;
  let finalSource = "ai";
  if (manualCategory && manualCategory !== "auto") {
    finalCategory = normalizeCategory(manualCategory);
    finalSource = "manual";
  } else {
    const { category: detectedCategory, confidence } = classifyComplaintText(complaint);
    finalCategory = detectedCategory;
    finalConfidence = confidence;
    finalSource = detectedCategory !== "diger" ? "ai" : "pending_ai";
  }

  const assignedExpert = getAssignedExpertForCategory(finalCategory);

  const newComplaint = {
    id: complaints.length + 1,
    text: complaint,
    photoFilename: fileInfo?.filename || null,
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null,
    userId: req.user?.id || null,
    userEmail: req.user?.email || null,
    userFirstName: req.user?.firstName || null,
    userLastName: req.user?.lastName || null,
    category: finalCategory,
    confidence: finalConfidence,
    classificationSource: finalSource,
    status: "Bekliyor",
    assignedExpert: assignedExpert,
    assignmentSource: assignedExpert ? "auto" : null,
    createdAt: new Date().toISOString(),
  };

  complaints.push(newComplaint);
  saveComplaints();
  res.json({ message: "Şikayet kaydedildi", complaint: { ...newComplaint, photoUrl: createPhotoUrl(req, newComplaint.photoFilename) } });
});

app.get("/api/complaints", (req, res) => {
  res.json(complaints.map((item) => ({ ...item, photoUrl: createPhotoUrl(req, item.photoFilename) })));
});

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!isValidAdminCredentials(email, password)) return res.status(401).json({ message: "Mail veya şifre hatalı" });
  const token = randomBytes(24).toString("hex");
  adminSessions.set(token, { createdAt: Date.now(), email: ADMIN_EMAIL });
  res.json({ token, email: ADMIN_EMAIL });
});

app.get("/api/admin/complaints", requireAdmin, (req, res) => {
  const userEmailFilter = normalizeEmail(req.query.userEmail);
  const statusFilter = sanitizeText(req.query.status);
  const categoryFilter = normalizeCategory(req.query.category);
  const sourceFilter = normalizeSource(req.query.source);
  const sortedComplaints = [...complaints].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  let filtered = sortedComplaints;
  if (userEmailFilter) filtered = filtered.filter((item) => normalizeEmail(item.userEmail) === userEmailFilter);
  if (statusFilter) filtered = filtered.filter((item) => item.status === statusFilter);
  if (categoryFilter && categoryFilter !== "diger") filtered = filtered.filter((item) => normalizeCategory(item.category) === categoryFilter);
  if (sourceFilter) filtered = filtered.filter((item) => normalizeSource(item.classificationSource) === sourceFilter);
  res.json(filtered.map((item) => ({ ...item, photoUrl: createPhotoUrl(req, item.photoFilename) })));
});

app.get("/api/admin/analytics/summary", requireAdmin, (req, res) => {
  const total = complaints.length;
  const statusDistribution = {
    "Bekliyor": complaints.filter((item) => item.status === "Bekliyor").length,
    "İnceleniyor": complaints.filter((item) => item.status === "İnceleniyor").length,
    "Çözüldü": complaints.filter((item) => item.status === "Çözüldü").length,
  };
  res.json({
    total,
    categoryDistribution: buildCategoryDistribution(complaints),
    statusDistribution,
  });
});

app.patch("/api/admin/complaints/:id/status", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = sanitizeText(req.body?.status);
  const allowedStatuses = new Set(["Bekliyor", "İnceleniyor", "Çözüldü"]);
  if (!allowedStatuses.has(status)) return res.status(400).json({ message: "Geçersiz durum" });
  const complaint = complaints.find((item) => item.id === id);
  if (!complaint) return res.status(404).json({ message: "Şikayet bulunamadı" });
  complaint.status = status;
  complaint.updatedAt = new Date().toISOString();
  saveComplaints();
  res.json({ message: "Durum güncellendi", complaint: { ...complaint, photoUrl: createPhotoUrl(req, complaint.photoFilename) } });
});

app.patch("/api/admin/complaints/:id/category", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const category = normalizeCategory(req.body?.category);
  const complaint = complaints.find((item) => item.id === id);
  if (!complaint) return res.status(404).json({ message: "Şikayet bulunamadı" });
  complaint.category = category;
  complaint.classificationSource = "manual";
  complaint.updatedAt = new Date().toISOString();
  saveComplaints();
  res.json({ message: "Kategori güncellendi", complaint: { ...complaint, photoUrl: createPhotoUrl(req, complaint.photoFilename) } });
});

app.get("/api/admin/experts", requireAdmin, (req, res) => {
  const expertUsers = users
    .filter((u) => u.role === "expert")
    .map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }));
  res.json(expertUsers);
});

app.get("/api/admin/experts/overview", requireAdmin, (req, res) => {
  const expertUsers = users.filter((u) => u.role === "expert");

  const overview = expertUsers.map((expert) => {
    const expertComplaints = complaints.filter((c) => c.assignedExpert?.id === expert.id);
    const mapComplaint = (item) => ({
      id: item.id,
      text: item.text,
      category: item.category || "diger",
      status: item.status,
      createdAt: item.createdAt,
      assignmentSource: item.assignmentSource || null,
    });

    return {
      id: expert.id,
      name: `${expert.firstName} ${expert.lastName}`,
      email: expert.email,
      categories: getCategoriesForExpertEmail(expert.email),
      stats: {
        waiting: expertComplaints.filter((c) => c.status === "Bekliyor").length,
        inReview: expertComplaints.filter((c) => c.status === "İnceleniyor").length,
        resolved: expertComplaints.filter((c) => c.status === "Çözüldü").length,
      },
      waitingComplaints: expertComplaints.filter((c) => c.status === "Bekliyor").map(mapComplaint),
      inReviewComplaints: expertComplaints.filter((c) => c.status === "İnceleniyor").map(mapComplaint),
      resolvedComplaints: expertComplaints.filter((c) => c.status === "Çözüldü").map(mapComplaint),
    };
  });

  res.json(overview);
});

app.patch("/api/admin/complaints/:id/expert", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const expertId = Number(req.body?.expertId);
  const expertUser = users.find((u) => u.id === expertId && u.role === "expert");
  if (!expertUser && req.body?.expertId !== null) return res.status(400).json({ message: "Geçersiz uzman" });
  const complaint = complaints.find((item) => item.id === id);
  if (!complaint) return res.status(404).json({ message: "Şikayet bulunamadı" });
  complaint.assignedExpert = expertUser ? { id: expertUser.id, name: `${expertUser.firstName} ${expertUser.lastName}` } : null;
  complaint.assignmentSource = expertUser ? "admin" : null;
  if (expertUser) {
    delete complaint.rejectedByExpertId;
    delete complaint.rejectedByExpertName;
  }
  complaint.updatedAt = new Date().toISOString();
  saveComplaints();
  res.json({ message: "Uzman atandı", complaint: { ...complaint, photoUrl: createPhotoUrl(req, complaint.photoFilename) } });
});

app.get("/api/users/me/complaints", requireUser, (req, res) => {
  const mine = complaints.filter((item) => item.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(mine.map((item) => ({ ...item, photoUrl: createPhotoUrl(req, item.photoFilename) })));
});

// ─── Expert Endpoints ───────────────────────────────────────────────────────

app.get("/api/expert/complaints", requireExpert, (req, res) => {
  const { filter } = req.query; // 'unassigned', 'my'
  let filtered = complaints;

  if (filter === "unassigned") {
    filtered = complaints.filter(c => !c.assignedExpert);
  } else if (filter === "my") {
    filtered = complaints.filter(c => c.assignedExpert && c.assignedExpert.id === req.user.id);
  }

  res.json(filtered.map((item) => ({ ...item, photoUrl: createPhotoUrl(req, item.photoFilename) })));
});

app.patch("/api/expert/complaints/:id/claim", requireExpert, (req, res) => {
  const id = Number(req.params.id);
  const complaint = complaints.find((item) => item.id === id);
  if (!complaint) return res.status(404).json({ message: "Şikayet bulunamadı" });
  if (complaint.assignedExpert) return res.status(400).json({ message: "Bu şikayet zaten bir uzmana atanmış" });

  complaint.assignedExpert = {
    id: req.user.id,
    name: `${req.user.firstName} ${req.user.lastName}`
  };
  complaint.assignmentSource = "expert";
  complaint.status = "İnceleniyor";
  complaint.updatedAt = new Date().toISOString();
  saveComplaints();
  res.json({ message: "Şikayet üstlenildi", complaint: { ...complaint, photoUrl: createPhotoUrl(req, complaint.photoFilename) } });
});

app.patch("/api/expert/complaints/:id/status", requireExpert, (req, res) => {
  const id = Number(req.params.id);
  const status = sanitizeText(req.body?.status);
  const allowedStatuses = new Set(["İnceleniyor", "Çözüldü"]);
  if (!allowedStatuses.has(status)) return res.status(400).json({ message: "Geçersiz durum" });

  const complaint = complaints.find((item) => item.id === id);
  if (!complaint) return res.status(404).json({ message: "Şikayet bulunamadı" });
  
  if (complaint.assignedExpert?.id !== req.user.id) {
    return res.status(403).json({ message: "Sadece kendi üstlendiğiniz şikayetleri güncelleyebilirsiniz" });
  }

  complaint.status = status;
  complaint.updatedAt = new Date().toISOString();
  saveComplaints();
  res.json({ message: "Durum güncellendi", complaint: { ...complaint, photoUrl: createPhotoUrl(req, complaint.photoFilename) } });
});

app.patch("/api/expert/complaints/:id/reject", requireExpert, (req, res) => {
  const id = Number(req.params.id);
  const complaint = complaints.find((item) => item.id === id);
  if (!complaint) return res.status(404).json({ message: "Şikayet bulunamadı" });
  
  if (complaint.assignedExpert?.id !== req.user.id) {
    return res.status(403).json({ message: "Bu işlemi sadece şikayete atanan uzman gerçekleştirebilir" });
  }

  complaint.assignedExpert = null;
  complaint.assignmentSource = "expert_rejected";
  complaint.rejectedByExpertId = req.user.id;
  complaint.rejectedByExpertName = `${req.user.firstName} ${req.user.lastName}`;
  complaint.status = "Bekliyor";
  complaint.updatedAt = new Date().toISOString();
  saveComplaints();
  res.json({ message: "Şikayet başarıyla admine iade edildi", complaint: { ...complaint, photoUrl: createPhotoUrl(req, complaint.photoFilename) } });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
