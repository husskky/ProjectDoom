# Phase 1 — Baseline Audit: Ranged Desk

**Tanggal audit:** 4 November 2026  
**Cakupan:** struktur aplikasi dan seluruh database JSON yang tersedia di workspace.  
**Batas audit:** manifest sumber dan 988 Unity AssetBundle tidak tersedia di workspace. Informasi versi Doomsday `1.62.0` dan Unity `2022.3.62f2` berasal dari konteks tugas; keduanya tidak diverifikasi langsung terhadap bundle.

## Ringkasan

Database aplikasi memiliki data untuk 64 hero, 320 entri skill, 6 tier troop, 7 jalur research dengan total 76 level, dan 2 catatan perubahan hero. File `data/manifest.json` adalah manifest **aplikasi** yang mendaftarkan file JSON berdasarkan topik. File itu tidak memuat nama tabel dari hasil ekstraksi AssetBundle.

Karena manifest sumber tidak ditemukan, nama tabel sumber tidak dapat dicocokkan secara faktual. Laporan ini menggunakan nama file aplikasi sebagai inventaris yang dapat diperiksa; status coverage tidak menyiratkan bahwa nama atau fungsi tabel sumber sudah diketahui.

## Inventaris dan skema aplikasi

| File | Struktur yang ditemukan | Cakupan terukur |
|---|---|---:|
| `data/manifest.json` | Versi aplikasi dan peta nama file untuk hero, troop, research, perubahan, serta skill per squad | 5 kelompok skill dan 4 file data lain |
| `data/heroes.json` | `version`; daftar objek `{id, name, squad, category, superhero, role}` | 64 hero; 5 squad |
| `data/skills-ranged.json` | `skills` berupa map ID hero → daftar `{kind, name, description}` | 18 hero, 90 skill; semua deskripsi terisi |
| `data/skills-leader.json` | Skema skill yang sama | 10 hero, 50 skill; semua deskripsi terisi |
| `data/skills-infantry.json` | Skema skill yang sama | 17 hero, 85 skill; semua deskripsi kosong |
| `data/skills-rider.json` | Skema skill yang sama | 16 hero, 80 skill; semua deskripsi kosong |
| `data/skills-overall.json` | Skema skill yang sama | 3 hero, 15 skill; semua deskripsi kosong |
| `data/troops.json` | Daftar objek tier dengan stat, `trainingCost`, `promotionCost`, dan `trainingSeconds` | Tier 1–6; tidak ada field tipe troop |
| `data/research.json` | Daftar `{id, name, levels}`; level berisi `{seconds, cost}` | 7 jalur; 76 level |
| `data/hero-changes.json` | Map ID hero → teks catatan perubahan | 2 catatan: ID 1123 dan 1124 |

Hero terbagi menjadi Ranged 18, Leader 10, Infantry 17, Rider 16, dan Overall 3. Ada 14 hero dengan `superhero: true`. ID dan nama hero unik di dalam katalog yang tersedia.

## Domain mekanik yang tersedia dan belum tersedia

Status di bawah menilai **cakupan dalam aplikasi**. Status tersebut bukan penilaian kelengkapan terhadap seluruh tabel game, karena inventaris sumber tidak tersedia.

| Domain aplikasi | Status | Bukti dan batas cakupan |
|---|---|---|
| Katalog hero | **Existing** | 64 objek hero dengan ID, nama, squad, category, flag superhero, dan role. Asal serta kelengkapan terhadap game belum dibuktikan. |
| Skill hero | **Partially Available** | 320 entri untuk 64 hero, masing-masing 5 skill. Teks tersedia untuk seluruh Ranged dan Leader (140 entri); 180 entri Infantry, Rider, dan Overall tidak memiliki deskripsi. Tidak ada level skill per entri. |
| Stat dan biaya troop | **Partially Available** | Enam tier; UI menyebut troop Ranged. Tidak ada tipe troop, tier di atas 6, provenance nilai, atau unit untuk stat. |
| Research | **Partially Available** | Tujuh jalur dan 76 level, digunakan untuk estimasi unlock T6 Ranged. Tidak ada daftar dependensi/prasyarat terstruktur atau bukti seluruh jalur research telah tercakup. |
| Catatan perubahan hero | **Unknown** | Dua catatan ada di file aplikasi, tetapi tidak diketahui apakah catatan tersebut berasal dari tabel game, diff bundle, atau kurasi manual. Jangan perlakukan sebagai tabel sumber. |
| Roster pemain dan status kepemilikan | **Existing (lokal aplikasi)** | Tersimpan melalui `localStorage`, bukan database game. Memuat rank, level, empat angka skill, status penggunaan, leader, dan flag weapon. |
| Perhitungan legacy swap | **Partially Available** | Planner mengurutkan calon swap dari skill dan rank roster. Kode sendiri menyebut asumsi slot skill berpindah dan talent di-reset belum terkonfirmasi. |
| Squad builder | **Partially Available** | Menggabungkan dua hero dari roster dan menampilkan skill; bukan tabel mekanik squad tersendiri. Efek skill tidak didekode menjadi aturan terstruktur. |
| Domain mekanik lain | **Missing dari aplikasi saat ini** | Tidak ditemukan dataset atau fitur khusus untuk bangunan, perlengkapan/weapon stats, combat formula, formation, item, atau mekanik event umum. Ini hanya ketiadaan dalam aplikasi; keberadaan tabel sumbernya **Unknown**. |

### Coverage terhadap tabel manifest sumber

| Nama tabel di manifest sumber | Padanan database aplikasi | Status pencocokan |
|---|---|---|
| Tidak tersedia untuk diaudit | Tidak dapat ditentukan secara exact | **Unknown** |

Workspace hanya memuat `data/manifest.json`, yang menunjuk ke file aplikasi seperti `heroes.json` dan `research.json`. Tidak ada daftar nama tabel hasil ekstraksi, nama class/asset, jumlah row sumber, atau asal bundle. Karena itu, tidak ada dasar untuk menyebut nama file aplikasi sebagai nama tabel sumber atau membuat daftar tabel sumber yang “Missing”.

## Relasi yang didukung struktur tersedia

Relasi berikut adalah relasi data yang tampak langsung pada skema aplikasi. Relasi tersebut belum membuktikan relasi foreign key maupun tabel sumber.

| Relasi | Bukti struktural | Keyakinan dan batas |
|---|---|---|
| Hero → skill | `skills` memakai ID hero sebagai key; key skill cocok dengan 64 ID katalog dan kelompok skill cocok dengan `hero.squad` | Relasi ID di aplikasi terkonfirmasi secara struktural; asal relasi di game belum diketahui. |
| Hero → catatan perubahan | `hero-changes.json` memakai ID hero; kedua ID, 1123 dan 1124, ada di katalog | Relasi ID aplikasi terkonfirmasi; sumber dan kelengkapan catatannya unknown. |
| Roster entry → hero | `localStorage` menyimpan `id`; aplikasi memvalidasi dan merender entry melalui katalog hero | Relasi aplikasi terkonfirmasi; bukan tabel game. |
| Troop selector → tier | Nilai `from`/`to` dipakai sebagai indeks `troops[tier - 1]`; tier di file bernilai 1–6 berurutan | Relasi indeks aplikasi berfungsi secara struktural; tidak ada ID tabel sumber. |
| Research progress → research | `ui.lv` menyimpan progress dengan `research.id` sebagai key | Relasi aplikasi terkonfirmasi; metadata prasyarat research tidak ada. |
| Research → jalur unlock T6 | Kode khusus menggabungkan ID 2009, 3015, dan 5022 | Ketergantungan ini hanya hardcoded dalam UI; struktur data tidak menyatakan prasyarat atau urutan. |
| Skill → role leader/assistant | UI mencari teks skill yang mengandung kata `Leader` atau `Assistant` | Ini pencarian teks, bukan relasi atau flag struktural; dapat melewatkan sinonim atau mencocokkan teks yang tidak relevan. |

## Inkonsistensi, duplikasi, dan makna yang belum diketahui

### Temuan terukur

- Tidak ada ID hero duplikat atau nama hero duplikat. Seluruh 64 hero memiliki skill set, tepat 5 entri per hero; tidak ditemukan ID skill atau catatan perubahan yang merujuk ke hero tak dikenal.
- Tiap skill set terdiri dari objek dengan `kind`, `name`, dan `description`. Kelompok `kind` menggunakan label `rage`, `passive`, dan `awakening`; level numerik skill tidak tersedia.
- Seluruh biaya troop dan research memakai resource key yang sama: `Food`, `Wood`, `Steel`, dan `Oil`.
- `data/research.json` memiliki research ID `5022` dengan nama literal `"{1}"`. UI mengganti nama tampilan itu menjadi “Ranged T6 unlock”; nama asli/localized string belum diketahui.
- `data/hero-changes.json` mencatat dua hero saja. Tidak ada field versi per catatan, sumber bundle, timestamp, atau metode perubahan.

### Skema/semantik yang perlu dipastikan

- Nama field pada JSON adalah nama skema aplikasi, belum tentu nama field asli dari asset. Termasuk `category`, `role`, `superhero`, `trainingCost`, `promotionCost`, `trainingSeconds`, `seconds`, dan `cost`.
- `troops.json` tidak menyimpan tipe troop. Hubungan data dengan Ranged diketahui dari batasan/deskripsi UI, bukan field baris troop.
- `troops.json` memiliki `trainingSeconds`, tetapi UI tidak membacanya. UI memberi kolom “Heal at T…” menggunakan `promotionCost`; perbedaan istilah promosi dan penyembuhan ini perlu diverifikasi sebelum dianggap semantik benar.
- Unit dan basis nilai `attack`, `defense`, `health`, `speed`, `capacity`, serta `might` tidak dinyatakan dalam data. Demikian juga apakah biaya bernilai per unit, per batch, atau untuk aksi tertentu.
- Nama field `research.levels[].seconds` ditafsirkan sebagai detik di aplikasi, tetapi sumber unit dan apakah waktu itu base time belum diverifikasi. UI membagi waktu dengan `1 + bonus%` dan mengasumsikan tiga research unlock berjalan berurutan.
- Roster menyimpan empat level skill berurutan (rage dan tiga passive), sedangkan skill database memuat lima skill termasuk awakening. Relasi antara kelima entri skill dan empat angka roster tidak dinyatakan.
- `category` memuat `Siege`, `General`, `Garrison`, `Gather`, `Coop`, dan `-`; `role` memuat `Support`, `Skills`, `Attack`, `Defense`, dan `-`. Makna kategori/role, arti `-`, serta apakah value ini berasal dari enum game belum diketahui.
- `superhero` hanya boolean di katalog. Tidak ada hubungan terstruktur ke weapon, event, atau aturan upgrade; roster punya flag `w` terpisah untuk upgraded weapon.
- Teks squad builder memiliki mojibake pada kata “assistant’s” (`assistantâ€™s`), yaitu inkonsistensi encoding yang terlihat bagi pengguna.
- Versi `1.62.0` tercatat di manifest aplikasi, tetapi file tidak memiliki bundle ID, hash, path asset, source table, atau catatan ekstraksi. Klaim “straight from game files” belum dapat diverifikasi dari workspace.

## Urutan reverse engineering yang direkomendasikan

1. **Kunci inventaris sumber.** Sediakan manifest hasil ekstraksi 988 AssetBundle: nama tabel/asset persis, class/type, bundle path, jumlah row/asset, hash, dan versi/build sumber. Jangan menyamakan nama file aplikasi dengan tabel sumber.
2. **Buat pemetaan sumber-ke-aplikasi.** Untuk tiap tabel manifest, catat exact source name, field names/types, jumlah row, candidate file aplikasi, bukti pemetaan, confidence, dan status `Existing`/`Missing`/`Partially Available`/`Unknown`.
3. **Validasi domain fondasi hero.** Cocokkan hero IDs, enum squad/category/role, flag superhero, serta localization dengan asset sumber. Selesaikan placeholder research `{1}` melalui tabel/localization yang terverifikasi.
4. **Lengkapi dan validasi skill.** Prioritaskan 180 deskripsi kosong, validasi lima slot/kind dan level skill, lalu pastikan apakah empat nilai roster merepresentasikan subset tertentu. Jangan mengisi teks berdasarkan tebakan.
5. **Validasi troop dan research.** Temukan sumber stat, resource cost, unit waktu, training/promotion/heal semantics, dan prasyarat research. Baru setelah itu tetapkan formula promosi, healing, bonus kecepatan, dan urutan T6.
6. **Bangun relasi lintas tabel yang terverifikasi.** Uji key ID, localization, unlock references, skill effects, dan weapon references terhadap sampel source assets. Bedakan foreign key eksplisit dari relasi hasil inferensi.
7. **Perluas audit ke domain yang belum dimodelkan.** Setelah daftar tabel sumber lengkap, tandai tiap domain yang tidak ada dalam app sebagai Missing atau Partially Available dengan referensi tabel sumber konkret; pilih scope berikut dari cakupan tabel dan dependensi, bukan dari nama yang belum diperiksa.

## Artefak dan batas implementasi

Audit ini hanya menghasilkan dokumen. Tidak ada file aplikasi atau database yang diubah untuk Phase 1. Perubahan berikutnya sebaiknya menunggu review laporan dan ketersediaan manifest sumber agar pemetaan tabel tidak dibangun dari asumsi.
