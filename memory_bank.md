# Smart City Complaint System - Memory Bank

## Proje Özeti
Bu proje, vatandaşların şehirlerindeki sorunları (yol, aydınlatma, çöp vb.) bildirebilecekleri, yöneticilerin ise bu şikayetleri takip edip yönetebilecekleri bir "Akıllı Şehir Şikayet Sistemi"dir.

## Teknoloji Yığını
- **Backend:** Node.js, Express.js
- **Veritabanı:** In-memory array'ler (Geçici depolama, uygulama kapanınca veriler siliniyor. Şikayetler ve kullanıcılar `server.js` içerisinde tutuluyor)
- **Dosya Yükleme:** Multer (Şikayet fotoğrafları `uploads` klasörüne kaydediliyor)
- **Frontend:** React, Vite, Material UI (@mui/material - tasarım bileşenleri), Leaflet (react-leaflet - harita ve konum işlemleri)

## Özellikler (Mevcut Durum)
- **Kullanıcı İşlemleri:**
  - Kayıt olma ve giriş yapma.
  - Form üzerinden şikayet gönderme (Fotoğraf, harita üzerinden konum ve açıklama).
  - Basit matematiksel Captcha doğrulaması.
  - Spam önlemek için IP bazlı şikayet gönderme sınırı (Rate Limiting).
  - Kullanıcının kendi gönderdiği şikayetleri görebilmesi.
- **Admin İşlemleri:**
  - Yönetici girişi (`ADMIN_EMAIL` ve `ADMIN_PASSWORD` çevre değişkenleriyle veya varsayılan değerlerle kontrol ediliyor).
  - Şikayetlerin listelenmesi ve filtrelenmesi (kullanıcı maili, durum, kategori ve yapay zeka/manuel kaynaklara göre).
  - Şikayet kategorisini (yol, aydınlatma, çöp vb.) ve durumunu (Yeni, İnceleniyor, Çözüldü) güncelleme yetkisi.
  - Yönetici analitik verileri (Kategori dağılımı, şikayet durum özetleri, şikayetlerde en çok kullanılan terimler).

## Yapılan İşlemler / Geliştirme Günlüğü
- **[04 Mayıs 2026]**: Proje yapısı (`server.js`, `frontend/` vb.) analiz edildi ve başlangıç durumunu kaydetmek, gelecekteki geliştirmelerde bağlamı ve mevcut yapıyı korumak adına bu `memory_bank.md` dosyası oluşturuldu. Sistem benden yeni istekler geldikçe bu dosyayı güncelleyerek ilerleyecek.
- **[04 Mayıs 2026]**: Gelen şikayet metinlerini otomatik olarak kategorize eden kelime tabanlı bir "Text Classification" (Metin Sınıflandırma) mantığı `server.js` içine eklendi. "çöp", "yol", "aydınlatma" vb. anahtar kelimelere göre şikayetler otomatik `ai` etiketiyle kategorize ediliyor, eşleşme yoksa `diger` kategorisine atılarak `pending_ai` (bekliyor) olarak işaretleniyor. Adminin gerektiğinde bu kategoriyi manuel olarak değiştirme yetkisi ve arayüzü kontrol edildi (sorunsuz çalışıyor).
- **[04 Mayıs 2026]**: Admin Paneli arayüzü ve UX tasarımı güncellendi. Yeni kategoriler (sokak hayvanları, ulaşım, çevre kirliliği) eklendi. Admin paneli üst kısmındaki gereksiz istatistikler ve AI etiketleme detayları kaldırılarak profesyonel bir görünüme kavuşturuldu. Tasarım sağ tarafta sayısını gösteren bildirim rozetlerine (Badge) sahip klasör/kategori menüsü ve sol tarafta şikayet listesi (Inbox/klasör görünümü) olacak şekilde baştan tasarlandı.
- **[04 Mayıs 2026]**: Frontend uygulamasının terminalden başlatıldığında (`npm run dev`) varsayılan tarayıcıda otomatik olarak yeni bir sekmede açılması için `vite` ayarı (`--open` bayrağı) `package.json` dosyasına eklendi.
- **[04 Mayıs 2026]**: Şikayet metinlerini sınıflandıran sistemdeki bir hata (örneğin "otobüs" kelimesinin içindeki "ot" parçasından dolayı "park-bahce" kategorisine ataması) düzeltildi. Arama mantığı baştan yazılarak kelimeler tek tek ayrıştırıldı ve yalnızca kök eşleşmelerinde geçerli olacak şekilde daha isabetli (token-based) bir yapıya kavuşturuldu.
- **[04 Mayıs 2026]**: Final projesi standartlarına uygun olarak şikayet sınıflandırma altyapısı köklü bir şekilde değiştirildi. Basit kelime eşleştirme mantığı tamamen kaldırılarak yerine `natural` NLP kütüphanesi kullanılarak gerçek bir **Makine Öğrenimi (Naive Bayes Sınıflandırıcısı)** entegre edildi. Sisteme tüm kategoriler için örnek cümlelerden oluşan bir eğitim veriseti (Training Dataset) tanımlandı. Sistem her açılışta eğitiliyor ve gelen şikayetleri bağlamına göre olasılık hesabı yaparak sınıflandırıyor. Modelin cümleyi hiç anlayamadığı nadir durumlarda ise şikayet otomatik olarak "Diğer" kategorisine gönderiliyor. (Not: `natural` paketinin son sürümlerindeki ESM modül hatasından dolayı stabil çalışan v6.2.0 sürümü kuruldu).
- **[04 Mayıs 2026]**: Şikayet gönderme formuna (kullanıcı/vatandaş tarafı) **Kategori Seçimi** açılır menüsü (Dropdown) eklendi. Kullanıcılar artık dilerlerse şikayet kategorisini kendileri manuel seçebilecek. Eğer manuel bir seçim yaparlarsa yapay zeka (AI) atlanacak ve kullanıcının seçimi geçerli olacak. Kullanıcı hiçbir şey seçmeden "Otomatik (Yapay Zeka Belirlesin)" seçeneğini bırakırsa, yazdığı metin NLP yapay zekasına gönderilip arka planda sınıflandırılmaya devam edecek.
- **[04 Mayıs 2026]**: Admin Panelinde şikayetlerin durumlarına göre ayrıştırılması için "Sekmeler (Tabs)" yapısı kuruldu. Artık yönetici paneline girildiğinde şikayetler karmaşık bir liste halinde değil; **"Bekleyen / İncelenen"** işler ve **"Çözülenler"** olarak iki ayrı sekmede listelenmektedir. Böylece yönetici "Hangi sorunlar bizi bekliyor?" veya "Hangilerini çözdük?" sorularının cevabına tek tıkla ulaşabilmektedir.
- **[10 Haziran 2026]**: Yapılan tüm işlemlerin ve güncellemelerin `memory_bank.md` dosyasına kaydedilmesi kuralı teyit edildi. Gelecekteki tüm adımlar bu belgede güncellenmeye devam edecek.

---

## 📋 Tamamlanan Değişiklik — Üst Bar Durum Segmentleri

**Tarih:** 10 Haziran 2026  
**Durum:** ✅ Tamamlandı (kullanıcı onayı alındı)

### İstek Özeti
Üst uygulama çubuğundaki (AppBar) **"Halk / Şikayet Bildir"** butonu kaldırılacak. Bu alana şikayet durumuna göre **4 segmentli** bir filtre kontrolü eklenecek:

| Segment | Anlam | Filtre Mantığı |
|---------|-------|----------------|
| **Atanmamış Bekleyen** | Henüz uzman atanmamış, işlem bekleyen şikayetler | `status === "Bekliyor"` **ve** `assignedExpert` yok |
| **Atanıp Bekleyen** | Uzman atanmış ama henüz işleme alınmamış şikayetler | `status === "Bekliyor"` **ve** `assignedExpert` var |
| **İncelenen** | Uzman tarafından işleme alınmış şikayetler | `status === "İnceleniyor"` |
| **Çözüldü** | Tamamlanmış şikayetler | `status === "Çözüldü"` |

### Mevcut Durum (Referans)
- `App.jsx` üst barında 4 buton var: Halk/Şikayet, Vatandaş Girişi, Uzman Girişi, Yönetici Girişi.
- `AdminPanel.jsx` içinde şu an **3 sekme** var: Bekleyen / İncelenen / Çözülen — "Bekliyor" durumu tek parça, atama ayrımı yok.
- Backend (`server.js`) durumları `Bekliyor`, `İnceleniyor`, `Çözüldü` olarak tutuyor; `assignedExpert` alanı zaten mevcut.
- Yeni backend endpoint veya yeni status değeri **gerekmez**; filtreleme frontend'de mevcut alanların birleşimiyle yapılır.

### Yapılacaklar

#### 1. `frontend/src/App.jsx`
- [x] **"Halk / Şikayet Bildir"** butonu kaldırıldı.
- [x] Üst barda segment gösterimi kaldırıldı (giriş butonlarıyla karışıklık yaratıyordu).
- [x] 4 segmentli durum sekmeleri `AdminPanel` içinde, şikayet listesinin üstünde (eski sekme konumu).
- [x] Varsayılan `activeView` `"citizen"` (harita + şikayet ana ekranı) olarak korundu — yalnızca üst bardaki buton kaldırıldı.
- [x] Çıkış sonrası yönlendirme `"citizen"` ana ekranına döner.

#### 2. `frontend/src/components/AdminPanel.jsx`
- [x] 3 sekmeli yapı ve "Durum Filtresi" dropdown'u kaldırıldı.
- [x] `STATUS_SEGMENTS` ve `matchesStatusSegment()` export edildi.
- [x] `filteredComplaints` ve `getCategoryCount` 4 segment mantığına göre güncellendi.
- [x] Segment etiketlerine şikayet sayısı badge'i eklendi (üst bar üzerinden).
- [x] `isDelayed()` uyarısı `status === "Bekliyor"` koşuluyla bekleyen segmentlerde çalışmaya devam ediyor.

#### 3. Backend (`server.js`)
- [x] Değişiklik yapılmadı — mevcut alanlar yeterli.

#### 4. Diğer Dosyalar
- [x] `ExpertPanel.jsx`, `UserPanel.jsx`, `UserHistoryDrawer.jsx` — değiştirilmedi.

### Tasarım Notları
- Segment kontrolü, mevcut üst bar pill buton stiline uyumlu olacak (`borderRadius: 999`, `textTransform: "none"`).
- Aktif segment vurgulu (mavi/dolu), diğerleri outlined görünümde.
- Mobil ekranda segment metinleri kısaltılabilir veya yatay kaydırma eklenebilir.

- **[10 Haziran 2026]**: Üst bar durum segmentleri uygulandı. "Halk / Şikayet Bildir" butonu kaldırıldı; yönetici girişi sonrası üst barda 4 segment (Atanmamış Bekleyen, Atanıp Bekleyen, İncelenen, Çözüldü) ile şikayet filtreleme eklendi. AdminPanel içindeki eski 3 sekme ve durum dropdown'u kaldırıldı. Segmentler daha sonra üst bardan AdminPanel içine taşındı.
- **[10 Haziran 2026]**: `data/complaints.json` içindeki tüm eski şikayet kayıtları silindi (dosya boşaltıldı), backend yeniden başlatıldı.
- **[10 Haziran 2026]**: Uzman panelinden "Havuz" sekmesi kaldırıldı; uzmanlar artık yalnızca kendilerine atanan ve üstlendikleri şikayetleri görür (`/api/expert/complaints?filter=my`). Admin paneline "Uzman Özeti" butonu eklendi; her uzmanın ID'si, uzmanlık alanları, bekleyen/incelenen/çözülen şikayet sayıları ve detay listeleri görüntülenir (`/api/admin/experts/overview`).
